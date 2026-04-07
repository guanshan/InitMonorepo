import { CreateUserInputSchema } from "@real-demo/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { z } from "zod";

import { useCreateUser } from "../../entities/user/api";
import { getUserFacingErrorMessage } from "../../shared/lib/user-facing-error";
import styles from "./CreateUserForm.module.css";

type FormValues = z.input<typeof CreateUserInputSchema>;

export const CreateUserForm = () => {
  const { t } = useTranslation();
  const createUserMutation = useCreateUser();
  const form = useForm<FormValues>({
    defaultValues: {
      email: "",
      name: "",
      role: "MEMBER",
    },
    resolver: zodResolver(CreateUserInputSchema),
  });
  const translateFieldError = (message: string | undefined, fallbackKey: string) =>
    t(message ?? fallbackKey);

  return (
    <form
      className={styles.form}
      onSubmit={form.handleSubmit(async (values) => {
        await createUserMutation.mutateAsync(CreateUserInputSchema.parse(values));
      })}
    >
      <label className={styles.field}>
        <span>{t("userCreate.form.name")}</span>
        <input {...form.register("name")} placeholder={t("userCreate.form.namePlaceholder")} />
        {form.formState.errors.name ? (
          <small>
            {translateFieldError(
              form.formState.errors.name.message,
              "validation.name.min",
            )}
          </small>
        ) : null}
      </label>

      <label className={styles.field}>
        <span>{t("userCreate.form.email")}</span>
        <input
          {...form.register("email")}
          placeholder={t("userCreate.form.emailPlaceholder")}
        />
        {form.formState.errors.email ? (
          <small>
            {translateFieldError(
              form.formState.errors.email.message,
              "validation.email.invalid",
            )}
          </small>
        ) : null}
      </label>

      <label className={styles.field}>
        <span>{t("userCreate.form.role")}</span>
        <select {...form.register("role")}>
          <option value="ADMIN">{t("roles.ADMIN")}</option>
          <option value="MEMBER">{t("roles.MEMBER")}</option>
          <option value="SUPPORT">{t("roles.SUPPORT")}</option>
        </select>
      </label>

      {createUserMutation.isError ? (
        <p className={styles.error}>
          {getUserFacingErrorMessage(
            createUserMutation.error,
            "userCreate.form.submitError",
          )}
        </p>
      ) : null}

      <button className={styles.submit} disabled={createUserMutation.isPending} type="submit">
        {createUserMutation.isPending
          ? t("userCreate.form.submitting")
          : t("userCreate.form.submit")}
      </button>
    </form>
  );
};
