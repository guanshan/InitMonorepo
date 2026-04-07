import styles from "./StatePanel.module.css";

interface LoadingStateProps {
  description: string;
  title: string;
}

export const LoadingState = ({ description, title }: LoadingStateProps) => (
  <section className={styles.container}>
    <div className={styles.spinner} />
    <h1 className={styles.title}>{title}</h1>
    <p className={styles.description}>{description}</p>
  </section>
);
