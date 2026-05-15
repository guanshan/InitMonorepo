import type { ModelCapabilities } from "@real-demo/shared";
import { Input } from "@real-demo/ui";
import { useTranslation } from "react-i18next";

import styles from "../ModelsPage.module.css";

import type { ModelFormDialogState } from "./useModelFormDialogState";

type Props = Pick<
  ModelFormDialogState,
  | "temperature"
  | "setTemperature"
  | "maxTokens"
  | "setMaxTokens"
  | "capabilities"
  | "setCapabilities"
  | "enabled"
  | "setEnabled"
  | "description"
  | "setDescription"
  | "selectedModelIds"
  | "isEdit"
>;

const CAPABILITY_KEYS: (keyof ModelCapabilities)[] = [
  "vision",
  "tools",
  "json",
  "reasoning",
  "streaming",
];

export const ModelFormParamsStep = ({
  temperature,
  setTemperature,
  maxTokens,
  setMaxTokens,
  capabilities,
  setCapabilities,
  enabled,
  setEnabled,
  description,
  setDescription,
  selectedModelIds,
  isEdit,
}: Props) => {
  const { t } = useTranslation();
  const isBatch = !isEdit && selectedModelIds.length > 1;

  return (
    <div className={styles.wizardStep}>
      {isBatch ? (
        <p className={styles.batchBanner}>
          {t("admin.models.wizard.params.batchBanner", {
            count: selectedModelIds.length,
          })}
        </p>
      ) : null}

      <div className={styles.paramRow}>
        <label className={styles.paramLabel}>
          {t("playground.temperature")}
          <Input
            type="number"
            min={0}
            max={2}
            step={0.01}
            value={temperature}
            onChange={(e) => {
              const v = Number.parseFloat(e.target.value);
              if (Number.isFinite(v)) setTemperature(v);
            }}
            className={styles.paramNumber}
          />
        </label>
        <input
          type="range"
          min={0}
          max={2}
          step={0.01}
          value={temperature}
          onChange={(e) => setTemperature(Number.parseFloat(e.target.value))}
          className={styles.paramRange}
        />
      </div>

      <div className={styles.paramRow}>
        <label className={styles.paramLabel}>
          {t("playground.maxTokens")}
          <Input
            type="number"
            min={1}
            max={1_048_576}
            step={1}
            value={maxTokens}
            onChange={(e) => {
              const v = Number.parseInt(e.target.value, 10);
              if (Number.isFinite(v)) setMaxTokens(v);
            }}
            className={`${styles.paramNumber} ${styles.numberNoSpinner}`}
          />
        </label>
        <input
          type="range"
          min={1}
          max={131072}
          step={1}
          value={Math.min(maxTokens, 131072)}
          onChange={(e) => setMaxTokens(Number.parseInt(e.target.value, 10))}
          className={styles.paramRange}
        />
      </div>

      <div className={styles.capRow}>
        <span className={styles.formLabel}>
          {t("admin.models.field.capabilities")}
        </span>
        <div className={styles.capChips}>
          {CAPABILITY_KEYS.map((key) => (
            <label key={key} className={styles.capLabel}>
              <input
                type="checkbox"
                checked={capabilities[key]}
                onChange={(e) =>
                  setCapabilities({ ...capabilities, [key]: e.target.checked })
                }
              />
              <span>{key}</span>
            </label>
          ))}
        </div>
      </div>

      {!isBatch ? (
        <label className={styles.formField}>
          <span className={styles.formLabel}>
            {t("admin.models.field.description")}
          </span>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </label>
      ) : null}

      <label className={styles.toggleRow}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        <span>{t("admin.models.field.enabled")}</span>
      </label>
    </div>
  );
};
