import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import styles from "./NotFoundPage.module.css";

export const NotFoundPage = () => {
  const { t } = useTranslation();

  return (
    <section className={styles.container}>
      <span className={styles.code}>404</span>
      <h1 className={styles.title}>{t("notFound.title")}</h1>
      <p className={styles.description}>{t("notFound.description")}</p>
      <Link className={styles.actionLink} to="/">
        {t("notFound.action")}
      </Link>
    </section>
  );
};
