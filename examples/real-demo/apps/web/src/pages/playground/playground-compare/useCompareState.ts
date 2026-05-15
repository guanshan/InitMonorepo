import type { ModelView, ProviderVendor } from "@real-demo/shared";
import type { UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";

import { streamPlayground } from "../../../shared/api/playground";

const newMessageId = (): string =>
  typeof globalThis.crypto?.randomUUID === "function"
    ? `m-${globalThis.crypto.randomUUID()}`
    : `m-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const textMessage = (
  role: "user" | "assistant",
  content: string,
): UIMessage => ({
  id: newMessageId(),
  role,
  parts: [{ type: "text", text: content }],
});

const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 65536;

export interface CompareSlot {
  id: string;
  modelId: string | null;
  /** Per-slot inference parameters — set on slot creation, edited inline. */
  temperature: number;
  maxTokens: number;
  /** Per-slot system prompt override. `null` = fall back to the global prompt. */
  systemPromptOverride: string | null;
}

export interface CompareResponse {
  slotId: string;
  modelId: string | null;
  modelName: string;
  vendor: ProviderVendor | null;
  temperature: number;
  maxTokens: number;
  content: string;
  latencyMs: number | null;
  usage: {
    promptTokens: number | null;
    completionTokens: number | null;
    totalTokens: number | null;
  } | null;
  error: string | null;
  isRunning: boolean;
}

export interface CompareRound {
  id: string;
  userMessage: string;
  responses: CompareResponse[];
}

const MIN_SLOTS = 2;
const MAX_SLOTS = 6;

const newSlotId = (): string =>
  `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const newRoundId = (): string =>
  `round-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const blankSlot = (
  defaults: { temperature: number; maxTokens: number },
): CompareSlot => ({
  id: newSlotId(),
  modelId: null,
  temperature: defaults.temperature,
  maxTokens: defaults.maxTokens,
  systemPromptOverride: null,
});

interface UseCompareStateOptions {
  models: ModelView[];
  /** Global system prompt — used when a slot has no override. */
  globalSystemPrompt: string;
  /** Defaults used when a new empty slot is added. */
  defaultTemperature: number;
  defaultMaxTokens: number;
}

export function useCompareState({
  models,
  globalSystemPrompt,
  defaultTemperature,
  defaultMaxTokens,
}: UseCompareStateOptions) {
  const [slots, setSlots] = useState<CompareSlot[]>(() => [
    blankSlot({ temperature: defaultTemperature, maxTokens: defaultMaxTokens }),
    blankSlot({ temperature: defaultTemperature, maxTokens: defaultMaxTokens }),
  ]);
  const [rounds, setRounds] = useState<CompareRound[]>([]);
  const [prompt, setPrompt] = useState("");
  const abortRef = useRef<Map<string, AbortController>>(new Map());

  // Clear modelId if the underlying model disappears.
  useEffect(() => {
    setSlots((prev) =>
      prev.map((slot) =>
        slot.modelId && !models.some((m) => m.id === slot.modelId)
          ? { ...slot, modelId: null }
          : slot,
      ),
    );
  }, [models]);

  const addSlot = useCallback(() => {
    setSlots((prev) =>
      prev.length >= MAX_SLOTS
        ? prev
        : [
            ...prev,
            blankSlot({
              temperature: defaultTemperature || DEFAULT_TEMPERATURE,
              maxTokens: defaultMaxTokens || DEFAULT_MAX_TOKENS,
            }),
          ],
    );
  }, [defaultTemperature, defaultMaxTokens]);

  const removeSlot = useCallback((slotId: string) => {
    setSlots((prev) =>
      prev.length <= MIN_SLOTS ? prev : prev.filter((s) => s.id !== slotId),
    );
    const controller = abortRef.current.get(slotId);
    if (controller) {
      controller.abort();
      abortRef.current.delete(slotId);
    }
  }, []);

  const updateSlot = useCallback(
    (slotId: string, patch: Partial<CompareSlot>) => {
      setSlots((prev) =>
        prev.map((slot) =>
          slot.id === slotId ? { ...slot, ...patch } : slot,
        ),
      );
    },
    [],
  );

  const updateSlotModel = useCallback(
    (slotId: string, modelId: string | null) => {
      updateSlot(slotId, { modelId });
    },
    [updateSlot],
  );

  const updateSlotTemperature = useCallback(
    (slotId: string, temperature: number) => updateSlot(slotId, { temperature }),
    [updateSlot],
  );

  const updateSlotMaxTokens = useCallback(
    (slotId: string, maxTokens: number) => updateSlot(slotId, { maxTokens }),
    [updateSlot],
  );

  const updateSlotSystemPromptOverride = useCallback(
    (slotId: string, value: string | null) =>
      updateSlot(slotId, { systemPromptOverride: value }),
    [updateSlot],
  );

  const clearRounds = useCallback(() => {
    for (const ctl of abortRef.current.values()) ctl.abort();
    abortRef.current.clear();
    setRounds([]);
  }, []);

  const stopOne = useCallback((slotId: string) => {
    const controller = abortRef.current.get(slotId);
    if (controller) {
      controller.abort();
      abortRef.current.delete(slotId);
    }
    setRounds((prev) =>
      prev.map((round) => ({
        ...round,
        responses: round.responses.map((r) =>
          r.slotId === slotId ? { ...r, isRunning: false } : r,
        ),
      })),
    );
  }, []);

  const stopAll = useCallback(() => {
    for (const ctl of abortRef.current.values()) ctl.abort();
    abortRef.current.clear();
    setRounds((prev) =>
      prev.map((round) => ({
        ...round,
        responses: round.responses.map((r) => ({ ...r, isRunning: false })),
      })),
    );
  }, []);

  // Builds the AI SDK UIMessage[] + system pair for this slot's history.
  // System lives on the dedicated `system` field now (matching the new
  // `/playground/stream` contract) rather than being smuggled in as a
  // pseudo-message role.
  const buildHistoryForSlot = useCallback(
    (
      slot: CompareSlot,
      currentUser: string,
    ): { system: string | undefined; messages: UIMessage[] } => {
      const messages: UIMessage[] = [];
      for (const round of rounds) {
        messages.push(textMessage("user", round.userMessage));
        const own = round.responses.find(
          (r) => r.slotId === slot.id && !r.error && r.content,
        );
        const fallback = round.responses.find((r) => !r.error && r.content);
        const reply = own ?? fallback;
        if (reply) messages.push(textMessage("assistant", reply.content));
      }
      messages.push(textMessage("user", currentUser));
      const sys = (slot.systemPromptOverride ?? globalSystemPrompt).trim();
      return { system: sys || undefined, messages };
    },
    [rounds, globalSystemPrompt],
  );

  const anyRunning =
    rounds.length > 0 &&
    rounds[rounds.length - 1]!.responses.some((r) => r.isRunning);

  const activeSlots = slots.filter((s) => s.modelId);
  const canSend = activeSlots.length > 0 && prompt.trim().length > 0 && !anyRunning;

  const send = useCallback(async () => {
    if (!canSend) return;
    const currentUser = prompt.trim();
    setPrompt("");

    const roundId = newRoundId();
    const round: CompareRound = {
      id: roundId,
      userMessage: currentUser,
      responses: activeSlots.map((slot) => {
        const model = models.find((m) => m.id === slot.modelId) ?? null;
        return {
          slotId: slot.id,
          modelId: slot.modelId,
          modelName: model?.name ?? slot.modelId ?? "",
          vendor: model?.provider.vendor ?? null,
          temperature: slot.temperature,
          maxTokens: slot.maxTokens,
          content: "",
          latencyMs: null,
          usage: null,
          error: null,
          isRunning: true,
        };
      }),
    };
    setRounds((prev) => [...prev, round]);

    await Promise.allSettled(
      activeSlots.map(async (slot) => {
        if (!slot.modelId) return;
        const controller = new AbortController();
        abortRef.current.set(slot.id, controller);
        const startedAt = Date.now();
        try {
          const history = buildHistoryForSlot(slot, currentUser);
          const slotModel = models.find((m) => m.id === slot.modelId) ?? null;
          await streamPlayground(
            {
              modelId: slot.modelId,
              system: history.system,
              messages: history.messages,
              temperature: slot.temperature,
              maxTokens: slot.maxTokens,
              vendor: slotModel?.provider.vendor ?? null,
            },
            {
              onText: (cumulative) => {
                setRounds((prev) =>
                  prev.map((r) =>
                    r.id === roundId
                      ? {
                          ...r,
                          responses: r.responses.map((resp) =>
                            resp.slotId === slot.id
                              ? { ...resp, content: cumulative }
                              : resp,
                          ),
                        }
                      : r,
                  ),
                );
              },
              onFinish: ({ text, latencyMs, usage }) => {
                setRounds((prev) =>
                  prev.map((r) =>
                    r.id === roundId
                      ? {
                          ...r,
                          responses: r.responses.map((resp) =>
                            resp.slotId === slot.id
                              ? {
                                  ...resp,
                                  content: text,
                                  latencyMs,
                                  usage,
                                  isRunning: false,
                                }
                              : resp,
                          ),
                        }
                      : r,
                  ),
                );
              },
            },
            { signal: controller.signal },
          );
        } catch (err) {
          if (controller.signal.aborted) {
            setRounds((prev) =>
              prev.map((r) =>
                r.id === roundId
                  ? {
                      ...r,
                      responses: r.responses.map((resp) =>
                        resp.slotId === slot.id
                          ? { ...resp, isRunning: false }
                          : resp,
                      ),
                    }
                  : r,
              ),
            );
            return;
          }
          const msg = err instanceof Error ? err.message : "Stream failed";
          setRounds((prev) =>
            prev.map((r) =>
              r.id === roundId
                ? {
                    ...r,
                    responses: r.responses.map((resp) =>
                      resp.slotId === slot.id
                        ? {
                            ...resp,
                            error: msg,
                            isRunning: false,
                            latencyMs: Date.now() - startedAt,
                          }
                        : resp,
                    ),
                  }
                : r,
            ),
          );
        } finally {
          abortRef.current.delete(slot.id);
        }
      }),
    );
  }, [canSend, prompt, activeSlots, models, buildHistoryForSlot]);

  return {
    slots,
    addSlot,
    removeSlot,
    updateSlotModel,
    updateSlotTemperature,
    updateSlotMaxTokens,
    updateSlotSystemPromptOverride,
    rounds,
    clearRounds,
    prompt,
    setPrompt,
    send,
    stopOne,
    stopAll,
    canSend,
    anyRunning,
    canAddMore: slots.length < MAX_SLOTS,
    canRemove: slots.length > MIN_SLOTS,
  };
}

export type CompareState = ReturnType<typeof useCompareState>;
