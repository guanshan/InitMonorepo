import type { PlaygroundMessage, PlaygroundRunResult } from "@real-demo/shared";
import { useCallback, useMemo, useRef, useState } from "react";

import { runPlayground } from "../../../shared/api/playground";

export type DebugInputMode = "single" | "multi";

export type MessageRole = "system" | "user" | "assistant";

export interface EditableMessage {
  /** Stable id for React keys + reorder. */
  uid: string;
  role: MessageRole;
  content: string;
}

const newUid = (): string =>
  `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export interface DebugRequestPayload {
  modelId: string;
  messages: PlaygroundMessage[];
  temperature: number;
  maxTokens: number;
}

interface UseDebugStateOptions {
  modelId: string | null;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

export function useDebugState({
  modelId,
  systemPrompt,
  temperature,
  maxTokens,
}: UseDebugStateOptions) {
  const [inputMode, setInputMode] = useState<DebugInputMode>("single");

  // --- Single-prompt mode state
  const [prompt, setPrompt] = useState("");
  const [systemPromptOverride, setSystemPromptOverride] = useState<string | null>(
    null,
  );

  // --- Multi-message mode state
  const [messages, setMessages] = useState<EditableMessage[]>([
    { uid: newUid(), role: "system", content: "" },
    { uid: newUid(), role: "user", content: "" },
  ]);

  // --- Run state
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PlaygroundRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aborted, setAborted] = useState(false);
  const [requestPayload, setRequestPayload] = useState<DebugRequestPayload | null>(
    null,
  );
  const abortRef = useRef<AbortController | null>(null);

  // --- Multi-message editor helpers
  const addMessage = useCallback((role: MessageRole) => {
    setMessages((prev) => [...prev, { uid: newUid(), role, content: "" }]);
  }, []);

  const updateMessage = useCallback(
    (uid: string, patch: Partial<EditableMessage>) => {
      setMessages((prev) =>
        prev.map((m) => (m.uid === uid ? { ...m, ...patch } : m)),
      );
    },
    [],
  );

  const removeMessage = useCallback((uid: string) => {
    setMessages((prev) => prev.filter((m) => m.uid !== uid));
  }, []);

  const moveMessage = useCallback((uid: string, dir: -1 | 1) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.uid === uid);
      if (idx < 0) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(target, 0, moved!);
      return next;
    });
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([
      { uid: newUid(), role: "system", content: "" },
      { uid: newUid(), role: "user", content: "" },
    ]);
  }, []);

  // --- Build the request payload according to the input mode
  const buildRequestMessages = useCallback((): PlaygroundMessage[] => {
    if (inputMode === "single") {
      const out: PlaygroundMessage[] = [];
      const sys = (systemPromptOverride ?? systemPrompt).trim();
      if (sys) out.push({ role: "system", content: sys });
      if (prompt.trim()) out.push({ role: "user", content: prompt.trim() });
      return out;
    }
    return messages
      .map(({ role, content }) => ({ role, content: content.trim() }))
      .filter((m): m is PlaygroundMessage => m.content.length > 0);
  }, [inputMode, prompt, systemPromptOverride, systemPrompt, messages]);

  const canSend = useMemo(() => {
    if (running || !modelId) return false;
    if (inputMode === "single") return prompt.trim().length > 0;
    // multi: at least one non-empty message
    return messages.some((m) => m.content.trim().length > 0);
  }, [running, modelId, inputMode, prompt, messages]);

  const send = useCallback(async () => {
    if (!canSend || !modelId) return;
    setRunning(true);
    setError(null);
    setAborted(false);
    setResult(null);

    const built = buildRequestMessages();
    if (built.length === 0) {
      setRunning(false);
      setError("playground.debug.error.noMessages");
      return;
    }

    const payload: DebugRequestPayload = {
      modelId,
      messages: built,
      temperature,
      maxTokens,
    };
    setRequestPayload(payload);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Thread the controller's signal through to the fetch so `stop()`
      // genuinely cancels the upstream call instead of just flipping local
      // state and letting the response resolve into the void (or worse,
      // overwrite the next run).
      const res = await runPlayground(payload, { signal: controller.signal });
      setResult(res);
    } catch (err) {
      if (controller.signal.aborted) {
        setAborted(true);
      } else {
        setError(err instanceof Error ? err.message : "playground.debug.error.requestFailed");
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setRunning(false);
    }
  }, [
    canSend,
    modelId,
    buildRequestMessages,
    temperature,
    maxTokens,
  ]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    setPrompt("");
    setResult(null);
    setError(null);
    setAborted(false);
    setRequestPayload(null);
  }, []);

  const resetAll = useCallback(() => {
    reset();
    setSystemPromptOverride(null);
    clearMessages();
  }, [reset, clearMessages]);

  return {
    inputMode,
    setInputMode,
    // single
    prompt,
    setPrompt,
    systemPromptOverride,
    setSystemPromptOverride,
    // multi
    messages,
    addMessage,
    updateMessage,
    removeMessage,
    moveMessage,
    clearMessages,
    // run
    running,
    result,
    error,
    aborted,
    requestPayload,
    canSend,
    send,
    stop,
    reset,
    resetAll,
  };
}

export type DebugState = ReturnType<typeof useDebugState>;
