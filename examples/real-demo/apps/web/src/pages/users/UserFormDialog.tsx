import type { AdminUser, UserRole, UserStatus } from "@real-demo/shared";
import { Button, Input, Modal } from "@real-demo/ui";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

import styles from "./UsersPage.module.css";

export interface UserFormValues {
  name: string;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  department: string[];
}

const EMPTY_VALUES: UserFormValues = {
  name: "",
  email: "",
  username: "",
  role: "USER",
  status: "ACTIVE",
  department: [],
};

const ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN", "USER"];
const STATUSES: UserStatus[] = ["ACTIVE", "INACTIVE", "SUSPENDED"];
const MIN_PASSWORD_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ModeProps =
  | {
      mode: "create";
      user?: undefined;
      onSubmit: (
        values: UserFormValues & { password: string },
      ) => Promise<void>;
    }
  | {
      mode: "edit";
      user?: AdminUser;
      onSubmit: (values: UserFormValues) => Promise<void>;
    };

type Props = ModeProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const UserFormDialog = (props: Props) => {
  const { t } = useTranslation();
  const { mode, open, onOpenChange, user, onSubmit } = props;

  const [values, setValues] = useState<UserFormValues>(EMPTY_VALUES);
  const [password, setPassword] = useState("");
  const [departmentInput, setDepartmentInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && user) {
      setValues({
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status,
        department: [...user.department],
      });
      setDepartmentInput(user.department.join(", "));
    } else {
      setValues(EMPTY_VALUES);
      setDepartmentInput("");
    }
    setPassword("");
    setError("");
  }, [mode, open, user]);

  const handleFieldChange = useCallback(
    <Key extends keyof UserFormValues>(
        key: Key,
      ) =>
      (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const next = event.target.value as UserFormValues[Key];
        setValues((prev) => ({ ...prev, [key]: next }));
      },
    [],
  );

  const handleDepartmentChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      setDepartmentInput(raw);
      const parsed = raw
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      setValues((prev) => ({ ...prev, department: parsed }));
    },
    [],
  );

  const isValid = useMemo(() => {
    if (!values.name.trim()) return false;
    if (!values.email.trim() || !EMAIL_PATTERN.test(values.email)) return false;
    if (mode === "create" && password.length < MIN_PASSWORD_LENGTH) return false;
    return true;
  }, [mode, password, values]);

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      if (!isValid) {
        return;
      }
      setSubmitting(true);
      setError("");
      try {
        if (mode === "create") {
          await onSubmit({
            ...values,
            password,
          });
        } else {
          await onSubmit(values);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("errors.generic"));
      } finally {
        setSubmitting(false);
      }
    },
    [isValid, mode, onSubmit, password, t, values],
  );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? t("admin.users.addUser") : t("admin.users.editUser")}
      description={
        mode === "create"
          ? t("admin.users.addUserDesc")
          : t("admin.users.editUserDesc")
      }
      closeLabel={t("admin.users.closeForm")}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGrid2}>
          <label className={styles.formRow}>
            <span className={styles.formLabel}>
              {t("admin.users.field.name")}
            </span>
            <Input
              value={values.name}
              onChange={handleFieldChange("name")}
              required
              maxLength={128}
              autoComplete="off"
            />
          </label>
          <label className={styles.formRow}>
            <span className={styles.formLabel}>
              {t("admin.users.field.email")}
            </span>
            <Input
              type="email"
              value={values.email}
              onChange={handleFieldChange("email")}
              required
              maxLength={255}
              autoComplete="off"
              disabled={mode === "edit"}
            />
            {mode === "edit" ? (
              <span className={styles.formHint}>
                {t("admin.users.field.emailReadOnly")}
              </span>
            ) : null}
          </label>
        </div>

        <div className={styles.formGrid2}>
          <label className={styles.formRow}>
            <span className={styles.formLabel}>
              {t("admin.users.field.username")}
            </span>
            <Input
              value={values.username}
              onChange={handleFieldChange("username")}
              placeholder={t("admin.users.field.usernamePlaceholder")}
              maxLength={64}
              autoComplete="off"
            />
          </label>
          <label className={styles.formRow}>
            <span className={styles.formLabel}>
              {t("admin.users.field.department")}
            </span>
            <Input
              value={departmentInput}
              onChange={handleDepartmentChange}
              placeholder={t("admin.users.field.departmentPlaceholder")}
              autoComplete="off"
            />
            <span className={styles.formHint}>
              {t("admin.users.field.departmentHint")}
            </span>
          </label>
        </div>

        <div className={styles.formGrid2}>
          <label className={styles.formRow}>
            <span className={styles.formLabel}>
              {t("admin.users.field.role")}
            </span>
            <select
              className={styles.select}
              value={values.role}
              onChange={handleFieldChange("role")}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {t(`roles.${role}`)}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.formRow}>
            <span className={styles.formLabel}>
              {t("admin.users.field.status")}
            </span>
            <select
              className={styles.select}
              value={values.status}
              onChange={handleFieldChange("status")}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`status.${status}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {mode === "create" ? (
          <label className={styles.formRow}>
            <span className={styles.formLabel}>
              {t("admin.users.field.password")}
            </span>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
            <span className={styles.formHint}>
              {t("admin.users.field.passwordHint", {
                min: MIN_PASSWORD_LENGTH,
              })}
            </span>
          </label>
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
          <Button type="submit" disabled={!isValid || submitting}>
            {submitting
              ? t("common.saving")
              : mode === "create"
                ? t("common.create")
                : t("common.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
