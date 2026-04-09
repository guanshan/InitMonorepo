import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";

import { defaultUsersQuery, useUsers } from "../../entities/user/api";
import { getUserFacingErrorMessage } from "../../shared/lib/user-facing-error";
import { EmptyState } from "../../shared/ui/EmptyState";
import { ErrorState } from "../../shared/ui/ErrorState";
import { LoadingState } from "../../shared/ui/LoadingState";
import styles from "./UserListPage.module.css";

const getPageFromSearchParams = (searchParams: URLSearchParams) => {
  const rawPage = Number(searchParams.get("page") ?? defaultUsersQuery.page);

  if (!Number.isFinite(rawPage) || rawPage < 1) {
    return defaultUsersQuery.page;
  }

  return Math.trunc(rawPage);
};

export const UserListPage = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = getPageFromSearchParams(searchParams);
  const usersQuery = useUsers({
    page: currentPage,
    pageSize: defaultUsersQuery.pageSize,
  });

  const updatePage = (nextPage: number) => {
    const nextSearchParams = new URLSearchParams(searchParams);

    if (nextPage <= defaultUsersQuery.page) {
      nextSearchParams.delete("page");
    } else {
      nextSearchParams.set("page", String(nextPage));
    }

    setSearchParams(nextSearchParams);
  };

  useEffect(() => {
    const totalPages = usersQuery.data?.pagination.totalPages ?? 0;

    if (totalPages > 0 && currentPage > totalPages) {
      const correctedParams = new URLSearchParams(searchParams);

      if (totalPages <= defaultUsersQuery.page) {
        correctedParams.delete("page");
      } else {
        correctedParams.set("page", String(totalPages));
      }

      setSearchParams(correctedParams, { replace: true });
    }
  }, [
    currentPage,
    searchParams,
    setSearchParams,
    usersQuery.data?.pagination.totalPages,
  ]);

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

  if (usersQuery.data.pagination.totalItems === 0) {
    return (
      <EmptyState
        actionLabel={t("users.empty.action")}
        actionTo="/users/new"
        description={t("users.empty.description")}
        title={t("users.empty.title")}
      />
    );
  }

  const visibleUsers = usersQuery.data.items;
  const { pagination } = usersQuery.data;
  const startItem =
    visibleUsers.length === 0
      ? 0
      : (pagination.page - 1) * pagination.pageSize + 1;
  const endItem =
    visibleUsers.length === 0 ? 0 : startItem + visibleUsers.length - 1;

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

      <div className={styles.paginationSummary}>
        <p>
          {t("users.pagination.summary", {
            end: endItem,
            start: startItem,
            total: pagination.totalItems,
          })}
        </p>
        <p>
          {t("users.pagination.page", {
            page: pagination.page,
            totalPages: pagination.totalPages,
          })}
        </p>
      </div>

      <div className={styles.grid}>
        {visibleUsers.map((user) => (
          <article className={styles.card} key={user.id}>
            <div className={styles.cardTop}>
              <div className={styles.avatar}>{user.initial}</div>
              <div className={styles.cardHeader}>
                <h2>{user.name}</h2>
                <span>{t(`roles.${user.role}`)}</span>
              </div>
            </div>
            <p className={styles.email}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              {user.email}
            </p>
            <Link className={styles.detailLink} to={`/users/${user.id}`}>
              {t("users.detailAction")}
            </Link>
          </article>
        ))}
      </div>

      <div className={styles.paginationControls}>
        <button
          className={styles.paginationButton}
          disabled={pagination.page <= 1}
          onClick={() => updatePage(pagination.page - 1)}
          type="button"
        >
          {t("users.pagination.previous")}
        </button>
        <button
          className={styles.paginationButton}
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => updatePage(pagination.page + 1)}
          type="button"
        >
          {t("users.pagination.next")}
        </button>
      </div>
    </section>
  );
};
