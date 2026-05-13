import { useTranslation } from "react-i18next";

import { useAuthStore } from "../../shared/store/auth-store";

import styles from "./HomePage.module.css";

const formatRole = (
  role: "SUPER_ADMIN" | "ADMIN" | "USER",
  t: (key: string) => string,
) => t(`roles.${role}`);

export const HomePage = () => {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  if (!user) {
    // AuthGate should have redirected; render nothing while we wait.
    return null;
  }

  const initial = user.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <section className={styles.hero}>
      <div className={styles.heroInner}>
        <div className={styles.copy}>
          <p className={styles.kicker}>
            <span className={styles.kickerDot} />
            {t("home.signedInKicker")}
          </p>
          <h1 className={styles.title}>
            {t("home.welcome", { name: user.name })}
          </h1>
          <p className={styles.description}>{t("home.description")}</p>
        </div>

        <aside className={styles.profileCard}>
          <div className={styles.avatar}>{initial}</div>
          <div className={styles.profileBody}>
            <p className={styles.profileName}>{user.name}</p>
            <p className={styles.profileEmail}>{user.email}</p>
            <dl className={styles.profileMeta}>
              <div className={styles.profileMetaRow}>
                <dt>{t("home.profile.role")}</dt>
                <dd>
                  <span className={styles.roleBadge}>
                    {formatRole(user.role, t)}
                  </span>
                </dd>
              </div>
              <div className={styles.profileMetaRow}>
                <dt>{t("home.profile.status")}</dt>
                <dd>{t(`status.${user.status}`)}</dd>
              </div>
              <div className={styles.profileMetaRow}>
                <dt>{t("home.profile.userId")}</dt>
                <dd className={styles.profileMono}>{user.userId}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>

      <div className={styles.blob1} aria-hidden="true" />
      <div className={styles.blob2} aria-hidden="true" />
    </section>
  );
};
