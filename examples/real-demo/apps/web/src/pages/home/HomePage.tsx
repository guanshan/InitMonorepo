import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { InlineStat } from "@real-demo/ui";

import styles from "./HomePage.module.css";

export const HomePage = () => {
  const { t } = useTranslation();

  return (
    <section className={styles.hero}>
      <div className={styles.heroInner}>
        <div className={styles.copy}>
          <p className={styles.kicker}>
            <span className={styles.kickerDot} />
            {t("home.kicker")}
          </p>
          <h1 className={styles.title}>{t("home.title")}</h1>
          <p className={styles.description}>{t("home.description")}</p>
          <div className={styles.actions}>
            <Link className={styles.primaryLink} to="/users">
              <span>{t("nav.users")}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
            <Link className={styles.secondaryLink} to="/users/new">
              {t("nav.create")}
            </Link>
          </div>
        </div>

        <div className={styles.statsColumn}>
          <div className={styles.statsLabel}>{t("home.stats.title")}</div>
          <div className={styles.stats}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
              </div>
              <InlineStat>
                <strong>{t("home.stats.frontend.label")}</strong>
                <span>{t("home.stats.frontend.value")}</span>
              </InlineStat>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>
              </div>
              <InlineStat>
                <strong>{t("home.stats.backend.label")}</strong>
                <span>{t("home.stats.backend.value")}</span>
              </InlineStat>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <InlineStat>
                <strong>{t("home.stats.contracts.label")}</strong>
                <span>{t("home.stats.contracts.value")}</span>
              </InlineStat>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative blobs */}
      <div className={styles.blob1} aria-hidden="true" />
      <div className={styles.blob2} aria-hidden="true" />
    </section>
  );
};
