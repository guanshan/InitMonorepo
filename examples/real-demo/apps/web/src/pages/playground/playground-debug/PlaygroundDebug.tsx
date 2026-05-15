import { Button } from "@real-demo/ui";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Streamdown } from "streamdown";

import {
  AlertCircleIcon,
  ChevronDownIcon,
  RefreshIcon,
  SendIcon,
  StopIcon,
} from "../../../shared/ui/icons";
import styles from "../PlaygroundPage.module.css";

import { InspectPanel } from "./InspectPanel";
import { MultiMessageEditor } from "./MultiMessageEditor";
import { useDebugState } from "./useDebugState";

interface PlaygroundDebugProps {
  selectedId: string | null;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

export const PlaygroundDebug = ({
  selectedId,
  systemPrompt,
  temperature,
  maxTokens,
}: PlaygroundDebugProps) => {
  const { t } = useTranslation();
  const debug = useDebugState({
    modelId: selectedId,
    systemPrompt,
    temperature,
    maxTokens,
  });

  // Reset the result panel when the model changes (avoids stale output).
  // `debug.reset` is deliberately omitted from deps — it's a fresh function
  // on every render and including it would loop forever.
  const resetRef = useRef(debug.reset);
  resetRef.current = debug.reset;
  useEffect(() => {
    resetRef.current();
  }, [selectedId]);

  const [overrideOpen, setOverrideOpen] = useState(false);
  useEffect(() => {
    if (debug.systemPromptOverride === null) setOverrideOpen(false);
  }, [debug.systemPromptOverride]);

  const handleToggleOverride = () => {
    if (overrideOpen) {
      debug.setSystemPromptOverride(null);
      setOverrideOpen(false);
    } else {
      debug.setSystemPromptOverride(systemPrompt);
      setOverrideOpen(true);
    }
  };

  return (
    <div className={styles.debugRoot}>
      <div className={styles.debugGrid}>
        {/* Input column */}
        <section className={styles.debugInput}>
          <header className={styles.debugInputHeader}>
            <div className={styles.debugInputTabs}>
              <button
                type="button"
                className={`${styles.debugInputTab} ${
                  debug.inputMode === "single" ? styles.debugInputTabActive : ""
                }`}
                onClick={() => debug.setInputMode("single")}
              >
                {t("playground.debug.tabSingle")}
              </button>
              <button
                type="button"
                className={`${styles.debugInputTab} ${
                  debug.inputMode === "multi" ? styles.debugInputTabActive : ""
                }`}
                onClick={() => debug.setInputMode("multi")}
              >
                {t("playground.debug.tabMulti")}
              </button>
            </div>
            {debug.inputMode === "single" ? (
              <button
                type="button"
                className={styles.debugOverrideToggle}
                onClick={handleToggleOverride}
                aria-expanded={overrideOpen}
              >
                <span
                  className={styles.debugOverrideChevron}
                  data-open={overrideOpen ? "true" : "false"}
                >
                  <ChevronDownIcon size={10} />
                </span>
                {t("playground.debug.overrideSystem")}
                {debug.systemPromptOverride !== null ? (
                  <span className={styles.debugOverrideDot} aria-hidden />
                ) : null}
              </button>
            ) : (
              <button
                type="button"
                className={styles.debugOverrideToggle}
                onClick={debug.clearMessages}
                aria-label={t("playground.debug.multi.reset")}
              >
                <RefreshIcon size={11} />
                {t("playground.debug.multi.reset")}
              </button>
            )}
          </header>
          {debug.inputMode === "single" ? (
            <>
              {overrideOpen ? (
                <textarea
                  className={styles.debugSystemTextarea}
                  value={debug.systemPromptOverride ?? ""}
                  onChange={(e) =>
                    debug.setSystemPromptOverride(e.target.value)
                  }
                  placeholder={t("playground.debug.systemPlaceholder")}
                  rows={3}
                />
              ) : null}
              <textarea
                className={styles.debugPromptTextarea}
                value={debug.prompt}
                onChange={(e) => debug.setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    void debug.send();
                  }
                }}
                placeholder={t("playground.debug.promptPlaceholder")}
                disabled={!selectedId}
              />
            </>
          ) : (
            <MultiMessageEditor
              messages={debug.messages}
              addMessage={debug.addMessage}
              updateMessage={debug.updateMessage}
              removeMessage={debug.removeMessage}
              moveMessage={debug.moveMessage}
            />
          )}
          <div className={styles.debugInputFooter}>
            <span className={styles.debugHint}>
              {t("playground.debug.shortcutHint")}
            </span>
            {debug.running ? (
              <Button type="button" variant="ghost" onClick={debug.stop}>
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <StopIcon size={14} />
                  <span>{t("playground.stop")}</span>
                </span>
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => void debug.send()}
                disabled={!debug.canSend}
              >
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <SendIcon />
                  <span>{t("playground.send")}</span>
                </span>
              </Button>
            )}
          </div>
        </section>

        {/* Output column */}
        <section className={styles.debugOutput}>
          <header className={styles.debugOutputHeader}>
            <span className={styles.debugOutputLabel}>
              {t("playground.debug.outputLabel")}
            </span>
            <span className={styles.debugOutputMeta}>
              {debug.running ? (
                <span className={styles.debugOutputRunning}>
                  <span className={styles.compareCardPulse} />
                  {t("playground.compare.running")}
                </span>
              ) : null}
              {!debug.running && debug.result?.latencyMs ? (
                <span className={styles.debugOutputLatency}>
                  {debug.result.latencyMs}ms
                </span>
              ) : null}
              {!debug.running && debug.result?.usage?.totalTokens ? (
                <span className={styles.debugOutputTokens}>
                  {debug.result.usage.totalTokens} tok
                </span>
              ) : null}
              <button
                type="button"
                className={styles.debugOutputReset}
                onClick={debug.reset}
                disabled={debug.running || (!debug.result && !debug.error)}
                title={t("playground.debug.reset")}
                aria-label={t("playground.debug.reset")}
              >
                <RefreshIcon size={12} />
              </button>
            </span>
          </header>
          <div className={styles.debugOutputBody}>
            {debug.error ? (
              <div className={styles.debugOutputError}>
                <AlertCircleIcon size={14} />
                <span>
                  {/* `error` is either an i18n key set by useDebugState or the
                     raw upstream message string; i18next falls back to the
                     literal when the key isn't registered, which is the right
                     UX in both cases. */}
                  {t(debug.error, { defaultValue: debug.error })}
                </span>
              </div>
            ) : debug.aborted ? (
              <div className={styles.debugOutputWaiting}>
                {t("playground.debug.aborted")}
              </div>
            ) : debug.result?.content ? (
              <Streamdown className={styles.debugOutputMarkdown}>
                {debug.result.content}
              </Streamdown>
            ) : debug.running ? (
              <div className={styles.debugOutputWaiting}>
                {t("playground.compare.thinking")}
              </div>
            ) : (
              <div className={styles.debugOutputWaiting}>
                {t("playground.debug.emptyHint")}
              </div>
            )}
          </div>
        </section>
      </div>

      <InspectPanel result={debug.result} request={debug.requestPayload} />
    </div>
  );
};
