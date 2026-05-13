import type { MouseEvent, PropsWithChildren } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { isPublicUiPath } from "@real-demo/shared";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router";

import { environment } from "../config/env";
import { useAuthStore } from "../store/auth-store";
import {
  ChevronRightIcon,
  HomeIcon,
  MoreHorizontalIcon,
  PanelLeftIcon,
} from "./icons";
import { UserSettingsMenu } from "./UserSettingsMenu";
import styles from "./AppShell.module.css";

const SIDEBAR_COLLAPSED_KEY = "real-demo-sidebar-collapsed";

const readStoredCollapsed = () => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
};

const getInitial = (name: string | undefined, email: string | undefined) => {
  if (name && name.length > 0) return name[0]!.toUpperCase();
  if (email && email.length > 0) return email[0]!.toUpperCase();
  return "?";
};

export const AppShell = ({ children }: PropsWithChildren) => {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const [collapsed, setCollapsed] = useState<boolean>(() =>
    readStoredCollapsed(),
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const userRowRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore quota / disabled storage
    }
    document.documentElement.style.setProperty(
      "--sidebar-width",
      collapsed ? "64px" : "240px",
    );
  }, [collapsed]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      if (next) setMenuOpen(false);
      return next;
    });
  }, []);

  // ChatGPT-style: clicking blank area of a collapsed rail expands it.
  // Nested buttons / links keep their own click behavior.
  const handleSidebarClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (!collapsed) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, a, input, [role='button']")) return;
      toggleCollapsed();
    },
    [collapsed, toggleCollapsed],
  );

  // Public routes (login) own their full-screen layout. Bypass the chrome
  // here rather than asking each page to opt out.
  if (isPublicUiPath(location.pathname)) {
    return <>{children}</>;
  }

  const displayName = user?.name || user?.email || "";
  const initial = getInitial(user?.name, user?.email);
  const toggleLabel = collapsed
    ? t("sidebar.expand")
    : t("sidebar.collapse");
  const openSettingsLabel = displayName
    ? t("sidebar.openSettingsFor", { name: displayName })
    : t("sidebar.openSettings");

  return (
    <div className={styles.layout}>
      <aside
        className={styles.sidebar}
        data-collapsed={collapsed ? "true" : "false"}
        aria-label={t("sidebar.label")}
        onClick={handleSidebarClick}
      >
        <div className={styles.logoArea}>
          <NavLink to="/" className={styles.brandLink}>
            <span className={styles.brandIcon} aria-hidden="true">
              ◆
            </span>
            <span className={styles.brandText}>
              <span className={styles.brand}>
                {t("app.title", { appName: environment.appName })}
              </span>
              <span className={styles.subtitle}>{t("app.subtitle")}</span>
            </span>
          </NavLink>
          <button
            className={styles.toggleBtn}
            type="button"
            onClick={toggleCollapsed}
            aria-label={toggleLabel}
            aria-expanded={!collapsed}
            title={toggleLabel}
          >
            <PanelLeftIcon />
          </button>
        </div>

        <nav className={styles.navGroup} aria-label={t("sidebar.label")}>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
            }
            title={collapsed ? t("nav.home") : undefined}
          >
            <span className={styles.navIcon}>
              <HomeIcon />
            </span>
            <span className={styles.navLabel}>{t("nav.home")}</span>
          </NavLink>
        </nav>

        <div className={styles.spacer} />

        {user ? (
          <div className={styles.userArea}>
            <button
              ref={userRowRef}
              className={styles.userRow}
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={openSettingsLabel}
              title={collapsed ? openSettingsLabel : undefined}
            >
              <span className={styles.avatar} aria-hidden="true">
                {initial}
              </span>
              <span className={styles.userInfo}>
                <span className={styles.userName}>{displayName}</span>
                {user.email && (
                  <span className={styles.userEmail}>{user.email}</span>
                )}
              </span>
              <span className={styles.userChevron} aria-hidden="true">
                <MoreHorizontalIcon />
              </span>
            </button>

            <UserSettingsMenu
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              anchorRef={userRowRef}
            />
          </div>
        ) : null}

        <span className={styles.collapsedHint} aria-hidden="true">
          <ChevronRightIcon />
        </span>
      </aside>

      <div className={styles.mainColumn}>
        <main className={styles.content}>{children}</main>
        <footer className={styles.footer}>
          <span>{t("app.footer.stack")}</span>
          <span className={styles.footerDot}>·</span>
          <span>{environment.appName}</span>
        </footer>
      </div>
    </div>
  );
};
