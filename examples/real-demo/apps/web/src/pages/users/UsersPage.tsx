import type {
  AdminUser,
  UserRole,
  UserStatus,
} from "@real-demo/shared";
import { Button, EmptyState, Spinner } from "@real-demo/ui";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router";

import {
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
} from "../../shared/api/admin-users";
import { useAuthStore } from "../../shared/store/auth-store";
import { enqueueRequestFeedback } from "../../shared/store/request-feedback-store";
import {
  EditIcon,
  KeyIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  TrashIcon,
  UsersIcon,
} from "../../shared/ui/icons";
import { UserFormDialog, type UserFormValues } from "./UserFormDialog";
import { ResetPasswordDialog } from "./ResetPasswordDialog";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";

import styles from "./UsersPage.module.css";

const ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN", "USER"];
const STATUSES: UserStatus[] = ["ACTIVE", "INACTIVE", "SUSPENDED"];

const DEFAULT_PAGE_SIZE = 10;

const formatDateTime = (iso: string | null) => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getInitial = (user: AdminUser) => {
  const source = user.name?.trim() || user.email;
  return source.charAt(0).toUpperCase();
};

export const UsersPage = () => {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const canAccess = currentUser?.role === "SUPER_ADMIN";

  const [items, setItems] = useState<AdminUser[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | UserRole>("");
  const [statusFilter, setStatusFilter] = useState<"" | UserStatus>("");
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [resettingUser, setResettingUser] = useState<AdminUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSearchInput(value);
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
      searchTimerRef.current = setTimeout(() => {
        setSearch(value.trim());
        setPage(1);
      }, 300);
    },
    [],
  );

  useEffect(
    () => () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!canAccess) return;
    const controller = new AbortController();
    setLoading(true);
    listAdminUsers(
      {
        page,
        pageSize: DEFAULT_PAGE_SIZE,
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      },
      { signal: controller.signal },
    )
      .then((result) => {
        setItems(result.items);
        setTotalItems(result.pagination.totalItems);
        setTotalPages(Math.max(result.pagination.totalPages, 1));
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        enqueueRequestFeedback({
          variant: "error",
          title: t("admin.users.fetchFailed"),
          description:
            error instanceof Error ? error.message : t("errors.generic"),
        });
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [canAccess, page, search, roleFilter, statusFilter, refreshKey, t]);

  if (!canAccess) {
    return <Navigate to="/" replace />;
  }

  const handleCreate = useCallback(
    async (values: UserFormValues & { password?: string }) => {
      if (!values.password) {
        throw new Error("Password is required for new users.");
      }
      await createAdminUser({
        email: values.email,
        name: values.name,
        username: values.username,
        role: values.role,
        status: values.status,
        department: values.department,
        password: values.password,
      });
      setCreateOpen(false);
      setRefreshKey((k) => k + 1);
      enqueueRequestFeedback({
        variant: "info",
        title: t("admin.users.created"),
        description: t("admin.users.createdDesc", { name: values.name }),
      });
    },
    [t],
  );

  const handleUpdate = useCallback(
    async (values: UserFormValues) => {
      if (!editingUser) return;
      await updateAdminUser(editingUser.userId, {
        name: values.name,
        username: values.username,
        role: values.role,
        status: values.status,
        department: values.department,
      });
      setEditingUser(null);
      setRefreshKey((k) => k + 1);
      enqueueRequestFeedback({
        variant: "info",
        title: t("admin.users.updated"),
        description: t("admin.users.updatedDesc", { name: values.name }),
      });
    },
    [editingUser, t],
  );

  const handleResetPassword = useCallback(
    async (password: string) => {
      if (!resettingUser) return;
      await resetAdminUserPassword(resettingUser.userId, password);
      setResettingUser(null);
      enqueueRequestFeedback({
        variant: "info",
        title: t("admin.users.passwordReset"),
        description: t("admin.users.passwordResetDesc", {
          name: resettingUser.name,
        }),
      });
    },
    [resettingUser, t],
  );

  const handleDelete = useCallback(async () => {
    if (!deletingUser) return;
    await deleteAdminUser(deletingUser.userId);
    setDeletingUser(null);
    setRefreshKey((k) => k + 1);
    enqueueRequestFeedback({
      variant: "info",
      title: t("admin.users.deleted"),
      description: t("admin.users.deletedDesc", { name: deletingUser.name }),
    });
  }, [deletingUser, t]);

  const isEmpty = !loading && items.length === 0;
  const pageStart = useMemo(
    () => (totalItems === 0 ? 0 : (page - 1) * DEFAULT_PAGE_SIZE + 1),
    [page, totalItems],
  );
  const pageEnd = useMemo(
    () => Math.min(totalItems, page * DEFAULT_PAGE_SIZE),
    [page, totalItems],
  );

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <p className={styles.kicker}>{t("admin.users.kicker")}</p>
          <h1 className={styles.title}>{t("admin.users.title")}</h1>
          <p className={styles.subtitle}>{t("admin.users.subtitle")}</p>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="ghost"
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            aria-label={t("admin.users.refresh")}
            title={t("admin.users.refresh")}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <RefreshIcon />
              {t("admin.users.refresh")}
            </span>
          </Button>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <PlusIcon />
              {t("admin.users.addUser")}
            </span>
          </Button>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden="true">
            <SearchIcon />
          </span>
          <input
            className={`ui-input ${styles.searchInput}`}
            value={searchInput}
            onChange={handleSearchChange}
            placeholder={t("admin.users.searchPlaceholder")}
            type="search"
            aria-label={t("admin.users.searchPlaceholder")}
          />
        </div>

        <div className={styles.filters}>
          <select
            className={styles.select}
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value as "" | UserRole);
              setPage(1);
            }}
            aria-label={t("admin.users.filterRole")}
          >
            <option value="">{t("admin.users.filterAllRoles")}</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {t(`roles.${role}`)}
              </option>
            ))}
          </select>
          <select
            className={styles.select}
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as "" | UserStatus);
              setPage(1);
            }}
            aria-label={t("admin.users.filterStatus")}
          >
            <option value="">{t("admin.users.filterAllStatuses")}</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(`status.${status}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.loadingOverlay}>
            <Spinner label={t("routeFallback.title")} />
          </div>
        ) : null}

        {isEmpty ? (
          <div className={styles.emptyWrap}>
            <EmptyState
              icon={<UsersIcon size={32} />}
              title={t("admin.users.empty.title")}
              description={t("admin.users.empty.description")}
            >
              <Button onClick={() => setCreateOpen(true)} type="button">
                {t("admin.users.addUser")}
              </Button>
            </EmptyState>
          </div>
        ) : (
          <>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("admin.users.column.user")}</th>
                    <th>{t("admin.users.column.role")}</th>
                    <th>{t("admin.users.column.status")}</th>
                    <th>{t("admin.users.column.department")}</th>
                    <th>{t("admin.users.column.lastLogin")}</th>
                    <th className={styles.actionsCell}>
                      {t("admin.users.column.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((user) => {
                    const isSelf = currentUser?.userId === user.userId;
                    return (
                      <tr key={user.userId}>
                        <td>
                          <div className={styles.userCell}>
                            <span className={styles.avatar} aria-hidden="true">
                              {getInitial(user)}
                            </span>
                            <div className={styles.userMeta}>
                              <span className={styles.userName}>
                                {user.name}
                                {isSelf ? ` (${t("admin.users.you")})` : ""}
                              </span>
                              <span className={styles.userEmail}>
                                {user.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className={styles.badge}
                            data-role={user.role}
                          >
                            {t(`roles.${user.role}`)}
                          </span>
                        </td>
                        <td>
                          <span
                            className={styles.statusBadge}
                            data-status={user.status}
                          >
                            <span className={styles.statusDot} />
                            {t(`status.${user.status}`)}
                          </span>
                        </td>
                        <td className={styles.cellMuted}>
                          {user.department.length > 0
                            ? user.department.join(" / ")
                            : "—"}
                        </td>
                        <td className={styles.cellMono}>
                          {formatDateTime(user.lastLogin)}
                        </td>
                        <td className={styles.actionsCell}>
                          <span className={styles.actionsRow}>
                            <button
                              type="button"
                              className={styles.iconBtn}
                              onClick={() => setEditingUser(user)}
                              aria-label={t("admin.users.edit", {
                                name: user.name,
                              })}
                              title={t("common.edit")}
                            >
                              <EditIcon />
                            </button>
                            <button
                              type="button"
                              className={styles.iconBtn}
                              onClick={() => setResettingUser(user)}
                              aria-label={t("admin.users.resetPasswordFor", {
                                name: user.name,
                              })}
                              title={t("admin.users.resetPassword")}
                            >
                              <KeyIcon />
                            </button>
                            <button
                              type="button"
                              className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                              onClick={() => setDeletingUser(user)}
                              aria-label={t("admin.users.deleteUser", {
                                name: user.name,
                              })}
                              title={t("common.delete")}
                              disabled={isSelf}
                            >
                              <TrashIcon />
                            </button>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles.tableFooter}>
              <span>
                {t("admin.users.pageInfo", {
                  start: pageStart,
                  end: pageEnd,
                  total: totalItems,
                })}
              </span>
              <span className={styles.pagination}>
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || loading}
                >
                  {t("admin.users.previous")}
                </button>
                <span className={styles.pageIndicator}>
                  {t("admin.users.pageOf", { page, total: totalPages })}
                </span>
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={page >= totalPages || loading}
                >
                  {t("admin.users.next")}
                </button>
              </span>
            </div>
          </>
        )}
      </div>

      <UserFormDialog
        mode="create"
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) setCreateOpen(false);
        }}
        onSubmit={handleCreate}
      />

      <UserFormDialog
        mode="edit"
        user={editingUser ?? undefined}
        open={Boolean(editingUser)}
        onOpenChange={(open) => {
          if (!open) setEditingUser(null);
        }}
        onSubmit={handleUpdate}
      />

      <ResetPasswordDialog
        user={resettingUser}
        open={Boolean(resettingUser)}
        onOpenChange={(open) => {
          if (!open) setResettingUser(null);
        }}
        onSubmit={handleResetPassword}
      />

      <ConfirmDeleteDialog
        user={deletingUser}
        open={Boolean(deletingUser)}
        onOpenChange={(open) => {
          if (!open) setDeletingUser(null);
        }}
        onConfirm={handleDelete}
      />
    </section>
  );
};
