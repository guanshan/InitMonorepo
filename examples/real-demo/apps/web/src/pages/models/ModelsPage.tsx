import type { ModelView, ProviderView } from "@real-demo/shared";
import { Button, EmptyState, Modal, Spinner } from "@real-demo/ui";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router";

import {
  deleteModel,
  listModels,
  updateModel,
  verifyModel,
} from "../../shared/api/models";
import { listProviders } from "../../shared/api/providers";
import { useAuthStore } from "../../shared/store/auth-store";
import { enqueueRequestFeedback } from "../../shared/store/request-feedback-store";
import {
  AlertCircleIcon,
  EditIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  TrashIcon,
  ZapIcon,
} from "../../shared/ui/icons";
import { ProviderLogo } from "../../shared/ui/ProviderLogo";

import { ConfirmDeleteModelDialog } from "./ConfirmDeleteModelDialog";
import { ModelFormDialog } from "./ModelFormDialog";
import styles from "./ModelsPage.module.css";

interface ProviderGroup {
  provider: ProviderView;
  models: ModelView[];
}

type CapabilityKey = "vision" | "tools" | "json" | "reasoning";

const CAPABILITY_ORDER: readonly CapabilityKey[] = [
  "vision",
  "tools",
  "reasoning",
  "json",
];

const activeCapabilities = (caps: ModelView["capabilities"]): CapabilityKey[] =>
  CAPABILITY_ORDER.filter((k) => caps[k]);

const groupByProvider = (
  models: ModelView[],
  providers: ProviderView[],
): ProviderGroup[] => {
  const byId = new Map<string, ProviderGroup>();
  for (const p of providers) {
    byId.set(p.id, { provider: p, models: [] });
  }
  for (const m of models) {
    const group = byId.get(m.provider.id);
    if (group) group.models.push(m);
    else byId.set(m.provider.id, { provider: m.provider, models: [m] });
  }
  return [...byId.values()].sort((a, b) =>
    a.provider.name.localeCompare(b.provider.name),
  );
};

export const ModelsPage = () => {
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === "SUPER_ADMIN" || role === "ADMIN";

  const [models, setModels] = useState<ModelView[]>([]);
  const [providers, setProviders] = useState<ProviderView[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editorInitial, setEditorInitial] = useState<ModelView | null>(null);
  const [deleting, setDeleting] = useState<ModelView | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [m, p] = await Promise.all([listModels({}), listProviders()]);
      setModels(m);
      setProviders(p);
    } catch (err) {
      enqueueRequestFeedback({
        variant: "error",
        title: t("admin.models.fetchFailed"),
        description: err instanceof Error ? err.message : t("errors.generic"),
      });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (canManage) void refresh();
  }, [canManage, refresh]);

  const filteredModels = useMemo(() => {
    const q = search.trim().toLowerCase();
    return models.filter((m) => {
      if (providerFilter && m.provider.id !== providerFilter) return false;
      if (!q) return true;
      return `${m.id} ${m.name} ${m.model} ${m.description}`
        .toLowerCase()
        .includes(q);
    });
  }, [models, search, providerFilter]);

  const groups = useMemo(
    () => groupByProvider(filteredModels, providers),
    [filteredModels, providers],
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllInGroup = useCallback((groupModels: ModelView[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = groupModels.every((m) => next.has(m.id));
      for (const m of groupModels) {
        if (allSelected) next.delete(m.id);
        else next.add(m.id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const reportBatchResult = useCallback(
    (
      action: "enable" | "disable" | "delete",
      results: PromiseSettledResult<unknown>[],
    ) => {
      const failed = results.filter(
        (r): r is PromiseRejectedResult => r.status === "rejected",
      );
      if (failed.length === 0) {
        enqueueRequestFeedback({
          variant: "success",
          title: t(`admin.models.batch.${action}.ok`, {
            count: results.length,
          }),
        });
        return;
      }
      const firstReason = failed[0]!.reason;
      enqueueRequestFeedback({
        variant: "error",
        title: t(`admin.models.batch.${action}.partial`, {
          ok: results.length - failed.length,
          failed: failed.length,
          total: results.length,
        }),
        description:
          firstReason instanceof Error ? firstReason.message : undefined,
      });
    },
    [t],
  );

  const handleBatchEnable = useCallback(
    async (enabled: boolean) => {
      const ids = [...selectedIds];
      const results = await Promise.allSettled(
        ids.map((id) => updateModel(id, { enabled })),
      );
      reportBatchResult(enabled ? "enable" : "disable", results);
      clearSelection();
      await refresh();
    },
    [selectedIds, clearSelection, refresh, reportBatchResult],
  );

  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  const runBatchDelete = useCallback(async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const results = await Promise.allSettled(ids.map((id) => deleteModel(id)));
    reportBatchResult("delete", results);
    clearSelection();
    setBatchDeleteOpen(false);
    await refresh();
  }, [selectedIds, clearSelection, refresh, reportBatchResult]);

  const handleBatchDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    setBatchDeleteOpen(true);
  }, [selectedIds]);

  const handleVerify = useCallback(
    async (id: string) => {
      setVerifyingId(id);
      try {
        const result = await verifyModel(id);
        enqueueRequestFeedback({
          variant: result.success ? "success" : "error",
          title: result.success
            ? t("admin.models.verified")
            : t("admin.models.verifyFailed"),
          description: result.message ?? `${result.latencyMs}ms`,
        });
        await refresh();
      } catch (err) {
        enqueueRequestFeedback({
          variant: "error",
          title: t("admin.models.verifyFailed"),
          description: err instanceof Error ? err.message : t("errors.generic"),
        });
      } finally {
        setVerifyingId(null);
      }
    },
    [t, refresh],
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleting) return;
    await deleteModel(deleting.id);
    setDeleting(null);
    await refresh();
  }, [deleting, refresh]);

  if (!canManage) return <Navigate to="/" replace />;

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <p className={styles.kicker}>{t("admin.models.kicker")}</p>
          <h1 className={styles.title}>{t("admin.models.title")}</h1>
          <p className={styles.subtitle}>{t("admin.models.subtitle")}</p>
        </div>
        <div className={styles.headerActions}>
          <Button
            type="button"
            variant="ghost"
            onClick={refresh}
            aria-label={t("admin.models.refresh")}
            title={t("admin.models.refresh")}
          >
            <span className={styles.btnInner}>
              <RefreshIcon />
              <span>{t("admin.models.refresh")}</span>
            </span>
          </Button>
          <Button
            type="button"
            onClick={() => {
              setEditorInitial(null);
              setEditorMode("create");
              setEditorOpen(true);
            }}
          >
            <span className={styles.btnInner}>
              <PlusIcon size={14} />
              <span>{t("admin.models.addModel")}</span>
            </span>
          </Button>
        </div>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.searchInput}>
          <SearchIcon size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.models.searchPlaceholder")}
          />
        </label>
        <select
          className={styles.select}
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          aria-label={t("admin.models.filterProvider")}
        >
          <option value="">{t("admin.models.filterAllProviders")}</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {selectedIds.size > 0 ? (
        <div className={styles.batchBar} role="status">
          <span className={styles.batchCount}>
            {t("admin.models.selectedCount", { count: selectedIds.size })}
          </span>
          <div className={styles.batchActions}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleBatchEnable(true)}
            >
              {t("admin.models.batchEnable")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleBatchEnable(false)}
            >
              {t("admin.models.batchDisable")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleBatchDelete}
              style={{ color: "var(--color-danger)" }}
            >
              {t("admin.models.batchDelete")}
            </Button>
            <Button type="button" variant="ghost" onClick={clearSelection}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      ) : null}

      {loading && models.length === 0 ? (
        <div className={styles.loadingState}>
          <Spinner />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<ZapIcon />}
          title={t("admin.models.empty.title")}
          description={t("admin.models.empty.description")}
        />
      ) : (
        <div className={styles.table} role="table">
          <div className={styles.tableHead} role="row">
            <span className={styles.tableHeadCheck} aria-hidden />
            <span>{t("admin.models.column.model")}</span>
            <span>{t("admin.models.column.capabilities")}</span>
            <span>{t("admin.models.column.status")}</span>
            <span className={styles.tableHeadActions} aria-hidden />
          </div>

          {groups.map((group) => {
            const isAllSelected =
              group.models.length > 0 &&
              group.models.every((m) => selectedIds.has(m.id));
            const isSomeSelected =
              group.models.some((m) => selectedIds.has(m.id)) && !isAllSelected;
            const providerWarning = !group.provider.hasKey
              ? t("admin.providers.noKey")
              : group.provider.lastError
                ? t("admin.providers.unhealthy")
                : null;
            return (
              <Fragment key={group.provider.id}>
                <div className={styles.providerBand} role="row">
                  <label className={styles.providerBandCheck}>
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeSelected;
                      }}
                      onChange={() => selectAllInGroup(group.models)}
                      disabled={group.models.length === 0}
                      aria-label={t("admin.models.selectGroup", {
                        provider: group.provider.name,
                      })}
                    />
                  </label>
                  <span className={styles.providerBandLogo}>
                    <ProviderLogo vendor={group.provider.vendor} size={16} />
                  </span>
                  <span className={styles.providerBandName}>
                    {group.provider.name}
                  </span>
                  <span className={styles.providerBandCount}>
                    {t("admin.models.modelCount", { count: group.models.length })}
                  </span>
                  {providerWarning ? (
                    <span className={styles.providerBandWarning}>
                      <AlertCircleIcon size={11} />
                      {providerWarning}
                    </span>
                  ) : null}
                </div>

                {group.models.length === 0 ? (
                  <div className={styles.providerEmpty} role="row">
                    {t("admin.models.empty.description")}
                  </div>
                ) : (
                  group.models.map((model) => {
                    const checked = selectedIds.has(model.id);
                    const isVerifying = verifyingId === model.id;
                    const caps = activeCapabilities(model.capabilities);
                    return (
                      <div
                        key={model.id}
                        className={`${styles.row} ${
                          checked ? styles.rowSelected : ""
                        }`}
                        role="row"
                      >
                        <label className={styles.rowCheck}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelect(model.id)}
                            aria-label={t("admin.models.selectModel", {
                              name: model.name,
                            })}
                          />
                        </label>
                        <div className={styles.rowMain}>
                          <span
                            className={styles.rowName}
                            title={model.description || model.name}
                          >
                            {model.name}
                            {!model.enabled ? (
                              <span className={styles.rowDisabledTag}>
                                {t("admin.models.disabled")}
                              </span>
                            ) : null}
                          </span>
                          <code
                            className={styles.rowModelId}
                            title={model.model}
                          >
                            {model.model}
                          </code>
                        </div>
                        <div className={styles.rowCaps}>
                          {caps.length === 0 ? (
                            <span className={styles.rowCapsMuted}>—</span>
                          ) : (
                            caps.map((cap) => (
                              <span key={cap} className={styles.rowCapChip}>
                                {t(`admin.models.field.capability.${cap}`)}
                              </span>
                            ))
                          )}
                        </div>
                        <div className={styles.rowStatus}>
                          <ModelStatusDot
                            lastVerifiedAt={model.lastVerifiedAt}
                            lastError={model.lastError}
                            onClick={() => handleVerify(model.id)}
                            verifying={isVerifying}
                            t={t}
                          />
                        </div>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() => {
                              setEditorInitial(model);
                              setEditorMode("edit");
                              setEditorOpen(true);
                            }}
                            aria-label={t("common.edit")}
                            title={t("common.edit")}
                          >
                            <EditIcon size={14} />
                          </button>
                          <button
                            type="button"
                            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                            onClick={() => setDeleting(model)}
                            aria-label={t("common.delete")}
                            title={t("common.delete")}
                          >
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </Fragment>
            );
          })}
        </div>
      )}

      <ModelFormDialog
        open={editorOpen}
        mode={editorMode}
        initial={editorInitial}
        providers={providers}
        onOpenChange={setEditorOpen}
        onProvidersChanged={refresh}
      />
      <ConfirmDeleteModelDialog
        model={deleting}
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onConfirm={handleDeleteConfirm}
      />
      <Modal
        open={batchDeleteOpen}
        onOpenChange={(open) => {
          if (!open) setBatchDeleteOpen(false);
        }}
        title={t("admin.models.batch.delete.title", {
          count: selectedIds.size,
        })}
        description={t("admin.models.batch.delete.description")}
        closeLabel={t("common.cancel")}
      >
        <div className={styles.form}>
          <p className={styles.confirmText}>
            {t("admin.models.batch.delete.confirmPrompt", {
              count: selectedIds.size,
            })}
          </p>
          <div className={styles.formFooter}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setBatchDeleteOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void runBatchDelete()}
              style={{
                background: "var(--color-danger)",
                color: "var(--color-text-inverse)",
                borderColor: "var(--color-danger)",
              }}
            >
              {t("common.delete")}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
};

interface ModelStatusDotProps {
  lastVerifiedAt: string | null;
  lastError: string | null;
  verifying: boolean;
  onClick: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

const ModelStatusDot = ({
  lastVerifiedAt,
  lastError,
  verifying,
  onClick,
  t,
}: ModelStatusDotProps) => {
  const titleParts: string[] = [];
  if (lastVerifiedAt) {
    titleParts.push(
      t("admin.models.lastVerified", {
        time: new Date(lastVerifiedAt).toLocaleString(),
      }),
    );
  }
  if (lastError) titleParts.push(lastError);
  titleParts.push(t("admin.models.verifyHint"));
  const title = titleParts.join("\n");

  const variantClass = verifying
    ? styles.statusDotVerifying
    : lastError
      ? styles.statusDotFail
      : lastVerifiedAt
        ? styles.statusDotOk
        : styles.statusDotIdle;
  const label = verifying
    ? t("admin.models.verifying")
    : lastError
      ? t("admin.models.statusFail")
      : lastVerifiedAt
        ? t("admin.models.statusOk")
        : t("admin.models.statusUnverified");

  return (
    <button
      type="button"
      className={`${styles.statusDot} ${variantClass}`}
      onClick={onClick}
      disabled={verifying}
      title={title}
    >
      <span className={styles.statusDotMark} aria-hidden />
      <span className={styles.statusDotLabel}>{label}</span>
    </button>
  );
};
