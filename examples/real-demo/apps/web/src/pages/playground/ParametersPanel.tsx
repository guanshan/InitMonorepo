import type { ModelView } from "@real-demo/shared";
import { useTranslation } from "react-i18next";

import styles from "./PlaygroundPage.module.css";

interface ParametersPanelProps {
  model: ModelView | null;
  temperature: number;
  maxTokens: number;
  onTemperatureChange: (next: number) => void;
  onMaxTokensChange: (next: number) => void;
  onResetToModelDefaults: () => void;
}

const TEMPERATURE_PRESETS = [
  { value: 0, label: "0" },
  { value: 0.2, label: "0.2" },
  { value: 0.7, label: "0.7" },
  { value: 1, label: "1.0" },
  { value: 1.5, label: "1.5" },
];

// Used only when no model is selected. With a model, the ceiling comes from
// `model.maxTokens` so the slider thumb actually moves over the usable range
// (previously the slider was capped at 1M which made the thumb glue to the
// far left for typical models).
const MAX_TOKENS_FALLBACK = 128_000;

const formatTokenCap = (n: number): string => {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return m === Math.floor(m) ? `${m}M` : `${m.toFixed(1)}M`;
  }
  if (n >= 1_000) return `${Math.round(n / 1000)}K`;
  return String(n);
};

export const ParametersPanel = ({
  model,
  temperature,
  maxTokens,
  onTemperatureChange,
  onMaxTokensChange,
  onResetToModelDefaults,
}: ParametersPanelProps) => {
  const { t } = useTranslation();
  const sliderMax = model?.maxTokens ?? MAX_TOKENS_FALLBACK;

  return (
    <aside className={styles.paramsPanel} aria-label={t("playground.parameters")}>
      <header className={styles.paramsHeader}>
        <h2 className={styles.paramsTitle}>{t("playground.parameters")}</h2>
        <button
          type="button"
          className={styles.paramsResetBtn}
          onClick={onResetToModelDefaults}
          disabled={!model}
          title={t("playground.resetParamsHint")}
        >
          {t("playground.resetParams")}
        </button>
      </header>

      {model ? (
        <section className={styles.paramsMeta}>
          <dl className={styles.paramsMetaList}>
            <div>
              <dt>{t("playground.providerLabel")}</dt>
              <dd>{model.provider.name}</dd>
            </div>
            <div>
              <dt>{t("playground.upstreamModel")}</dt>
              <dd className={styles.modelCode}>{model.model}</dd>
            </div>
            {model.lastVerifiedAt ? (
              <div>
                <dt>{t("playground.lastVerified")}</dt>
                <dd>{new Date(model.lastVerifiedAt).toLocaleString()}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      <section className={styles.paramsSection}>
        <div className={styles.paramsLabelRow}>
          <label className={styles.paramsLabel} htmlFor="param-temperature">
            {t("playground.temperature")}
          </label>
          <input
            id="param-temperature-number"
            type="number"
            className={styles.paramsNumber}
            min={0}
            max={2}
            step={0.01}
            value={temperature}
            onChange={(e) => {
              const next = Number.parseFloat(e.target.value);
              if (Number.isFinite(next)) onTemperatureChange(next);
            }}
          />
        </div>
        <input
          id="param-temperature"
          type="range"
          className={styles.paramsRange}
          min={0}
          max={2}
          step={0.01}
          value={temperature}
          onChange={(e) => onTemperatureChange(Number.parseFloat(e.target.value))}
        />
        <div className={styles.paramsPresetRow}>
          {TEMPERATURE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className={`${styles.paramsPreset} ${
                Math.abs(temperature - preset.value) < 0.001
                  ? styles.paramsPresetActive
                  : ""
              }`}
              onClick={() => onTemperatureChange(preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.paramsSection}>
        <div className={styles.paramsLabelRow}>
          <label className={styles.paramsLabel} htmlFor="param-max-tokens">
            {t("playground.maxTokens")}
          </label>
          <div className={styles.paramsNumberGroup}>
            <input
              id="param-max-tokens-number"
              type="number"
              className={`${styles.paramsNumber} ${styles.numberNoSpinner}`}
              min={1}
              max={sliderMax}
              step={1}
              value={maxTokens}
              onChange={(e) => {
                const next = Number.parseInt(e.target.value, 10);
                if (Number.isFinite(next)) onMaxTokensChange(next);
              }}
            />
            <span className={styles.paramsCap}>/ {formatTokenCap(sliderMax)}</span>
          </div>
        </div>
        <input
          id="param-max-tokens"
          type="range"
          className={styles.paramsRange}
          min={1}
          max={sliderMax}
          step={1}
          value={Math.min(maxTokens, sliderMax)}
          onChange={(e) => onMaxTokensChange(Number.parseInt(e.target.value, 10))}
        />
      </section>
    </aside>
  );
};
