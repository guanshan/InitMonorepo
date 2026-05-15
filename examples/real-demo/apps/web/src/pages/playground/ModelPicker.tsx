import type { ModelView } from "@real-demo/shared";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import {
  AlertTriangleIcon,
  CheckIcon,
  ChevronDownIcon,
  SearchIcon,
} from "../../shared/ui/icons";
import { ProviderLogo } from "../../shared/ui/ProviderLogo";

import styles from "./PlaygroundPage.module.css";

interface ModelPickerProps {
  models: ModelView[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  recentIds: string[];
  disabled?: boolean;
}

interface ProviderGroup {
  providerId: string;
  providerName: string;
  vendor: ModelView["provider"]["vendor"];
  models: ModelView[];
}

const groupByProvider = (models: ModelView[]): ProviderGroup[] => {
  const map = new Map<string, ProviderGroup>();
  for (const m of models) {
    const id = m.provider.id;
    if (!map.has(id)) {
      map.set(id, {
        providerId: id,
        providerName: m.provider.name,
        vendor: m.provider.vendor,
        models: [],
      });
    }
    map.get(id)!.models.push(m);
  }
  return [...map.values()].sort((a, b) =>
    a.providerName.localeCompare(b.providerName),
  );
};

// Capability chips are hidden until the playground actually honours them.
// The schema still tracks vision/tools/json/reasoning for future wiring; when
// it's time to surface them, replace the empty render with a real component.
const renderCapabilities = (): ReactNode => null;

export const ModelPicker = ({
  models,
  selectedId,
  onSelect,
  recentIds,
  disabled,
}: ModelPickerProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return models;
    return models.filter((m) =>
      `${m.id} ${m.name} ${m.model} ${m.provider.name}`
        .toLowerCase()
        .includes(q),
    );
  }, [models, query]);

  const recent = useMemo(() => {
    if (query.trim()) return [];
    const set = new Set(recentIds);
    return models
      .filter((m) => set.has(m.id))
      .sort((a, b) => recentIds.indexOf(a.id) - recentIds.indexOf(b.id))
      .slice(0, 8);
  }, [models, recentIds, query]);

  const groups = useMemo(() => groupByProvider(filtered), [filtered]);

  /**
   * Flat array of selectable model ids in the order they appear, so arrow
   * keys can hop between rows regardless of provider grouping.
   */
  const navigableIds = useMemo(() => {
    const ids: string[] = [];
    for (const m of recent) {
      if (m.enabled && m.provider.hasKey) ids.push(m.id);
    }
    for (const group of groups) {
      for (const m of group.models) {
        if (m.enabled && m.provider.hasKey) ids.push(m.id);
      }
    }
    return ids;
  }, [recent, groups]);

  const [focusedId, setFocusedId] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setFocusedId(navigableIds[0] ?? null);
  }, [open, navigableIds]);

  const selected = selectedId
    ? models.find((m) => m.id === selectedId) ?? null
    : null;

  const choose = (id: string) => {
    onSelect(id);
    setOpen(false);
    setQuery("");
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (navigableIds.length === 0) return;
    const idx = focusedId ? navigableIds.indexOf(focusedId) : -1;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = idx < 0 ? 0 : (idx + 1) % navigableIds.length;
      setFocusedId(navigableIds[next] ?? null);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const next =
        idx < 0
          ? navigableIds.length - 1
          : (idx - 1 + navigableIds.length) % navigableIds.length;
      setFocusedId(navigableIds[next] ?? null);
    } else if (event.key === "Enter") {
      if (focusedId) {
        event.preventDefault();
        choose(focusedId);
      }
    }
  };

  const listboxId = "model-picker-listbox";
  const focusedOptionId = focusedId ? `model-picker-option-${focusedId}` : undefined;

  return (
    <div className={styles.modelPicker} ref={rootRef}>
      <button
        type="button"
        className={styles.modelPickerTrigger}
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
      >
        {selected ? (
          <>
            <span className={styles.modelPickerLogo}>
              <ProviderLogo vendor={selected.provider.vendor} size={18} />
            </span>
            <span className={styles.modelPickerLabel}>{selected.name}</span>
            {!selected.provider.hasKey ? (
              <span
                className={styles.modelPickerUnhealthy}
                title={t("playground.providerUnhealthy")}
              >
                <AlertTriangleIcon size={12} />
              </span>
            ) : null}
          </>
        ) : (
          <span className={styles.modelPickerEmpty}>
            {models.length === 0
              ? t("playground.noModels")
              : t("playground.selectModel")}
          </span>
        )}
        <ChevronDownIcon size={14} />
      </button>

      {open ? (
        <div
          className={styles.modelPickerDropdown}
          role="listbox"
          id={listboxId}
          aria-activedescendant={focusedOptionId}
        >
          <div className={styles.modelPickerSearch}>
            <SearchIcon size={14} />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={t("playground.searchModels")}
              aria-controls={listboxId}
              aria-activedescendant={focusedOptionId}
            />
          </div>
          <div className={styles.modelPickerList}>
            {recent.length > 0 ? (
              <div className={styles.modelPickerGroup}>
                <div className={styles.modelPickerGroupHeader}>
                  {t("playground.recentModels")}
                </div>
                {recent.map((m) => (
                  <ModelRow
                    key={`recent-${m.id}`}
                    model={m}
                    selected={m.id === selectedId}
                    focused={m.id === focusedId}
                    onSelect={choose}
                  />
                ))}
              </div>
            ) : null}
            {groups.length === 0 ? (
              <div className={styles.modelPickerEmptyResult}>
                {t("playground.noResults")}
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.providerId} className={styles.modelPickerGroup}>
                  <div className={styles.modelPickerGroupHeader}>
                    <span className={styles.modelPickerGroupLogo}>
                      <ProviderLogo vendor={group.vendor} size={14} />
                    </span>
                    {group.providerName}
                  </div>
                  {group.models.map((m) => (
                    <ModelRow
                      key={m.id}
                      model={m}
                      selected={m.id === selectedId}
                      focused={m.id === focusedId}
                      onSelect={choose}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

interface ModelRowProps {
  model: ModelView;
  selected: boolean;
  focused?: boolean;
  onSelect: (id: string) => void;
}

const ModelRow = ({ model, selected, focused, onSelect }: ModelRowProps) => {
  const ref = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (focused) {
      ref.current?.scrollIntoView({ block: "nearest" });
    }
  }, [focused]);
  return (
    <button
      ref={ref}
      type="button"
      id={`model-picker-option-${model.id}`}
      className={`${styles.modelPickerRow} ${
        selected ? styles.modelPickerRowSelected : ""
      } ${focused ? styles.modelPickerRowFocused : ""} ${
        !model.enabled ? styles.modelPickerRowDisabled : ""
      }`}
      onClick={() => onSelect(model.id)}
      role="option"
      aria-selected={selected}
      disabled={!model.enabled || !model.provider.hasKey}
    >
      <span className={styles.modelPickerRowLogo}>
        <ProviderLogo vendor={model.provider.vendor} size={14} />
      </span>
      <span className={styles.modelPickerRowMain}>
        <span className={styles.modelPickerRowName}>{model.name}</span>
        <span className={styles.modelPickerRowMeta}>{model.model}</span>
      </span>
      <span className={styles.modelPickerRowCaps}>
        {renderCapabilities()}
      </span>
      {selected ? (
        <span className={styles.modelPickerRowCheck}>
          <CheckIcon size={14} />
        </span>
      ) : null}
    </button>
  );
};
