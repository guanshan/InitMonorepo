import type { ThemePreference } from "@real-demo/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { signOut as signOutRequest } from "../api/auth";
import { persistLanguage } from "../lib/i18n";
import { useAuthStore } from "../store/auth-store";
import { useThemeStore } from "../store/theme-store";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import {
  CheckIcon,
  GlobeIcon,
  KeyIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from "./icons";
import styles from "./UserSettingsMenu.module.css";

const THEME_OPTIONS: {
  value: ThemePreference;
  labelKey: string;
  icon: React.ReactNode;
}[] = [
  { value: "light", labelKey: "userMenu.theme.light", icon: <SunIcon /> },
  { value: "dark", labelKey: "userMenu.theme.dark", icon: <MoonIcon /> },
  {
    value: "system",
    labelKey: "userMenu.theme.system",
    icon: <MonitorIcon />,
  },
];

const LANGUAGE_OPTIONS = [
  { value: "en", labelKey: "userMenu.language.en" },
  { value: "zh", labelKey: "userMenu.language.zh" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

export const UserSettingsMenu = ({ open, onClose, anchorRef }: Props) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const logout = useAuthStore((s) => s.logout);
  const menuRef = useRef<HTMLDivElement>(null);
  const [themeOpen, setThemeOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleLanguageChange = useCallback(
    (language: string) => {
      void i18n.changeLanguage(language);
      persistLanguage(language);
      setLangOpen(false);
    },
    [i18n],
  );

  const handleSignOut = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOutRequest();
    } finally {
      logout();
      onClose();
      navigate("/login", { replace: true });
    }
  }, [logout, navigate, onClose, signingOut]);

  const currentThemeIcon =
    preference === "dark" ? (
      <MoonIcon />
    ) : preference === "light" ? (
      <SunIcon />
    ) : (
      <MonitorIcon />
    );

  return (
    <>
      {open ? (
        <div
          ref={menuRef}
          className={styles.menu}
          role="menu"
          aria-label={t("userMenu.settings")}
        >
          <button
            className={styles.menuItem}
            type="button"
            role="menuitem"
            onClick={() => {
              setThemeOpen((prev) => !prev);
              setLangOpen(false);
            }}
          >
            <span className={styles.menuItemIcon}>{currentThemeIcon}</span>
            <span className={styles.menuItemLabel}>{t("userMenu.theme")}</span>
            <span className={styles.menuItemChevron}>
              {themeOpen ? "▾" : "›"}
            </span>
          </button>
          {themeOpen && (
            <div className={styles.subMenu} role="group">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={styles.subMenuItem}
                  type="button"
                  role="menuitemradio"
                  aria-checked={preference === option.value}
                  onClick={() => {
                    setPreference(option.value);
                    setThemeOpen(false);
                  }}
                >
                  <span className={styles.subMenuIcon}>{option.icon}</span>
                  <span>{t(option.labelKey)}</span>
                  {preference === option.value && (
                    <span className={styles.checkMark}>
                      <CheckIcon />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          <button
            className={styles.menuItem}
            type="button"
            role="menuitem"
            onClick={() => {
              setLangOpen((prev) => !prev);
              setThemeOpen(false);
            }}
          >
            <span className={styles.menuItemIcon}>
              <GlobeIcon />
            </span>
            <span className={styles.menuItemLabel}>
              {t("userMenu.language")}
            </span>
            <span className={styles.menuItemChevron}>
              {langOpen ? "▾" : "›"}
            </span>
          </button>
          {langOpen && (
            <div className={styles.subMenu} role="group">
              {LANGUAGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={styles.subMenuItem}
                  type="button"
                  role="menuitemradio"
                  aria-checked={i18n.language === option.value}
                  onClick={() => handleLanguageChange(option.value)}
                >
                  <span>{t(option.labelKey)}</span>
                  {i18n.language === option.value && (
                    <span className={styles.checkMark}>
                      <CheckIcon />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className={styles.separator} role="separator" />

          <button
            className={styles.menuItem}
            type="button"
            role="menuitem"
            onClick={() => {
              onClose();
              setPasswordOpen(true);
            }}
          >
            <span className={styles.menuItemIcon}>
              <KeyIcon />
            </span>
            <span className={styles.menuItemLabel}>
              {t("userMenu.changePassword")}
            </span>
          </button>

          <div className={styles.separator} role="separator" />

          <button
            className={`${styles.menuItem} ${styles.danger}`}
            type="button"
            role="menuitem"
            disabled={signingOut}
            onClick={() => {
              void handleSignOut();
            }}
          >
            <span className={styles.menuItemIcon}>
              <LogOutIcon />
            </span>
            <span className={styles.menuItemLabel}>
              {signingOut ? t("userMenu.signingOut") : t("userMenu.signOut")}
            </span>
          </button>
        </div>
      ) : null}

      <ChangePasswordDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
      />
    </>
  );
};
