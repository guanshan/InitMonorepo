import type { PlaygroundRunResult } from "@real-demo/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
} from "../../../shared/ui/icons";
import styles from "../PlaygroundPage.module.css";

import type { DebugRequestPayload } from "./useDebugState";

interface InspectPanelProps {
  result: PlaygroundRunResult | null;
  request: DebugRequestPayload | null;
}

type Tab = "result" | "raw" | "request";

export const InspectPanel = ({ result, request }: InspectPanelProps) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>("result");
  const [copied, setCopied] = useState(false);

  const empty = !result && !request;

  const handleCopy = async () => {
    const text =
      tab === "result"
        ? JSON.stringify(
            {
              usage: result?.usage,
              latencyMs: result?.latencyMs,
            },
            null,
            2,
          )
        : tab === "raw"
          ? JSON.stringify(result, null, 2)
          : JSON.stringify(request, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={styles.inspectPanel}>
      <button
        type="button"
        className={styles.inspectHeader}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span
          className={styles.inspectChevron}
          data-open={expanded ? "true" : "false"}
        >
          <ChevronDownIcon size={12} />
        </span>
        <span className={styles.inspectTitle}>
          {t("playground.debug.inspect.title")}
        </span>
        {result?.usage?.totalTokens ? (
          <span className={styles.inspectPill}>
            {result.usage.totalTokens} tok
          </span>
        ) : null}
        {result?.latencyMs ? (
          <span className={styles.inspectPill}>{result.latencyMs}ms</span>
        ) : null}
      </button>
      {expanded ? (
        <div className={styles.inspectBody}>
          <div className={styles.inspectTabs}>
            <button
              type="button"
              className={`${styles.inspectTab} ${
                tab === "result" ? styles.inspectTabActive : ""
              }`}
              onClick={() => setTab("result")}
            >
              {t("playground.debug.inspect.tabResult")}
            </button>
            <button
              type="button"
              className={`${styles.inspectTab} ${
                tab === "raw" ? styles.inspectTabActive : ""
              }`}
              onClick={() => setTab("raw")}
            >
              {t("playground.debug.inspect.tabRaw")}
            </button>
            <button
              type="button"
              className={`${styles.inspectTab} ${
                tab === "request" ? styles.inspectTabActive : ""
              }`}
              onClick={() => setTab("request")}
            >
              {t("playground.debug.inspect.tabRequest")}
            </button>
            <span className={styles.inspectTabsSpacer} />
            <button
              type="button"
              className={styles.inspectCopyBtn}
              onClick={() => void handleCopy()}
              disabled={empty}
              aria-label={t("playground.copy")}
              title={t("playground.copy")}
            >
              {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
            </button>
          </div>
          <pre className={styles.inspectContent}>
            {tab === "result"
              ? renderResult(result, t)
              : tab === "raw"
                ? result
                  ? JSON.stringify(result, null, 2)
                  : t("playground.debug.inspect.noData")
                : request
                  ? JSON.stringify(request, null, 2)
                  : t("playground.debug.inspect.noData")}
          </pre>
        </div>
      ) : null}
    </div>
  );
};

const renderResult = (
  result: PlaygroundRunResult | null,
  t: (key: string) => string,
): string => {
  if (!result) return t("playground.debug.inspect.noData");
  const lines = [
    `Latency:    ${result.latencyMs}ms`,
    `Prompt:     ${result.usage?.promptTokens ?? "—"}`,
    `Completion: ${result.usage?.completionTokens ?? "—"}`,
    `Total:      ${result.usage?.totalTokens ?? "—"}`,
  ];
  if (result.usage?.completionTokens && result.latencyMs > 0) {
    const tps = (result.usage.completionTokens / result.latencyMs) * 1000;
    lines.push(`Throughput: ${tps.toFixed(1)} tok/s`);
  }
  return lines.join("\n");
};
