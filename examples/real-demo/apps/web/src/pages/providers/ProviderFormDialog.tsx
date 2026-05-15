import {
  PROVIDER_PRESETS,
  type CreateProviderInput,
  type ProviderPreset,
  type ProviderType,
  type ProviderVendor,
  type ProviderView,
} from "@real-demo/shared";
import { Button, Input, Modal } from "@real-demo/ui";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { EyeIcon, EyeOffIcon } from "../../shared/ui/icons";
import { ProviderLogo } from "../../shared/ui/ProviderLogo";
import modelsStyles from "../models/ModelsPage.module.css";

import styles from "./ProviderFormDialog.module.css";

const TYPES: ProviderType[] = ["openai", "anthropic", "openai-compatible"];

const VENDORS: ProviderVendor[] = [
  "openai",
  "anthropic",
  "deepseek",
  "openrouter",
  "kimi",
  "glm",
  "minimax",
  "hunyuan",
  "azure",
  "fireworks",
  "ollama",
  "custom",
];

interface FormValues {
  id: string;
  name: string;
  type: ProviderType;
  vendor: ProviderVendor;
  baseUrl: string;
  apiKey: string;
}

const empty: FormValues = {
  id: "",
  name: "",
  type: "openai-compatible",
  vendor: "custom",
  baseUrl: "",
  apiKey: "",
};

const applyPreset = (preset: ProviderPreset): FormValues => ({
  id: preset.id,
  name: preset.name,
  type: preset.type,
  vendor: preset.vendor,
  baseUrl: preset.baseUrl,
  apiKey: "",
});

interface Props {
  open: boolean;
  mode: "create" | "edit";
  initial?: ProviderView | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateProviderInput) => Promise<void>;
}

export const ProviderFormDialog = ({
  open,
  mode,
  initial,
  onOpenChange,
  onSubmit,
}: Props) => {
  const { t } = useTranslation();
  const [error, setError] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: empty,
    mode: "onSubmit",
  });

  useEffect(() => {
    if (!open) return;
    setError("");
    setShowKey(false);
    setAdvancedOpen(false);
    if (initial) {
      form.reset({
        id: initial.id,
        name: initial.name,
        type: initial.type,
        vendor: initial.vendor,
        baseUrl: initial.baseUrl,
        apiKey: "",
      });
    } else {
      form.reset(empty);
    }
  }, [open, initial, form]);

  const handlePreset = (preset: ProviderPreset) => {
    form.reset(applyPreset(preset));
    setError("");
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    setError("");
    try {
      if (mode === "edit") {
        // For edits, omit empty apiKey (means "keep existing")
        const patch: Partial<CreateProviderInput> = {
          name: values.name,
          type: values.type,
          vendor: values.vendor,
          baseUrl: values.baseUrl,
        };
        if (values.apiKey.trim().length > 0) patch.apiKey = values.apiKey;
        await onSubmit(patch as CreateProviderInput);
      } else {
        await onSubmit(values);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    }
  });

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) setError("");
        onOpenChange(next);
      }}
      title={
        mode === "create"
          ? t("admin.providers.add")
          : t("admin.providers.edit")
      }
      closeLabel={t("admin.users.closeForm")}
    >
      <form className={modelsStyles.form} onSubmit={handleSubmit}>
        {mode === "create" ? (
          <section className={styles.presets} aria-label={t("admin.providers.presetsLabel")}>
            <p className={styles.presetsHint}>
              {t("admin.providers.presetsHint")}
            </p>
            <div className={styles.presetsRow}>
              {PROVIDER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={styles.presetChip}
                  onClick={() => handlePreset(preset)}
                >
                  <span className={styles.presetChipLogo}>
                    <ProviderLogo vendor={preset.vendor} size={14} />
                  </span>
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <div className={modelsStyles.formGrid}>
          <label className={modelsStyles.formField}>
            <span className={modelsStyles.formLabel}>
              {t("admin.providers.field.name")}
            </span>
            <Input {...form.register("name")} required />
          </label>
          <label className={modelsStyles.formField}>
            <span className={modelsStyles.formLabel}>
              {t("admin.providers.field.id")}
            </span>
            <Input {...form.register("id")} disabled={mode === "edit"} required />
          </label>
        </div>

        <label className={modelsStyles.formField}>
          <span className={modelsStyles.formLabel}>
            {t("admin.providers.field.baseUrl")}
          </span>
          <Input
            {...form.register("baseUrl")}
            placeholder="https://api.openai.com/v1"
            required
          />
        </label>

        <label className={modelsStyles.formField}>
          <span className={modelsStyles.formLabel}>
            {t("admin.providers.field.apiKey")}
          </span>
          <div className={styles.keyInputWrap}>
            <Input
              {...form.register("apiKey")}
              type={showKey ? "text" : "password"}
              placeholder={
                mode === "edit"
                  ? t("admin.providers.field.apiKeyPlaceholderEdit")
                  : t("admin.providers.field.apiKeyPlaceholderCreate")
              }
              required={mode === "create"}
              autoComplete="off"
              className={styles.keyInput}
            />
            <button
              type="button"
              className={styles.keyToggle}
              onClick={() => setShowKey((v) => !v)}
              aria-label={t(
                showKey ? "admin.providers.hideKey" : "admin.providers.showKey",
              )}
              tabIndex={-1}
            >
              {showKey ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
            </button>
          </div>
          <span className={modelsStyles.formHint}>
            {t("admin.providers.field.apiKeyHint")}
          </span>
        </label>

        <details
          className={styles.advanced}
          open={advancedOpen}
          onToggle={(e) => setAdvancedOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary className={styles.advancedSummary}>
            {t("admin.providers.advanced")}
          </summary>
          <div className={modelsStyles.formGrid}>
            <label className={modelsStyles.formField}>
              <span className={modelsStyles.formLabel}>
                {t("admin.providers.field.type")}
              </span>
              <select
                className={modelsStyles.select}
                {...form.register("type")}
              >
                {TYPES.map((tt) => (
                  <option key={tt} value={tt}>
                    {tt}
                  </option>
                ))}
              </select>
            </label>
            <label className={modelsStyles.formField}>
              <span className={modelsStyles.formLabel}>
                {t("admin.providers.field.vendor")}
              </span>
              <select
                className={modelsStyles.select}
                {...form.register("vendor")}
              >
                {VENDORS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </details>

        {error ? (
          <p className={modelsStyles.formError} role="alert">
            {error}
          </p>
        ) : null}

        <div className={modelsStyles.formFooter}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={form.formState.isSubmitting}
          >
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
