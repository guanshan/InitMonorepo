import styles from "./StatePanel.module.css";

interface ErrorStateAction {
  label: string;
  onClick: () => void;
}

interface ErrorStateProps {
  action?: ErrorStateAction;
  description: string;
  title: string;
}

export const ErrorState = ({ action, description, title }: ErrorStateProps) => (
  <section className={styles.container}>
    <div className={styles.errorIcon}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    </div>
    <h1 className={styles.title}>{title}</h1>
    <p className={styles.description}>{description}</p>
    {action ? (
      <button
        className={styles.actionButton}
        onClick={action.onClick}
        type="button"
      >
        {action.label}
      </button>
    ) : null}
  </section>
);
