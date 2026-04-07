import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  PropsWithChildren,
  ReactNode,
  TableHTMLAttributes,
} from "react";

import * as Dialog from "@radix-ui/react-dialog";

// Re-export the stylesheet path so consumers can import it
import "./styles.css";
export * from "./theme";

/* ========================================================================= */
/* Button                                                                     */
/* ========================================================================= */

export type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = ({
  className = "",
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) => (
  <button
    data-variant={variant}
    className={`ui-button ${className}`.trim()}
    type={type}
    {...props}
  />
);

/* ========================================================================= */
/* Input                                                                      */
/* ========================================================================= */

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = ({ className = "", ...props }: InputProps) => (
  <input className={`ui-input ${className}`.trim()} {...props} />
);

/* ========================================================================= */
/* Card                                                                       */
/* ========================================================================= */

export const Card = ({
  children,
  className = "",
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLElement>>) => (
  <section className={`ui-card ${className}`.trim()} {...props}>
    {children}
  </section>
);

/* ========================================================================= */
/* InlineStat                                                                 */
/* ========================================================================= */

export const InlineStat = ({
  children,
  className = "",
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) => (
  <div className={`ui-inline-stat ${className}`.trim()} {...props}>
    {children}
  </div>
);

/* ========================================================================= */
/* Table                                                                      */
/* ========================================================================= */

export type TableProps = TableHTMLAttributes<HTMLTableElement>;

export const Table = ({
  children,
  className = "",
  ...props
}: PropsWithChildren<TableProps>) => (
  <div className="ui-table-wrapper">
    <table className={`ui-table ${className}`.trim()} {...props}>
      {children}
    </table>
  </div>
);

/* ========================================================================= */
/* Tag                                                                        */
/* ========================================================================= */

export type TagProps = HTMLAttributes<HTMLSpanElement>;

export const Tag = ({
  children,
  className = "",
  ...props
}: PropsWithChildren<TagProps>) => (
  <span className={`ui-tag ${className}`.trim()} {...props}>
    {children}
  </span>
);

/* ========================================================================= */
/* Spinner                                                                    */
/* ========================================================================= */

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  size?: "sm" | "md" | "lg";
}

export const Spinner = ({
  className = "",
  label,
  size = "md",
  ...props
}: SpinnerProps) => (
  <div
    {...(label ? { "aria-label": label, role: "status" } : { "aria-hidden": true })}
    className={`ui-spinner ${className}`.trim()}
    data-size={size}
    {...props}
  />
);

/* ========================================================================= */
/* EmptyState                                                                 */
/* ========================================================================= */

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  description?: string;
  icon?: ReactNode;
  title: string;
}

export const EmptyState = ({
  className = "",
  description,
  icon,
  title,
  children,
  ...props
}: PropsWithChildren<EmptyStateProps>) => (
  <div className={`ui-empty-state ${className}`.trim()} {...props}>
    {icon && <div className="ui-empty-state-icon">{icon}</div>}
    <h3 className="ui-empty-state-title">{title}</h3>
    {description && (
      <p className="ui-empty-state-description">{description}</p>
    )}
    {children}
  </div>
);

/* ========================================================================= */
/* Modal (Radix Dialog)                                                       */
/* ========================================================================= */

export interface ModalProps {
  children: ReactNode;
  closeLabel?: string;
  description?: string;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  title: string;
  trigger?: ReactNode;
}

export const Modal = ({
  children,
  closeLabel,
  description,
  onOpenChange,
  open,
  title,
  trigger,
}: ModalProps) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
    <Dialog.Portal>
      <Dialog.Overlay className="ui-modal-overlay" />
      <Dialog.Content className="ui-modal-content">
        <Dialog.Title className="ui-modal-title">{title}</Dialog.Title>
        {description && (
          <Dialog.Description className="ui-modal-description">
            {description}
          </Dialog.Description>
        )}
        {children}
        <Dialog.Close
          className="ui-modal-close"
          {...(closeLabel ? { "aria-label": closeLabel } : {})}
        >
          &#x2715;
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);
