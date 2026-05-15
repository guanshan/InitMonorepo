import { Button, Input } from "@real-demo/ui";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import {
  AlertCircleIcon,
  RefreshIcon,
  SearchIcon,
} from "../../../shared/ui/icons";
import styles from "../ModelsPage.module.css";

import type { ModelFormDialogState } from "./useModelFormDialogState";

type Props = Pick<
  ModelFormDialogState,
  | "isEdit"
  | "modelSelectMode"
  | "setModelSelectMode"
  | "availableModels"
  | "loadingModels"
  | "discoverError"
  | "fetchAvailableModels"
  | "selectedModelIds"
  | "toggleModelSelection"
  | "selectAllFiltered"
  | "clearSelection"
  | "manualModelId"
  | "setManualModelId"
  | "modelSearch"
  | "setModelSearch"
  | "filteredModels"
  | "modelKey"
  | "setModelKey"
  | "name"
  | "setName"
>;

export const ModelFormModelStep = ({
  isEdit,
  modelSelectMode,
  setModelSelectMode,
  availableModels,
  loadingModels,
  discoverError,
  fetchAvailableModels,
  selectedModelIds,
  toggleModelSelection,
  selectAllFiltered,
  clearSelection,
  manualModelId,
  setManualModelId,
  modelSearch,
  setModelSearch,
  filteredModels,
  modelKey,
  setModelKey,
  name,
  setName,
}: Props) => {
  const { t } = useTranslation();

  // Auto-trigger discovery the first time the list tab is shown — but only
  // once per dialog session. A ref-flag (instead of the previous no-op
  // helper) means switching back and forth between tabs doesn't keep firing
  // the discovery request on every re-mount.
  const triggeredRef = useRef(false);
  useEffect(() => {
    if (modelSelectMode !== "list" || isEdit) return;
    if (triggeredRef.current) return;
    if (availableModels.length > 0 || loadingModels || discoverError) return;
    triggeredRef.current = true;
    void fetchAvailableModels();
  }, [
    modelSelectMode,
    isEdit,
    availableModels.length,
    loadingModels,
    discoverError,
    fetchAvailableModels,
  ]);

  const singleSelectedIdent =
    selectedModelIds.length === 1 ? selectedModelIds[0]! : null;
  const showAliasInput =
    isEdit ||
    modelSelectMode === "manual" ||
    (modelSelectMode === "list" && selectedModelIds.length <= 1);

  return (
    <div className={styles.wizardStep}>
      {!isEdit ? (
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${
              modelSelectMode === "list" ? styles.tabActive : ""
            }`}
            onClick={() => setModelSelectMode("list")}
          >
            {t("admin.models.wizard.model.tabList")}
          </button>
          <button
            type="button"
            className={`${styles.tab} ${
              modelSelectMode === "manual" ? styles.tabActive : ""
            }`}
            onClick={() => setModelSelectMode("manual")}
          >
            {t("admin.models.wizard.model.tabManual")}
          </button>
        </div>
      ) : null}

      {modelSelectMode === "list" && !isEdit ? (
        loadingModels ? (
          <div className={styles.discoveryStatus}>
            {t("admin.models.wizard.model.loading")}
          </div>
        ) : discoverError ? (
          <div className={styles.discoveryError}>
            <AlertCircleIcon size={14} />
            <span>{t(discoverError, { defaultValue: discoverError })}</span>
            <Button
              type="button"
              variant="ghost"
              onClick={() => void fetchAvailableModels()}
            >
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <RefreshIcon size={12} />
                {t("admin.models.wizard.model.retry")}
              </span>
            </Button>
          </div>
        ) : availableModels.length === 0 ? (
          <div className={styles.discoveryStatus}>
            {t("admin.models.wizard.model.empty")}
            <Button
              type="button"
              variant="ghost"
              onClick={() => void fetchAvailableModels()}
            >
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <RefreshIcon size={12} />
                {t("admin.models.wizard.model.refetch")}
              </span>
            </Button>
          </div>
        ) : (
          <>
            <div className={styles.modelSearchRow}>
              <SearchIcon size={14} />
              <input
                type="text"
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                placeholder={t("admin.models.wizard.model.searchPlaceholder")}
                className={styles.modelSearchInput}
              />
            </div>
            <div className={styles.modelListMeta}>
              <span>
                {t("admin.models.wizard.model.selectedOfTotal", {
                  selected: selectedModelIds.length,
                  total: filteredModels.length,
                })}
              </span>
              <div className={styles.modelListMetaBtns}>
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={() => selectAllFiltered(filteredModels.map((m) => m.id))}
                >
                  {t("admin.models.wizard.model.selectAll")}
                </button>
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={clearSelection}
                >
                  {t("admin.models.wizard.model.clear")}
                </button>
              </div>
            </div>
            <div className={styles.modelList}>
              {filteredModels.map((m) => {
                const checked = selectedModelIds.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className={`${styles.modelListRow} ${
                      checked ? styles.modelListRowSelected : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleModelSelection(m.id)}
                    />
                    <span className={styles.modelListMain}>
                      <code className={styles.modelListId}>{m.id}</code>
                      {m.label && m.label !== m.id ? (
                        <span className={styles.modelListLabel}>{m.label}</span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </>
        )
      ) : (
        <label className={styles.formField}>
          <span className={styles.formLabel}>
            {t("admin.models.field.model")} *
          </span>
          <Input
            value={manualModelId}
            onChange={(e) => setManualModelId(e.target.value)}
            placeholder="gpt-4o"
            required
          />
          <span className={styles.formHint}>
            {t("admin.models.field.modelHint")}
          </span>
        </label>
      )}

      {showAliasInput ? (
        <>
          <div className={styles.formGrid}>
            <label className={styles.formField}>
              <span className={styles.formLabel}>
                {t("admin.models.field.name")}
              </span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  singleSelectedIdent ??
                  manualModelId ??
                  t("admin.models.wizard.model.aliasPlaceholder")
                }
              />
            </label>
            <label className={styles.formField}>
              <span className={styles.formLabel}>
                {t("admin.models.field.idV2")}
              </span>
              <Input
                value={modelKey}
                onChange={(e) => setModelKey(e.target.value)}
                disabled={isEdit}
                placeholder={t("admin.models.wizard.model.idPlaceholder")}
              />
            </label>
          </div>
        </>
      ) : (
        <p className={styles.formHint}>
          {t("admin.models.wizard.model.batchHint", {
            count: selectedModelIds.length,
          })}
        </p>
      )}
    </div>
  );
};
