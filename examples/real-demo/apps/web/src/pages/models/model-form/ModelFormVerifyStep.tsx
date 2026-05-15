import { Button } from "@real-demo/ui";
import { useTranslation } from "react-i18next";

import {
  AlertCircleIcon,
  CheckCircleIcon,
  RefreshIcon,
  ZapIcon,
} from "../../../shared/ui/icons";
import styles from "../ModelsPage.module.css";

import type { ModelFormDialogState } from "./useModelFormDialogState";

type Props = Pick<
  ModelFormDialogState,
  "createdModels" | "verifying" | "verifyResults" | "handleVerifyAll"
>;

export const ModelFormVerifyStep = ({
  createdModels,
  verifying,
  verifyResults,
  handleVerifyAll,
}: Props) => {
  const { t } = useTranslation();
  const verifiedCount = Object.keys(verifyResults).length;
  const allDone = verifiedCount === createdModels.length;
  const allOk =
    allDone && Object.values(verifyResults).every((r) => r.success);

  return (
    <div className={styles.verifyStep}>
      <div className={styles.verifyHero}>
        <span className={styles.verifyHeroIcon}>
          <ZapIcon size={24} />
        </span>
        <h3 className={styles.verifyHeroTitle}>
          {createdModels.length > 1
            ? t("admin.models.wizard.verify.successBatch", {
                count: createdModels.length,
              })
            : t("admin.models.wizard.verify.success")}
        </h3>
        <p className={styles.verifyHeroHint}>
          {t("admin.models.wizard.verify.hint")}
        </p>
      </div>

      {verifiedCount > 0 ? (
        <ul className={styles.verifyResultList}>
          {createdModels.map((m) => {
            const r = verifyResults[m.modelKey];
            if (!r) {
              return (
                <li key={m.modelKey} className={styles.verifyResultPending}>
                  <code>{m.modelIdent}</code>
                  <span>—</span>
                </li>
              );
            }
            return (
              <li
                key={m.modelKey}
                className={
                  r.success
                    ? styles.verifyResultOk
                    : styles.verifyResultFail
                }
              >
                {r.success ? (
                  <CheckCircleIcon size={14} />
                ) : (
                  <AlertCircleIcon size={14} />
                )}
                <code className={styles.verifyResultIdent}>{m.modelIdent}</code>
                {r.success ? (
                  <span className={styles.verifyResultLatency}>
                    {r.latencyMs}ms
                  </span>
                ) : (
                  <span
                    className={styles.verifyResultMessage}
                    title={r.message ?? ""}
                  >
                    {r.message ?? t("admin.models.wizard.verify.failure")}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}

      {!allOk ? (
        <Button
          type="button"
          onClick={() => void handleVerifyAll()}
          disabled={verifying}
        >
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <RefreshIcon size={14} />
            {verifying
              ? t("admin.models.wizard.verify.running")
              : verifiedCount > 0
                ? t("admin.models.wizard.verify.reverify")
                : t("admin.models.wizard.verify.run")}
          </span>
        </Button>
      ) : null}
    </div>
  );
};
