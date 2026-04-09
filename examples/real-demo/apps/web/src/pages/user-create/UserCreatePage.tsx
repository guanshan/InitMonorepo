import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { CreateUserForm } from "../../features/create-user-form/CreateUserForm";
import styles from "./UserCreatePage.module.css";

export const UserCreatePage = () => {
  const { t } = useTranslation();

  return (
    <section className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <p className={styles.caption}>{t("userCreate.title")}</p>
          <p className={styles.description}>{t("userCreate.description")}</p>
        </div>
        <Link className={styles.backLink} to="/users">{t("nav.users")}</Link>
      </div>
      <CreateUserForm />
    </section>
  );
};
