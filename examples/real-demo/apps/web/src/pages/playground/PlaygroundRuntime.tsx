import { useChat, type UIMessage } from "@ai-sdk/react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import type { ProviderVendor } from "@real-demo/shared";
import { DefaultChatTransport } from "ai";
import type { ReactNode } from "react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";

import { resolveApiUrl } from "../../shared/api/sdk-client";

const MESSAGES_KEY = "real-demo.playground.messages.v2";
const MESSAGES_MAX = 200;
const PERSIST_DEBOUNCE_MS = 500;

const readPersistedMessages = (): UIMessage[] => {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // Defensive: only keep entries that look like AI SDK UIMessages so a
    // half-written or pre-migration payload can't crash the chat hook.
    return parsed
      .filter(
        (m): m is UIMessage =>
          typeof m === "object" &&
          m !== null &&
          typeof (m as UIMessage).id === "string" &&
          ((m as UIMessage).role === "user" ||
            (m as UIMessage).role === "assistant" ||
            (m as UIMessage).role === "system") &&
          Array.isArray((m as UIMessage).parts),
      )
      .slice(-MESSAGES_MAX);
  } catch {
    return [];
  }
};

const writePersistedMessages = (messages: UIMessage[]) => {
  try {
    const trimmed = messages.slice(-MESSAGES_MAX);
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota or unavailable */
  }
};

interface RuntimeOptions {
  modelId: string | null;
  vendor?: ProviderVendor | null;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

interface PlaygroundRuntimeProviderProps extends RuntimeOptions {
  children: ReactNode;
}

/**
 * Wires AI SDK's `useChat` into assistant-ui via `useAISDKRuntime` and points
 * it at `/api/v1/playground/stream`. The hook owns the messages array, abort,
 * and edit/regenerate semantics; we only feed it per-request options (model,
 * system prompt, sampler) through the transport `body` and snapshot
 * `chat.messages` into localStorage so reloads keep the conversation.
 */
export const PlaygroundRuntime = ({
  modelId,
  vendor,
  systemPrompt,
  temperature,
  maxTokens,
  children,
}: PlaygroundRuntimeProviderProps) => {
  const initialMessages = useMemo(() => readPersistedMessages(), []);

  // Hold the live request options in a ref so the transport's `body`
  // closure can read the latest values without forcing the transport (or
  // the underlying chat) to be re-created on every parameter change.
  const optionsRef = useRef<RuntimeOptions>({
    modelId,
    vendor,
    systemPrompt,
    temperature,
    maxTokens,
  });
  optionsRef.current = {
    modelId,
    vendor,
    systemPrompt,
    temperature,
    maxTokens,
  };

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: resolveApiUrl("/api/v1/playground/stream"),
        credentials: "include",
        body: () => {
          const opts = optionsRef.current;
          const system = opts.systemPrompt.trim();
          return {
            modelId: opts.modelId,
            ...(system && { system }),
            temperature: opts.temperature,
            maxTokens: opts.maxTokens,
            ...(opts.vendor && { vendor: opts.vendor }),
          };
        },
      }),
    [],
  );

  const chat = useChat<UIMessage>({
    transport,
    messages: initialMessages,
    // Coalesce token-by-token re-renders. Without this a long stream pegs
    // React doing one render per delta; 50ms keeps the cursor smooth and
    // drops localStorage writes to a sane rate (~20 / sec).
    experimental_throttle: 50,
  });

  // Persist messages on change. Debounced so a streaming reply doesn't pound
  // localStorage on every token; trailing-edge fires after the stream settles.
  useEffect(() => {
    const handle = setTimeout(() => {
      writePersistedMessages(chat.messages);
    }, PERSIST_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [chat.messages]);

  const runtime = useAISDKRuntime(chat);

  const extras = useMemo<PlaygroundRuntimeExtras>(
    () => ({
      resetMessages: () => {
        chat.setMessages([]);
        chat.clearError();
      },
    }),
    [chat],
  );

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <PlaygroundRuntimeContext.Provider value={extras}>
        {children}
      </PlaygroundRuntimeContext.Provider>
    </AssistantRuntimeProvider>
  );
};

interface PlaygroundRuntimeExtras {
  resetMessages: () => void;
}

const PlaygroundRuntimeContext = createContext<PlaygroundRuntimeExtras | null>(
  null,
);

export const usePlaygroundExtras = (): PlaygroundRuntimeExtras => {
  const ctx = useContext(PlaygroundRuntimeContext);
  if (!ctx) {
    throw new Error(
      "usePlaygroundExtras must be used inside PlaygroundRuntime",
    );
  }
  return ctx;
};
