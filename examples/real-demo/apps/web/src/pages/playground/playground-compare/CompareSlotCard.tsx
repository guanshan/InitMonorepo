import type { ModelView } from "@real-demo/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ChevronDownIcon } from "../../../shared/ui/icons";
import { ModelPicker } from "../ModelPicker";
import styles from "../PlaygroundPage.module.css";

import type { CompareSlot } from "./useCompareState";

interface CompareSlotCardProps {
  slot: CompareSlot;
  models: ModelView[];
  recentIds: string[];
  canRemove: boolean;
  globalSystemPrompt: string;
  onModelChange: (id: string) => void;
  onTemperatureChange: (value: number) => void;
  onMaxTokensChange: (value: number) => void;
  onSystemPromptOverrideChange: (value: string | null) => void;
  onRemove: () => void;
}

export const CompareSlotCard = ({
  slot,
  models,
  recentIds,
  canRemove,
  globalSystemPrompt,
  onModelChange,
  onTemperatureChange,
  onMaxTokensChange,
  onSystemPromptOverrideChange,
  onRemove,
}: CompareSlotCardProps) => {
  const { t } = useTranslation();
  const [overrideOpen, setOverrideOpen] = useState(
    slot.systemPromptOverride !== null,
  );

  const toggleOverride = (enabled: boolean) => {
    setOverrideOpen(enabled);
    onSystemPromptOverrideChange(enabled ? globalSystemPrompt : null);
  };

  return (
    <article className={styles.compareSlotCard}>
      <header className={styles.compareSlotCardHeader}>
        <div className={styles.compareSlotPicker}>
          <ModelPicker
            models={models}
            selectedId={slot.modelId}
            onSelect={onModelChange}
            recentIds={recentIds}
          />
        </div>
        {canRemove ? (
          <button
            type="button"
            className={styles.compareSlotCardRemove}
            onClick={onRemove}
            aria-label={t("playground.compare.removeSlot")}
            title={t("playground.compare.removeSlot")}
          >
            ×
          </button>
        ) : null}
      </header>

      <div className={styles.compareSlotParams}>
        <label className={styles.compareSlotParamRow}>
          <span className={styles.compareSlotParamLabel}>
            {t("playground.temperature")}
          </span>
          <input
            type="number"
            min={0}
            max={2}
            step={0.01}
            value={slot.temperature}
            onChange={(e) => {
              const v = Number.parseFloat(e.target.value);
              if (Number.isFinite(v)) onTemperatureChange(v);
            }}
            className={styles.compareSlotParamNumber}
          />
        </label>
        <input
          type="range"
          min={0}
          max={2}
          step={0.01}
          value={slot.temperature}
          onChange={(e) => onTemperatureChange(Number.parseFloat(e.target.value))}
          className={styles.compareSlotParamRange}
        />

        <label className={styles.compareSlotParamRow}>
          <span className={styles.compareSlotParamLabel}>
            {t("playground.maxTokens")}
          </span>
          <input
            type="number"
            min={1}
            max={1_048_576}
            step={1}
            value={slot.maxTokens}
            onChange={(e) => {
              const v = Number.parseInt(e.target.value, 10);
              if (Number.isFinite(v)) onMaxTokensChange(v);
            }}
            className={`${styles.compareSlotParamNumber} ${styles.numberNoSpinner}`}
          />
        </label>
      </div>

      <div className={styles.compareSlotOverride}>
        <button
          type="button"
          className={styles.compareSlotOverrideToggle}
          onClick={() => toggleOverride(!overrideOpen)}
          aria-expanded={overrideOpen}
        >
          <span
            className={styles.compareSlotOverrideChevron}
            data-open={overrideOpen ? "true" : "false"}
          >
            <ChevronDownIcon size={10} />
          </span>
          {t("playground.compare.overrideSystemPrompt")}
          {slot.systemPromptOverride !== null ? (
            <span className={styles.compareSlotOverrideDot} aria-hidden />
          ) : null}
        </button>
        {overrideOpen ? (
          <textarea
            className={styles.compareSlotOverrideTextarea}
            value={slot.systemPromptOverride ?? ""}
            onChange={(e) => onSystemPromptOverrideChange(e.target.value)}
            placeholder={t("playground.compare.overrideSystemPromptPlaceholder")}
            rows={3}
          />
        ) : null}
      </div>
    </article>
  );
};
