import type { ProviderView } from "@real-demo/shared";
import { Button, EmptyState, Modal, Spinner } from "@real-demo/ui";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router";

import {
  createProvider,
  deleteProvider,
  listProviders,
  updateProvider,
} from "../../shared/api/providers";
import { useAuthStore } from "../../shared/store/auth-store";
import { enqueueRequestFeedback } from "../../shared/store/request-feedback-store";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  CpuIcon,
  EditIcon,
  KeyIcon,
  PlusIcon,
  RefreshIcon,
  TrashIcon,
} from "../../shared/ui/icons";
import { ProviderLogo } from "../../shared/ui/ProviderLogo";
import modelsStyles from "../models/ModelsPage.module.css";

import { ProviderFormDialog } from "./ProviderFormDialog";

export const ProvidersPage = () => {
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === "SUPER_ADMIN" || role === "ADMIN";

  const [providers, setProviders] = useState<ProviderView[]>([]);
  const [loading, setLoading] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editorInitial, setEditorInitial] = useState<ProviderView | null>(null);
  const [deletingProvider, setDeletingProvider] = useState<ProviderView | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setProviders(await listProviders());
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

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingProvider) return;
    setDeleting(true);
    try {
      await deleteProvider(deletingProvider.id);
      setDeletingProvider(null);
      await refresh();
    } catch (err) {
      enqueueRequestFeedback({
        variant: "error",
        title: t("errors.generic"),
        description: err instanceof Error ? err.message : "",
      });
    } finally {
      setDeleting(false);
    }
  }, [deletingProvider, refresh, t]);

  if (!canManage) return <Navigate to="/" replace />;

  return (
    <section className={modelsStyles.page}>
      <header className={modelsStyles.header}>
        <div className={modelsStyles.headerCopy}>
          <p className={modelsStyles.kicker}>{t("admin.providers.kicker")}</p>
          <h1 className={modelsStyles.title}>{t("admin.providers.title")}</h1>
          <p className={modelsStyles.subtitle}>
            {t("admin.providers.subtitle")}
          </p>
        </div>
        <div className={modelsStyles.headerActions}>
          <Button type="button" variant="ghost" onClick={refresh}>
            <span className={modelsStyles.btnInner}>
              <RefreshIcon />
              <span>{t("admin.providers.refresh")}</span>
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
            <span className={modelsStyles.btnInner}>
              <PlusIcon size={14} />
              <span>{t("admin.providers.add")}</span>
            </span>
          </Button>
        </div>
      </header>

      {loading && providers.length === 0 ? (
        <div className={modelsStyles.loadingState}>
          <Spinner />
        </div>
      ) : providers.length === 0 ? (
        <EmptyState
          icon={<CpuIcon />}
          title={t("admin.providers.empty.title")}
          description={t("admin.providers.empty.description")}
        />
      ) : (
        <div className={modelsStyles.groups}>
          <article className={modelsStyles.providerCard}>
            <ul className={modelsStyles.modelList}>
              {providers.map((provider) => (
                <li key={provider.id} className={modelsStyles.modelRow}>
                  <span className={modelsStyles.providerLogo}>
                    <ProviderLogo vendor={provider.vendor} size={18} />
                  </span>
                  <div className={modelsStyles.modelMain}>
                    <div className={modelsStyles.modelTitleLine}>
                      <span className={modelsStyles.modelName}>
                        {provider.name}
                      </span>
                      <code className={modelsStyles.modelKey}>
                        {provider.id}
                      </code>
                      <span className={modelsStyles.modelCap}>
                        {provider.type}
                      </span>
                      {provider.hasKey ? null : (
                        <span className={modelsStyles.modelTagTemplate}>
                          <KeyIcon size={11} /> {t("admin.providers.noKey")}
                        </span>
                      )}
                    </div>
                    <p className={modelsStyles.modelDescription}>
                      <code className={modelsStyles.cellMono}>
                        {provider.baseUrl}
                      </code>
                    </p>
                    <div className={modelsStyles.modelCapRow}>
                      <span className={modelsStyles.modelCap}>
                        {provider.apiKeyPreview || "—"}
                      </span>
                      {renderProviderStatus(provider, t)}
                    </div>
                  </div>
                  <div className={modelsStyles.modelActions}>
                    <button
                      type="button"
                      className={modelsStyles.iconBtn}
                      onClick={() => {
                        setEditorInitial(provider);
                        setEditorMode("edit");
                        setEditorOpen(true);
                      }}
                      title={t("common.edit")}
                    >
                      <EditIcon size={14} />
                    </button>
                    <button
                      type="button"
                      className={modelsStyles.iconBtn}
                      onClick={() => setDeletingProvider(provider)}
                      title={t("common.delete")}
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </div>
      )}

      <ProviderFormDialog
        open={editorOpen}
        mode={editorMode}
        initial={editorInitial}
        onOpenChange={setEditorOpen}
        onSubmit={async (values) => {
          if (editorMode === "edit" && editorInitial) {
            await updateProvider(editorInitial.id, values);
          } else {
            await createProvider(values);
          }
          await refresh();
        }}
      />

      <Modal
        open={Boolean(deletingProvider)}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeletingProvider(null);
        }}
        title={t("admin.providers.confirmDeleteTitle")}
        description={t("admin.providers.confirmDeleteDesc")}
        closeLabel={t("common.cancel")}
      >
        <div className={modelsStyles.form}>
          {deletingProvider ? (
            <p className={modelsStyles.confirmText}>
              {t("admin.providers.confirmDeletePrompt", {
                name: deletingProvider.name,
              })}
            </p>
          ) : null}
          <div className={modelsStyles.formFooter}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeletingProvider(null)}
              disabled={deleting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleConfirmDelete()}
              disabled={deleting}
              style={{
                background: "var(--color-danger)",
                color: "var(--color-text-inverse)",
                borderColor: "var(--color-danger)",
              }}
            >
              {deleting ? t("common.saving") : t("common.delete")}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
};

const renderProviderStatus = (
  provider: ProviderView,
  t: (key: string) => string,
) => {
  if (!provider.hasKey) {
    return (
      <span
        className={`${modelsStyles.providerStatus} ${modelsStyles.statusError}`}
      >
        <AlertCircleIcon size={11} /> {t("admin.providers.noKey")}
      </span>
    );
  }
  if (provider.lastError) {
    return (
      <span
        className={`${modelsStyles.providerStatus} ${modelsStyles.statusError}`}
      >
        <AlertCircleIcon size={11} /> {t("admin.providers.unhealthy")}
      </span>
    );
  }
  if (provider.lastVerifiedAt) {
    return (
      <span className={modelsStyles.modelVerified}>
        <CheckCircleIcon size={11} /> {t("admin.providers.healthy")}
      </span>
    );
  }
  return (
    <span className={modelsStyles.modelCap}>
      {t("admin.providers.unverified")}
    </span>
  );
};
