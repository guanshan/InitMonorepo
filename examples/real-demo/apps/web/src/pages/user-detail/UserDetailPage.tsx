import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";

import { useUserById } from "../../entities/user/api";
import { getUserFacingErrorMessage } from "../../shared/lib/user-facing-error";
import { ErrorState } from "../../shared/ui/ErrorState";
import { LoadingState } from "../../shared/ui/LoadingState";
import styles from "./UserDetailPage.module.css";

export const UserDetailPage = () => {
  const { t } = useTranslation();
  const { userId = "" } = useParams();
  const userQuery = useUserById(userId);

  if (userQuery.isPending) {
    return (
      <LoadingState
        description={t("userDetail.loading.description")}
        title={t("userDetail.loading.title")}
      />
    );
  }

  if (userQuery.isError) {
    return (
      <ErrorState
        description={getUserFacingErrorMessage(
          userQuery.error,
          "userDetail.loadError.description",
        )}
        title={t("userDetail.loadError.title")}
      />
    );
  }

  return (
    <section className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.avatar}>
            {userQuery.data.initial}
          </div>
          <div>
            <p className={styles.caption}>{t("userDetail.caption")}</p>
            <h1>{userQuery.data.name}</h1>
          </div>
        </div>
        <Link className={styles.backLink} to="/users">{t("userDetail.backToList")}</Link>
      </div>

      <dl className={styles.grid}>
        <div>
          <dt>{t("userDetail.email")}</dt>
          <dd>{userQuery.data.email}</dd>
        </div>
        <div>
          <dt>{t("userDetail.role")}</dt>
          <dd>{t(`roles.${userQuery.data.role}`)}</dd>
        </div>
        <div>
          <dt>{t("userDetail.created")}</dt>
          <dd>{userQuery.data.createdAt.toLocaleString()}</dd>
        </div>
        <div>
          <dt>{t("userDetail.updated")}</dt>
          <dd>{userQuery.data.updatedAt.toLocaleString()}</dd>
        </div>
      </dl>
    </section>
  );
};
