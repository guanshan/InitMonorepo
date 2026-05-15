import { useTranslation } from "react-i18next";

import { CheckIcon } from "../../../shared/ui/icons";
import { ProviderLogo } from "../../../shared/ui/ProviderLogo";
import styles from "../ModelsPage.module.css";

import type { ModelFormDialogState } from "./useModelFormDialogState";

interface Props {
  presets: ModelFormDialogState["presets"];
  presetId: ModelFormDialogState["presetId"];
  handlePresetPick: ModelFormDialogState["handlePresetPick"];
}

export const ModelFormProviderStep = ({
  presets,
  presetId,
  handlePresetPick,
}: Props) => {
  const { t } = useTranslation();
  return (
    <div className={styles.wizardStep}>
      <p className={styles.wizardStepHint}>
        {t("admin.models.wizard.provider.hint")}
      </p>
      <div className={styles.providerGrid}>
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`${styles.wizardProvider} ${
              presetId === preset.id ? styles.wizardProviderActive : ""
            }`}
            onClick={() => handlePresetPick(preset)}
          >
            <span className={styles.providerCardLogo}>
              <ProviderLogo vendor={preset.vendor} size={20} />
            </span>
            <span className={styles.providerCardLabel}>
              <span className={styles.providerCardName}>{preset.name}</span>
              <span className={styles.providerCardMeta}>{preset.baseUrl.replace(/^https?:\/\//, "")}</span>
            </span>
            {presetId === preset.id ? (
              <span className={styles.providerCardCheck}>
                <CheckIcon size={14} />
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
};
