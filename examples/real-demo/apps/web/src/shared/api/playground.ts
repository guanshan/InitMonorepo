import { parseJsonEventStream } from "@ai-sdk/provider-utils";
import type {
  PlaygroundMessage,
  PlaygroundRunResult,
  ProviderVendor,
} from "@real-demo/shared";
import { runPlayground as sdkRunPlayground } from "@real-demo/sdk";
import { ApiRequestError } from "@real-demo/sdk/types";
import {
  readUIMessageStream,
  uiMessageChunkSchema,
  type UIMessage,
  type UIMessageChunk,
} from "ai";

import { resolveApiUrl } from "./sdk-client";

type SdkEnvelope<T> = {
  success: true;
  data: T;
};

export interface PlaygroundRunArgs {
  modelId: string;
  messages: PlaygroundMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface RunPlaygroundOptions {
  /** Caller-supplied abort signal. The corresponding fetch is aborted when it fires. */
  signal?: AbortSignal;
}

export async function runPlayground(
  args: PlaygroundRunArgs,
  options: RunPlaygroundOptions = {},
): Promise<PlaygroundRunResult> {
  const response = await sdkRunPlayground(
    args,
    options.signal ? { signal: options.signal } : undefined,
  );
  const body = response.data as unknown as SdkEnvelope<PlaygroundRunResult>;
  return body.data;
}

export interface PlaygroundStreamUsage {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
}

export interface PlaygroundStreamArgs {
  modelId: string;
  /** System prompt sent out-of-band, matching the AI SDK convention. */
  system?: string;
  /** AI SDK UI messages — `parts` carry the text content. */
  messages: UIMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Vendor echoed back via `messageMetadata` so the UI can render the provider logo. */
  vendor?: ProviderVendor | null;
}

export interface PlaygroundStreamCallbacks {
  /** Called whenever new text has been appended. Receives the cumulative text. */
  onText: (cumulativeText: string) => void;
  /** Called once when the stream finishes successfully. */
  onFinish?: (result: {
    text: string;
    latencyMs: number;
    usage: PlaygroundStreamUsage | null;
  }) => void;
}

interface StreamPlaygroundOptions {
  signal?: AbortSignal;
}

/**
 * Single-shot streaming call against `/api/v1/playground/stream`. The chat
 * playground uses `useChat` directly (see [PlaygroundRuntime.tsx]), but the
 * compare mode fans out N independent streams side-by-side and benefits from
 * a callback-driven helper rather than N hook instances.
 *
 * We piggyback on AI SDK's `readUIMessageStream` so this stays a thin
 * accumulator: no hand-rolled SSE framing, and any future UIMessage parts
 * (reasoning, tool calls, files) flow through without changes here.
 */
export async function streamPlayground(
  args: PlaygroundStreamArgs,
  callbacks: PlaygroundStreamCallbacks,
  options: StreamPlaygroundOptions = {},
): Promise<void> {
  const url = resolveApiUrl("/api/v1/playground/stream");
  const startedAt = Date.now();

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        modelId: args.modelId,
        ...(args.system ? { system: args.system } : {}),
        messages: args.messages,
        ...(args.temperature !== undefined && { temperature: args.temperature }),
        ...(args.maxTokens !== undefined && { maxTokens: args.maxTokens }),
        ...(args.vendor ? { vendor: args.vendor } : {}),
      }),
      signal: options.signal,
    });
  } catch (error) {
    throw new ApiRequestError("Network request failed.", { cause: error });
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { code?: string; message?: string }; issues?: unknown }
      | null;
    throw new ApiRequestError(
      payload?.error?.message ?? `Request failed with ${response.status}`,
      {
        code: payload?.error?.code,
        details: payload?.issues,
        status: response.status,
      },
    );
  }

  if (!response.body) {
    throw new ApiRequestError("Stream response has no body.");
  }

  // Match what `DefaultChatTransport.processResponseStream` does internally:
  // parse SSE bytes through the official UI message chunk schema, then
  // unwrap the parse-result envelope into a clean chunk stream. Doing it
  // here means we don't re-implement the SSE framing or chunk discriminator.
  const chunkStream = parseJsonEventStream({
    stream: response.body,
    schema: uiMessageChunkSchema,
  }).pipeThrough(
    new TransformStream<
      { success: true; value: UIMessageChunk } | { success: false; error: Error },
      UIMessageChunk
    >({
      transform(chunk, controller) {
        if (!chunk.success) {
          controller.error(chunk.error);
          return;
        }
        controller.enqueue(chunk.value);
      },
    }),
  );

  let cumulative = "";
  let usage: PlaygroundStreamUsage | null = null;

  try {
    for await (const message of readUIMessageStream({ stream: chunkStream })) {
      // `readUIMessageStream` yields a fully-reconstructed UIMessage on every
      // chunk; flatten its text parts and report the cumulative buffer so the
      // caller can re-render without bookkeeping its own running string.
      const text = message.parts
        .filter((p) => p.type === "text")
        .map((p) => ("text" in p ? p.text : ""))
        .join("");
      if (text !== cumulative) {
        cumulative = text;
        callbacks.onText(cumulative);
      }
      const meta = message.metadata as
        | { usage?: PlaygroundStreamUsage }
        | undefined;
      if (meta?.usage) {
        usage = meta.usage;
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      // Aborted by caller: surface whatever we accumulated and exit cleanly.
      callbacks.onFinish?.({
        text: cumulative,
        latencyMs: Date.now() - startedAt,
        usage,
      });
      return;
    }
    throw error instanceof Error
      ? new ApiRequestError(error.message, { cause: error })
      : new ApiRequestError("Stream failed.");
  }

  callbacks.onFinish?.({
    text: cumulative,
    latencyMs: Date.now() - startedAt,
    usage,
  });
}
