import { Link } from "react-router";

import styles from "./StatePanel.module.css";

interface EmptyStateProps {
  actionLabel?: string;
  actionTo?: string;
  description: string;
  title: string;
}

export const EmptyState = ({
  actionLabel,
  actionTo,
  description,
  title,
}: EmptyStateProps) => (
  <section className={styles.container}>
    <div className={styles.emptyIcon}>
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </div>
    <h1 className={styles.title}>{title}</h1>
    <p className={styles.description}>{description}</p>
    {actionLabel && actionTo ? (
      <Link className={styles.actionLink} to={actionTo}>
        {actionLabel}
      </Link>
    ) : null}
  </section>
);
