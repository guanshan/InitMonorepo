import type { ModelView } from "@real-demo/shared";
import { Button, Spinner } from "@real-demo/ui";
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router";

import { listModels } from "../../shared/api/models";
import { useAuthStore } from "../../shared/store/auth-store";
import { enqueueRequestFeedback } from "../../shared/store/request-feedback-store";
import { RefreshIcon, SlidersIcon } from "../../shared/ui/icons";

import { ModelPicker } from "./ModelPicker";
import { ParametersPanel } from "./ParametersPanel";
import { PlaygroundRuntime, usePlaygroundExtras } from "./PlaygroundRuntime";
import styles from "./PlaygroundPage.module.css";
import { SystemPromptArea } from "./SystemPromptArea";
import { Thread } from "./Thread";

// Compare and Debug aren't the default mode; defer their bundles (and the
// unique UI they pull in) until the user actually switches modes.
const PlaygroundCompare = lazy(() =>
  import("./playground-compare/PlaygroundCompare").then((m) => ({
    default: m.PlaygroundCompare,
  })),
);
const PlaygroundDebug = lazy(() =>
  import("./playground-debug/PlaygroundDebug").then((m) => ({
    default: m.PlaygroundDebug,
  })),
);

const RECENT_KEY = "real-demo.playground.recent-models";
const SYSTEM_PROMPT_KEY = "real-demo.playground.system-prompt";
const MODE_KEY = "real-demo.playground.mode";

type PlaygroundMode = "chat" | "debug" | "compare";

const readRecent = (): string[] => {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
};

const writeRecent = (ids: string[]) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, 8)));
  } catch {
    /* localStorage unavailable */
  }
};

const readSystemPrompt = (): string => {
  try {
    return localStorage.getItem(SYSTEM_PROMPT_KEY) ?? "";
  } catch {
    return "";
  }
};

const writeSystemPrompt = (value: string) => {
  try {
    localStorage.setItem(SYSTEM_PROMPT_KEY, value);
  } catch {
    /* localStorage unavailable */
  }
};

const readMode = (): PlaygroundMode => {
  try {
    const raw = localStorage.getItem(MODE_KEY);
    if (raw === "compare" || raw === "debug" || raw === "chat") return raw;
    return "chat";
  } catch {
    return "chat";
  }
};

const writeMode = (mode: PlaygroundMode) => {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* localStorage unavailable */
  }
};

export const PlaygroundPage = () => {
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.user?.role);
  const canAccess = role === "SUPER_ADMIN" || role === "ADMIN";

  const [mode, setModeState] = useState<PlaygroundMode>(() => readMode());
  const setMode = useCallback((next: PlaygroundMode) => {
    setModeState(next);
    writeMode(next);
  }, []);

  const [models, setModels] = useState<ModelView[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>(() => readRecent());
  const [refreshKey, setRefreshKey] = useState(0);

  const [systemPrompt, setSystemPrompt] = useState(() => readSystemPrompt());
  // Debounce so localStorage isn't written on every keystroke during typing.
  useEffect(() => {
    const timer = setTimeout(() => writeSystemPrompt(systemPrompt), 500);
    return () => clearTimeout(timer);
  }, [systemPrompt]);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(65536);
  const [paramsOpen, setParamsOpen] = useState(true);

  useEffect(() => {
    if (!canAccess) return;
    const controller = new AbortController();
    listModels({ enabled: true }, { signal: controller.signal })
      .then((modelList) => {
        setModels(modelList);
        setSelectedId((prev) => {
          if (prev && modelList.some((m) => m.id === prev)) return prev;
          return modelList[0]?.id ?? null;
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        enqueueRequestFeedback({
          variant: "error",
          title: t("admin.models.fetchFailed"),
          description:
            error instanceof Error ? error.message : t("errors.generic"),
        });
      });
    return () => controller.abort();
  }, [canAccess, refreshKey, t]);

  const selectedModel = useMemo(
    () =>
      selectedId
        ? models.find((m) => m.id === selectedId) ?? null
        : null,
    [models, selectedId],
  );

  // Sync chat-mode runtime params to the selected model's defaults when it changes.
  useEffect(() => {
    if (!selectedModel) return;
    setTemperature(selectedModel.temperature);
    setMaxTokens(selectedModel.maxTokens);
  }, [selectedModel]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setRecentIds((prev) => {
      const next = [id, ...prev.filter((v) => v !== id)].slice(0, 8);
      writeRecent(next);
      return next;
    });
  }, []);

  const handleResetParamsToModelDefaults = useCallback(() => {
    if (!selectedModel) return;
    setTemperature(selectedModel.temperature);
    setMaxTokens(selectedModel.maxTokens);
  }, [selectedModel]);

  if (!canAccess) return <Navigate to="/" replace />;

  return (
    <section className={styles.page}>
      <PlaygroundRuntime
        modelId={selectedId}
        vendor={selectedModel?.provider.vendor ?? null}
        systemPrompt={systemPrompt}
        temperature={temperature}
        maxTokens={maxTokens}
      >
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            {mode !== "compare" ? (
              <ModelPicker
                models={models}
                selectedId={selectedId}
                onSelect={handleSelect}
                recentIds={recentIds}
              />
            ) : null}
          </div>
          <div className={styles.headerCenter}>
            <div className={styles.modeTabs} role="tablist">
              <button
                type="button"
                role="tab"
                className={`${styles.modeTab} ${
                  mode === "chat" ? styles.modeTabActive : ""
                }`}
                onClick={() => setMode("chat")}
              >
                {t("playground.modeChat")}
              </button>
              <button
                type="button"
                role="tab"
                className={`${styles.modeTab} ${
                  mode === "debug" ? styles.modeTabActive : ""
                }`}
                onClick={() => setMode("debug")}
              >
                {t("playground.modeDebug")}
              </button>
              <button
                type="button"
                role="tab"
                className={`${styles.modeTab} ${
                  mode === "compare" ? styles.modeTabActive : ""
                }`}
                onClick={() => setMode("compare")}
              >
                {t("playground.modeCompare")}
              </button>
            </div>
          </div>
          <div className={styles.headerRight}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRefreshKey((k) => k + 1)}
              aria-label={t("admin.models.refresh")}
              title={t("admin.models.refresh")}
            >
              <span className={styles.iconButtonInner}>
                <RefreshIcon />
                <span>{t("admin.models.refresh")}</span>
              </span>
            </Button>
            {mode !== "compare" ? (
              <Button
                type="button"
                variant={paramsOpen ? "secondary" : "ghost"}
                onClick={() => setParamsOpen((v) => !v)}
                aria-label={t("playground.toggleParams")}
                title={t("playground.toggleParams")}
              >
                <span className={styles.iconButtonInner}>
                  <SlidersIcon />
                  <span>{t("playground.parameters")}</span>
                </span>
              </Button>
            ) : null}
            {mode === "chat" ? <NewThreadButton /> : null}
          </div>
        </header>

        <div
          className={`${styles.workbench} ${
            paramsOpen && mode !== "compare" ? styles.workbenchWithParams : ""
          }`}
        >
          <div className={styles.conversation}>
            {mode !== "compare" ? (
              <SystemPromptArea
                value={systemPrompt}
                onChange={setSystemPrompt}
              />
            ) : null}
            {mode === "chat" ? (
              // Don't mount Thread until we have a model — the chat transport
              // requires a non-null modelId, and the composer would otherwise
              // accept input that's guaranteed to 400 on send.
              selectedId ? (
                <Thread />
              ) : (
                <div className={styles.threadEmpty}>
                  <p className={styles.threadEmptyTitle}>
                    {t("playground.noModelSelected.title")}
                  </p>
                  <p className={styles.threadEmptyHint}>
                    {t("playground.noModelSelected.hint")}
                  </p>
                </div>
              )
            ) : mode === "debug" ? (
              <Suspense fallback={<ModePanelFallback />}>
                <PlaygroundDebug
                  selectedId={selectedId}
                  systemPrompt={systemPrompt}
                  temperature={temperature}
                  maxTokens={maxTokens}
                />
              </Suspense>
            ) : (
              <Suspense fallback={<ModePanelFallback />}>
                <PlaygroundCompare
                  models={models}
                  systemPrompt={systemPrompt}
                  defaultTemperature={temperature}
                  defaultMaxTokens={maxTokens}
                  recentIds={recentIds}
                />
              </Suspense>
            )}
          </div>
          {paramsOpen && mode !== "compare" ? (
            <ParametersPanel
              model={selectedModel}
              temperature={temperature}
              maxTokens={maxTokens}
              onTemperatureChange={setTemperature}
              onMaxTokensChange={setMaxTokens}
              onResetToModelDefaults={handleResetParamsToModelDefaults}
            />
          ) : null}
        </div>
      </PlaygroundRuntime>
    </section>
  );
};

const NewThreadButton = () => {
  const { t } = useTranslation();
  const { resetMessages } = usePlaygroundExtras();
  return (
    <Button type="button" variant="primary" onClick={resetMessages}>
      {t("playground.newThread")}
    </Button>
  );
};

const ModePanelFallback = () => (
  <div className={styles.modePanelFallback}>
    <Spinner />
  </div>
);
