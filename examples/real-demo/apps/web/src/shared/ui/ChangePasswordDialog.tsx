import { Button, Input, Modal } from "@real-demo/ui";
import { type FormEvent, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { changePassword } from "../api/auth";
import { useAuthStore } from "../store/auth-store";

import styles from "./ChangePasswordDialog.module.css";

const EyeIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChangePasswordDialog = ({ open, onOpenChange }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const reset = useCallback(() => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setSubmitting(false);
    setError("");
    setSuccess(false);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) reset();
      onOpenChange(next);
    },
    [onOpenChange, reset],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setError("");

      if (newPassword.length < 8) {
        setError(t("changePassword.error.tooShort"));
        return;
      }
      if (newPassword !== confirmPassword) {
        setError(t("changePassword.error.mismatch"));
        return;
      }
      if (newPassword === currentPassword) {
        setError(t("changePassword.error.sameAsOld"));
        return;
      }

      setSubmitting(true);
      try {
        await changePassword(currentPassword, newPassword);
        setSuccess(true);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t("changePassword.error.generic"),
        );
      } finally {
        setSubmitting(false);
      }
    },
    [currentPassword, newPassword, confirmPassword, t],
  );

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={t("changePassword.title")}
      description={t("changePassword.description")}
      closeLabel={t("changePassword.title")}
    >
      {success ? (
        <div className={styles.successState}>
          <p className={styles.successText}>{t("changePassword.success")}</p>
          <p className={styles.successText}>
            {t("changePassword.signInAgainHint")}
          </p>
          <Button
            onClick={() => {
              onOpenChange(false);
              reset();
              logout();
              navigate("/login", { replace: true });
            }}
            variant="secondary"
          >
            {t("changePassword.goToSignIn")}
          </Button>
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className={styles.label}>
              {t("changePassword.currentPassword")}
            </span>
            <div className={styles.inputWrap}>
              <Input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
                className={styles.input}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowCurrent((prev) => !prev)}
                aria-label={
                  showCurrent
                    ? t("changePassword.hidePassword")
                    : t("changePassword.showPassword")
                }
              >
                {showCurrent ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>
              {t("changePassword.newPassword")}
            </span>
            <div className={styles.inputWrap}>
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className={styles.input}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowNew((prev) => !prev)}
                aria-label={
                  showNew
                    ? t("changePassword.hidePassword")
                    : t("changePassword.showPassword")
                }
              >
                {showNew ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>
              {t("changePassword.confirmPassword")}
            </span>
            <div className={styles.inputWrap}>
              <Input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className={styles.input}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowConfirm((prev) => !prev)}
                aria-label={
                  showConfirm
                    ? t("changePassword.hidePassword")
                    : t("changePassword.showPassword")
                }
              >
                {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </label>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={
              submitting ||
              !currentPassword ||
              !newPassword ||
              !confirmPassword
            }
          >
            {submitting
              ? t("changePassword.submitting")
              : t("changePassword.submit")}
          </Button>
        </form>
      )}
    </Modal>
  );
};
