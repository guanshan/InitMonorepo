import type { SystemSettings } from "@real-demo/shared";
import { Button, Input, Spinner } from "@real-demo/ui";
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router";

import {
  fetchSystemSettings,
  updateSystemSettings,
} from "../../shared/api/system-settings";
import { useAuthStore } from "../../shared/store/auth-store";
import { enqueueRequestFeedback } from "../../shared/store/request-feedback-store";
import {
  GlobeIcon,
  MegaphoneIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  SettingsIcon,
  SlidersIcon,
  SunIcon,
} from "../../shared/ui/icons";

import styles from "./SettingsPage.module.css";

interface FormState {
  appName: string;
  appTagline: string;
  supportEmail: string;
  defaultLocale: "en" | "zh";
  defaultTheme: "light" | "dark" | "system";
  signUpEnabled: boolean;
  announcement: string;
}

const toFormState = (settings: SystemSettings): FormState => ({
  appName: settings.appName,
  appTagline: settings.appTagline,
  supportEmail: settings.supportEmail,
  defaultLocale: settings.defaultLocale,
  defaultTheme: settings.defaultTheme,
  signUpEnabled: settings.signUpEnabled,
  announcement: settings.announcement,
});

const SECTIONS = [
  { id: "general", icon: SettingsIcon, labelKey: "settings.section.general" },
  {
    id: "appearance",
    icon: PaletteIcon,
    labelKey: "settings.section.appearance",
  },
  { id: "security", icon: SlidersIcon, labelKey: "settings.section.security" },
  {
    id: "announcement",
    icon: MegaphoneIcon,
    labelKey: "settings.section.announcement",
  },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const isValidEmail = (value: string) =>
  value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const SettingsPage = () => {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const canAccess = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [activeSection, setActiveSection] = useState<SectionId>("general");

  useEffect(() => {
    if (!canAccess) return;
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    fetchSystemSettings({ signal: controller.signal })
      .then((value) => {
        setSettings(value);
        setForm(toFormState(value));
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setLoadError(err instanceof Error ? err.message : t("errors.generic"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [canAccess, t, loadAttempt]);

  const handleRetryLoad = useCallback(() => {
    setLoadAttempt((n) => n + 1);
  }, []);

  if (!canAccess) {
    return <Navigate to="/" replace />;
  }

  const updateField = useCallback(
    <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
      setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    },
    [],
  );

  const isDirty = useMemo(() => {
    if (!form || !settings) return false;
    return (
      form.appName !== settings.appName ||
      form.appTagline !== settings.appTagline ||
      form.supportEmail !== settings.supportEmail ||
      form.defaultLocale !== settings.defaultLocale ||
      form.defaultTheme !== settings.defaultTheme ||
      form.signUpEnabled !== settings.signUpEnabled ||
      form.announcement !== settings.announcement
    );
  }, [form, settings]);

  const validationError = useMemo(() => {
    if (!form) return "";
    if (!form.appName.trim()) {
      return t("settings.validation.appName");
    }
    if (form.supportEmail && !isValidEmail(form.supportEmail)) {
      return t("validation.email.invalid");
    }
    return "";
  }, [form, t]);

  const canSave = isDirty && !validationError && !saving;

  const handleSave = useCallback(async () => {
    if (!form || !canSave) return;
    setSaving(true);
    setError("");
    try {
      const next = await updateSystemSettings(form);
      setSettings(next);
      setForm(toFormState(next));
      enqueueRequestFeedback({
        variant: "info",
        title: t("settings.saved"),
        description: t("settings.savedDesc"),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setSaving(false);
    }
  }, [canSave, form, t]);

  const handleReset = useCallback(() => {
    if (!settings) return;
    setForm(toFormState(settings));
    setError("");
  }, [settings]);

  if (!form) {
    return (
      <section className={styles.page}>
        <div className={styles.header}>
          <p className={styles.kicker}>{t("settings.kicker")}</p>
          <h1 className={styles.title}>{t("settings.title")}</h1>
          <p className={styles.subtitle}>{t("settings.subtitle")}</p>
        </div>
        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "3rem 0",
            }}
          >
            <Spinner label={t("routeFallback.title")} size="lg" />
          </div>
        ) : (
          // First-load failed and we have no form to render. Surface the
          // error and a retry affordance instead of an indefinite spinner.
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
              padding: "3rem 0",
            }}
          >
            <p className={styles.errorBanner} role="alert">
              {t("settings.loadFailedTitle")}
              {loadError ? ` — ${loadError}` : ""}
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={handleRetryLoad}
              disabled={loading}
            >
              {t("settings.retry")}
            </Button>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>{t("settings.kicker")}</p>
        <h1 className={styles.title}>{t("settings.title")}</h1>
        <p className={styles.subtitle}>{t("settings.subtitle")}</p>
      </header>

      <div className={styles.sections}>
        <nav className={styles.nav} aria-label={t("settings.navLabel")}>
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                type="button"
                className={`${styles.navItem} ${
                  isActive ? styles.navItemActive : ""
                }`}
                onClick={() => setActiveSection(section.id)}
                aria-current={isActive ? "true" : undefined}
              >
                <span className={styles.navIcon} aria-hidden="true">
                  <Icon size={15} />
                </span>
                {t(section.labelKey)}
              </button>
            );
          })}
        </nav>

        <div className={styles.panelStack}>
          {activeSection === "general" ? (
            <article className={styles.card}>
              <header className={styles.cardHeader}>
                <span className={styles.cardIcon}>
                  <SettingsIcon />
                </span>
                <div>
                  <h2 className={styles.cardTitle}>
                    {t("settings.general.title")}
                  </h2>
                  <p className={styles.cardDescription}>
                    {t("settings.general.description")}
                  </p>
                </div>
              </header>

              <div className={styles.field}>
                <label
                  htmlFor="settings-app-name"
                  className={styles.fieldLabel}
                >
                  <span className={styles.fieldName}>
                    {t("settings.general.appName")}
                  </span>
                  <span className={styles.fieldHint}>
                    {t("settings.general.appNameHint")}
                  </span>
                </label>
                <div className={styles.fieldControl}>
                  <Input
                    id="settings-app-name"
                    className={styles.input}
                    value={form.appName}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updateField("appName", event.target.value)
                    }
                    maxLength={64}
                    required
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label
                  htmlFor="settings-app-tagline"
                  className={styles.fieldLabel}
                >
                  <span className={styles.fieldName}>
                    {t("settings.general.appTagline")}
                  </span>
                  <span className={styles.fieldHint}>
                    {t("settings.general.appTaglineHint")}
                  </span>
                </label>
                <div className={styles.fieldControl}>
                  <Input
                    id="settings-app-tagline"
                    className={styles.input}
                    value={form.appTagline}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updateField("appTagline", event.target.value)
                    }
                    maxLength={160}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label
                  htmlFor="settings-support-email"
                  className={styles.fieldLabel}
                >
                  <span className={styles.fieldName}>
                    {t("settings.general.supportEmail")}
                  </span>
                  <span className={styles.fieldHint}>
                    {t("settings.general.supportEmailHint")}
                  </span>
                </label>
                <div className={styles.fieldControl}>
                  <Input
                    id="settings-support-email"
                    type="email"
                    className={styles.input}
                    value={form.supportEmail}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updateField("supportEmail", event.target.value)
                    }
                    placeholder="support@example.com"
                    maxLength={255}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label
                  htmlFor="settings-default-locale"
                  className={styles.fieldLabel}
                >
                  <span className={styles.fieldName}>
                    {t("settings.general.defaultLocale")}
                  </span>
                  <span className={styles.fieldHint}>
                    {t("settings.general.defaultLocaleHint")}
                  </span>
                </label>
                <div className={styles.fieldControl}>
                  <select
                    id="settings-default-locale"
                    className={styles.select}
                    value={form.defaultLocale}
                    onChange={(event) =>
                      updateField(
                        "defaultLocale",
                        event.target.value as "en" | "zh",
                      )
                    }
                  >
                    <option value="en">{t("userMenu.language.en")}</option>
                    <option value="zh">{t("userMenu.language.zh")}</option>
                  </select>
                </div>
              </div>
            </article>
          ) : null}

          {activeSection === "appearance" ? (
            <article className={styles.card}>
              <header className={styles.cardHeader}>
                <span className={styles.cardIcon}>
                  <PaletteIcon />
                </span>
                <div>
                  <h2 className={styles.cardTitle}>
                    {t("settings.appearance.title")}
                  </h2>
                  <p className={styles.cardDescription}>
                    {t("settings.appearance.description")}
                  </p>
                </div>
              </header>

              <div className={styles.field}>
                <div
                  className={styles.fieldLabel}
                  id="settings-default-theme-label"
                >
                  <span className={styles.fieldName}>
                    {t("settings.appearance.defaultTheme")}
                  </span>
                  <span className={styles.fieldHint}>
                    {t("settings.appearance.defaultThemeHint")}
                  </span>
                </div>
                <div className={styles.fieldControl}>
                  <div
                    className={styles.themeOptions}
                    role="radiogroup"
                    aria-labelledby="settings-default-theme-label"
                  >
                    {(
                      [
                        {
                          value: "light",
                          icon: SunIcon,
                          preview: styles.themePreviewLight,
                        },
                        {
                          value: "dark",
                          icon: MoonIcon,
                          preview: styles.themePreviewDark,
                        },
                        {
                          value: "system",
                          icon: MonitorIcon,
                          preview: styles.themePreviewSystem,
                        },
                      ] as const
                    ).map((option) => {
                      const Icon = option.icon;
                      const isActive = form.defaultTheme === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          className={`${styles.themeOption} ${
                            isActive ? styles.themeOptionActive : ""
                          }`}
                          onClick={() =>
                            updateField("defaultTheme", option.value)
                          }
                        >
                          <span className={option.preview} aria-hidden="true" />
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <Icon size={14} />
                            {t(`userMenu.theme.${option.value}`)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldLabel}>
                  <span className={styles.fieldName}>
                    {t("settings.appearance.localePreviewTitle")}
                  </span>
                  <span className={styles.fieldHint}>
                    {t("settings.appearance.localePreviewHint")}
                  </span>
                </div>
                <div className={styles.fieldControl}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      color: "var(--color-text-secondary)",
                      fontSize: "var(--font-size-sm)",
                    }}
                  >
                    <GlobeIcon size={14} />
                    {form.defaultLocale === "zh"
                      ? t("userMenu.language.zh")
                      : t("userMenu.language.en")}
                  </div>
                </div>
              </div>
            </article>
          ) : null}

          {activeSection === "security" ? (
            <article className={styles.card}>
              <header className={styles.cardHeader}>
                <span className={styles.cardIcon}>
                  <SlidersIcon />
                </span>
                <div>
                  <h2 className={styles.cardTitle}>
                    {t("settings.security.title")}
                  </h2>
                  <p className={styles.cardDescription}>
                    {t("settings.security.description")}
                  </p>
                </div>
              </header>

              <div className={styles.field}>
                <label
                  htmlFor="settings-signup-enabled"
                  className={styles.fieldLabel}
                >
                  <span className={styles.fieldName}>
                    {t("settings.security.signUpEnabled")}
                  </span>
                  <span className={styles.fieldHint}>
                    {t("settings.security.signUpEnabledHint")}
                  </span>
                </label>
                <div className={styles.fieldControl}>
                  <label className={styles.toggle}>
                    <input
                      id="settings-signup-enabled"
                      type="checkbox"
                      className={styles.toggleInput}
                      checked={form.signUpEnabled}
                      onChange={(event) =>
                        updateField("signUpEnabled", event.target.checked)
                      }
                    />
                    <span className={styles.toggleTrack}>
                      <span className={styles.toggleThumb} />
                    </span>
                    <span className={styles.toggleLabel}>
                      {form.signUpEnabled
                        ? t("settings.security.signUpEnabledOn")
                        : t("settings.security.signUpEnabledOff")}
                    </span>
                  </label>
                </div>
              </div>
            </article>
          ) : null}

          {activeSection === "announcement" ? (
            <article className={styles.card}>
              <header className={styles.cardHeader}>
                <span className={styles.cardIcon}>
                  <MegaphoneIcon />
                </span>
                <div>
                  <h2 className={styles.cardTitle}>
                    {t("settings.announcement.title")}
                  </h2>
                  <p className={styles.cardDescription}>
                    {t("settings.announcement.description")}
                  </p>
                </div>
              </header>

              <div className={styles.field}>
                <label
                  htmlFor="settings-announcement"
                  className={styles.fieldLabel}
                >
                  <span className={styles.fieldName}>
                    {t("settings.announcement.bodyLabel")}
                  </span>
                  <span className={styles.fieldHint}>
                    {t("settings.announcement.bodyHint", {
                      max: 500,
                    })}
                  </span>
                </label>
                <div className={styles.fieldControl}>
                  <textarea
                    id="settings-announcement"
                    className={styles.textarea}
                    value={form.announcement}
                    onChange={(event) =>
                      updateField("announcement", event.target.value)
                    }
                    maxLength={500}
                    placeholder={t("settings.announcement.placeholder")}
                  />
                </div>
              </div>
            </article>
          ) : null}

          {error || validationError ? (
            <p className={styles.errorBanner} role="alert">
              {validationError || error}
            </p>
          ) : null}

          <div className={styles.footerBar}>
            <span className={styles.footerStatus}>
              <span
                className={styles.footerStatusDot}
                data-dirty={isDirty ? "true" : "false"}
              />
              {(() => {
                if (isDirty) return t("settings.footer.unsaved");
                const ts = settings?.updatedAt;
                const parsed = ts ? new Date(ts) : null;
                const formatted =
                  parsed && !Number.isNaN(parsed.getTime())
                    ? parsed.toLocaleString()
                    : t("settings.footer.savedRecently");
                return t("settings.footer.saved", { timestamp: formatted });
              })()}
            </span>
            <span className={styles.footerActions}>
              <Button
                type="button"
                variant="ghost"
                onClick={handleReset}
                disabled={!isDirty || saving}
              >
                {t("settings.footer.reset")}
              </Button>
              <Button type="button" onClick={handleSave} disabled={!canSave}>
                {saving ? t("common.saving") : t("settings.footer.save")}
              </Button>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
