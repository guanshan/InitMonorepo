import { Button, Input } from "@real-demo/ui";
import { useTranslation } from "react-i18next";

import {
  AlertCircleIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeOffIcon,
} from "../../../shared/ui/icons";
import { ProviderLogo } from "../../../shared/ui/ProviderLogo";
import styles from "../ModelsPage.module.css";

import type { ModelFormDialogState } from "./useModelFormDialogState";

interface Props {
  isEdit: ModelFormDialogState["isEdit"];
  presetId: ModelFormDialogState["presetId"];
  presets: ModelFormDialogState["presets"];
  existingProvider: ModelFormDialogState["existingProvider"];
  baseUrl: ModelFormDialogState["baseUrl"];
  setBaseUrl: ModelFormDialogState["setBaseUrl"];
  apiKey: ModelFormDialogState["apiKey"];
  setApiKey: ModelFormDialogState["setApiKey"];
  showApiKey: ModelFormDialogState["showApiKey"];
  setShowApiKey: ModelFormDialogState["setShowApiKey"];
  testing: ModelFormDialogState["testing"];
  testResult: ModelFormDialogState["testResult"];
  handleTestConnection: ModelFormDialogState["handleTestConnection"];
}

export const ModelFormConnectionStep = ({
  isEdit,
  presetId,
  presets,
  existingProvider,
  baseUrl,
  setBaseUrl,
  apiKey,
  setApiKey,
  showApiKey,
  setShowApiKey,
  testing,
  testResult,
  handleTestConnection,
}: Props) => {
  const { t } = useTranslation();
  const preset = presets.find((p) => p.id === presetId);
  const providerLabel = isEdit
    ? existingProvider?.name ?? t("admin.providers.field.name")
    : preset?.name ?? "—";
  const providerVendor = isEdit
    ? existingProvider?.vendor ?? "custom"
    : preset?.vendor ?? "custom";
  const testFailureMessage =
    testResult && !testResult.success
      ? testResult.message
        ? t(testResult.message, { defaultValue: testResult.message })
        : t("admin.models.wizard.connection.testFail")
      : null;

  return (
    <div className={styles.wizardStep}>
      <div className={styles.providerBadge}>
        <ProviderLogo vendor={providerVendor} size={18} />
        <span>{providerLabel}</span>
      </div>

      <label className={styles.formField}>
        <span className={styles.formLabel}>
          {t("admin.providers.field.apiKey")} *
        </span>
        <div className={styles.keyInputWrap}>
          <Input
            type={showApiKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={
              isEdit
                ? t("admin.providers.field.apiKeyPlaceholderEdit")
                : t("admin.providers.field.apiKeyPlaceholderCreate")
            }
            autoComplete="off"
            required={!isEdit}
          />
          <button
            type="button"
            className={styles.keyToggle}
            onClick={() => setShowApiKey(!showApiKey)}
            tabIndex={-1}
            aria-label={
              showApiKey
                ? t("admin.providers.hideKey")
                : t("admin.providers.showKey")
            }
          >
            {showApiKey ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
          </button>
        </div>
      </label>

      <label className={styles.formField}>
        <span className={styles.formLabel}>
          {t("admin.providers.field.baseUrl")} *
        </span>
        <Input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://api.openai.com/v1"
          required
        />
      </label>

      <div className={styles.testRow}>
        <Button
          type="button"
          variant="ghost"
          onClick={handleTestConnection}
          disabled={testing || !baseUrl || (!apiKey && !isEdit)}
        >
          {testing
            ? t("admin.models.wizard.connection.testing")
            : t("admin.models.wizard.connection.test")}
        </Button>
        {testResult ? (
          testResult.success ? (
            <span className={styles.testResultOk}>
              <CheckCircleIcon size={12} />
              {t("admin.models.wizard.connection.testOk", {
                latency: testResult.latencyMs,
              })}
            </span>
          ) : (
            <span className={styles.testResultFail} title={testFailureMessage ?? ""}>
              <AlertCircleIcon size={12} />
              {testFailureMessage}
            </span>
          )
        ) : null}
      </div>
    </div>
  );
};
