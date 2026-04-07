import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { useUsers } from "../../entities/user/api";
import { getUserFacingErrorMessage } from "../../shared/lib/user-facing-error";
import { EmptyState } from "../../shared/ui/EmptyState";
import { ErrorState } from "../../shared/ui/ErrorState";
import { LoadingState } from "../../shared/ui/LoadingState";
import styles from "./UserListPage.module.css";

export const UserListPage = () => {
  const { t } = useTranslation();
  const usersQuery = useUsers();

  if (usersQuery.isPending) {
    return (
      <LoadingState
        description={t("users.loading.description")}
        title={t("users.loading.title")}
      />
    );
  }

  if (usersQuery.isError) {
    return (
      <ErrorState
        description={getUserFacingErrorMessage(
          usersQuery.error,
          "users.loadError.description",
        )}
        title={t("users.loadError.title")}
      />
    );
  }

  if (usersQuery.data.length === 0) {
    return (
      <EmptyState
        actionLabel={t("users.empty.action")}
        actionTo="/users/new"
        description={t("users.empty.description")}
        title={t("users.empty.title")}
      />
    );
  }

  return (
    <section className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <h1>{t("users.title")}</h1>
          <p>{t("users.description")}</p>
        </div>
        <Link className={styles.createLink} to="/users/new">
          {t("nav.create")}
        </Link>
      </div>

      <div className={styles.grid}>
        {usersQuery.data.map((user) => (
          <article className={styles.card} key={user.id}>
            <div className={styles.cardTop}>
              <div className={styles.avatar}>
                {user.initial}
              </div>
              <div className={styles.cardHeader}>
                <h2>{user.name}</h2>
                <span>{t(`roles.${user.role}`)}</span>
              </div>
            </div>
            <p className={styles.email}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              {user.email}
            </p>
            <Link className={styles.detailLink} to={`/users/${user.id}`}>
              {t("users.detailAction")}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
};
