import { useTranslation } from "react-i18next";

import { useRequestFeedbackStore } from "../store/request-feedback-store";
import styles from "./RequestFeedbackToaster.module.css";

export const RequestFeedbackToaster = () => {
  const { t } = useTranslation();
  const dismiss = useRequestFeedbackStore((state) => state.dismiss);
  const items = useRequestFeedbackStore((state) => state.items);

  return (
    <div
      aria-atomic="false"
      aria-live="polite"
      className={styles.region}
      role="status"
    >
      {items.map((item) => (
        <section
          className={styles.toast}
          data-variant={item.variant}
          key={item.id}
        >
          <div className={styles.header}>
            <h2 className={styles.title}>{item.title}</h2>
            <button
              aria-label={t("requestFeedback.dismiss")}
              className={styles.dismiss}
              onClick={() => dismiss(item.id)}
              type="button"
            >
              &#x2715;
            </button>
          </div>
          <p className={styles.description}>{item.description}</p>
        </section>
      ))}
    </div>
  );
};
