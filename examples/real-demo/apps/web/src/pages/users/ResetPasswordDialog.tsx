import type { AdminUser } from "@real-demo/shared";
import { Button, Input, Modal } from "@real-demo/ui";
import { type FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "./UsersPage.module.css";

const MIN_PASSWORD_LENGTH = 8;

interface Props {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (password: string) => Promise<void>;
}

export const ResetPasswordDialog = ({
  user,
  open,
  onOpenChange,
  onSubmit,
}: Props) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setPassword("");
      setConfirm("");
      setError("");
    }
  }, [open]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t("changePassword.error.tooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("changePassword.error.mismatch"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("admin.users.resetPassword")}
      description={
        user
          ? t("admin.users.resetPasswordDesc", { name: user.name })
          : undefined
      }
      closeLabel={t("admin.users.closeForm")}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.formRow}>
          <span className={styles.formLabel}>
            {t("admin.users.field.newPassword")}
          </span>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            required
          />
        </label>
        <label className={styles.formRow}>
          <span className={styles.formLabel}>
            {t("admin.users.field.confirmNewPassword")}
          </span>
          <Input
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            required
          />
          <span className={styles.formHint}>
            {t("admin.users.field.resetPasswordHint")}
          </span>
        </label>

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
          <Button type="submit" disabled={submitting}>
            {submitting
              ? t("common.saving")
              : t("admin.users.resetPasswordSubmit")}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
