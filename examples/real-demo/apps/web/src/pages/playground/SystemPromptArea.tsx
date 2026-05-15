import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ChevronDownIcon } from "../../shared/ui/icons";

import styles from "./PlaygroundPage.module.css";

interface SystemPromptAreaProps {
  value: string;
  onChange: (next: string) => void;
  maxLength?: number;
  defaultOpen?: boolean;
}

export const SystemPromptArea = ({
  value,
  onChange,
  maxLength = 32000,
  defaultOpen = false,
}: SystemPromptAreaProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen || value.length > 0);
  const charCount = value.length;
  const percent = Math.min(100, Math.round((charCount / maxLength) * 100));
  const warning = percent >= 90;

  return (
    <section className={styles.systemArea} aria-label={t("playground.system")}>
      <header className={styles.systemHeader}>
        <button
          type="button"
          className={styles.systemToggle}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span
            className={styles.systemToggleIcon}
            data-open={open ? "true" : "false"}
          >
            <ChevronDownIcon size={12} />
          </span>
          <span className={styles.systemTitle}>{t("playground.system")}</span>
          {value.length > 0 ? (
            <span className={styles.systemCountInline}>
              {charCount.toLocaleString()}
            </span>
          ) : null}
        </button>
        {open ? (
          <button
            type="button"
            className={styles.systemClearBtn}
            onClick={() => onChange("")}
            disabled={value.length === 0}
          >
            {t("playground.clear")}
          </button>
        ) : null}
      </header>
      {open ? (
        <>
          <textarea
            className={styles.systemTextarea}
            value={value}
            onChange={(event) => {
              const next = event.target.value;
              onChange(next.slice(0, maxLength));
            }}
            placeholder={t("playground.systemPlaceholder")}
            rows={4}
          />
          <footer className={styles.systemFooter}>
            <span
              className={`${styles.systemCount} ${
                warning ? styles.systemCountWarn : ""
              }`}
            >
              {charCount.toLocaleString()} / {maxLength.toLocaleString()}
            </span>
            <span className={styles.systemHint}>{t("playground.systemHint")}</span>
          </footer>
        </>
      ) : null}
    </section>
  );
};
