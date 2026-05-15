import type { ModelView } from "@real-demo/shared";
import { Button, Modal } from "@real-demo/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "./ModelsPage.module.css";

interface Props {
  model: ModelView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export const ConfirmDeleteModelDialog = ({
  model,
  open,
  onOpenChange,
  onConfirm,
}: Props) => {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setSubmitting(true);
    setError("");
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) setError("");
        onOpenChange(next);
      }}
      title={t("admin.models.confirmDeleteTitle")}
      description={model ? t("admin.models.confirmDeleteDesc") : undefined}
      closeLabel={t("admin.users.closeForm")}
    >
      <div className={styles.form}>
        {model ? (
          <p className={styles.confirmText}>
            {t("admin.models.confirmDeletePrompt")}{" "}
            <span className={styles.confirmHighlight}>{model.name}</span>{" "}
            <span className={styles.cellMono}>({model.model})</span>
          </p>
        ) : null}

        {error ? (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        ) : null}

        <div className={styles.formFooter}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleConfirm}
            disabled={submitting}
            style={{
              background: "var(--color-danger)",
              color: "var(--color-text-inverse)",
              borderColor: "var(--color-danger)",
            }}
          >
            {submitting ? t("common.saving") : t("common.delete")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
