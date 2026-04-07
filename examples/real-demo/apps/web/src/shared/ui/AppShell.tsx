import type { PropsWithChildren } from "react";

import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

import { environment } from "../config/env";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./AppShell.module.css";

export const AppShell = ({ children }: PropsWithChildren) => {
  const { t } = useTranslation();

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <NavLink to="/" className={styles.brandLink}>
          <span className={styles.brandIcon} aria-hidden="true">◆</span>
          <div>
            <p className={styles.brand}>{t("app.title", { appName: environment.appName })}</p>
            <p className={styles.subtitle}>{t("app.subtitle")}</p>
          </div>
        </NavLink>

        <nav className={styles.nav}>
          <NavLink to="/">{t("nav.home")}</NavLink>
          <NavLink to="/users">{t("nav.users")}</NavLink>
          <NavLink to="/users/new">{t("nav.create")}</NavLink>
        </nav>

        <ThemeToggle />
      </header>

      <main className={styles.content}>{children}</main>

      <footer className={styles.footer}>
        <span>{t("app.footer.stack")}</span>
        <span className={styles.footerDot}>·</span>
        <span>{environment.appName}</span>
      </footer>
    </div>
  );
};
