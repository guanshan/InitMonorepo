import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  TrashIcon,
} from "../../../shared/ui/icons";
import styles from "../PlaygroundPage.module.css";

import type {
  DebugState,
  EditableMessage,
  MessageRole,
} from "./useDebugState";

type Props = Pick<
  DebugState,
  | "messages"
  | "addMessage"
  | "updateMessage"
  | "removeMessage"
  | "moveMessage"
>;

const ROLES: MessageRole[] = ["system", "user", "assistant"];

export const MultiMessageEditor = ({
  messages,
  addMessage,
  updateMessage,
  removeMessage,
  moveMessage,
}: Props) => {
  return (
    <div className={styles.multiEditor}>
      <div className={styles.multiEditorList}>
        {messages.map((msg, idx) => (
          <MessageCard
            key={msg.uid}
            message={msg}
            isFirst={idx === 0}
            isLast={idx === messages.length - 1}
            canRemove={messages.length > 1}
            onRoleChange={(role) => updateMessage(msg.uid, { role })}
            onContentChange={(content) => updateMessage(msg.uid, { content })}
            onMoveUp={() => moveMessage(msg.uid, -1)}
            onMoveDown={() => moveMessage(msg.uid, 1)}
            onRemove={() => removeMessage(msg.uid)}
          />
        ))}
      </div>

      <AddMessageButton onAdd={addMessage} />
    </div>
  );
};

interface MessageCardProps {
  message: EditableMessage;
  isFirst: boolean;
  isLast: boolean;
  canRemove: boolean;
  onRoleChange: (role: MessageRole) => void;
  onContentChange: (content: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

const MessageCard = ({
  message,
  isFirst,
  isLast,
  canRemove,
  onRoleChange,
  onContentChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: MessageCardProps) => {
  const { t } = useTranslation();
  return (
    <article className={`${styles.messageCard} ${styles[`messageCard_${message.role}`] ?? ""}`}>
      <header className={styles.messageCardHeader}>
        <select
          className={styles.messageRoleSelect}
          value={message.role}
          onChange={(e) => onRoleChange(e.target.value as MessageRole)}
          aria-label={t("playground.debug.multi.roleLabel")}
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {t(`playground.debug.multi.role.${role}`)}
            </option>
          ))}
        </select>
        <div className={styles.messageCardActions}>
          <button
            type="button"
            className={styles.messageCardIconBtn}
            onClick={onMoveUp}
            disabled={isFirst}
            aria-label={t("playground.debug.multi.moveUp")}
            title={t("playground.debug.multi.moveUp")}
          >
            <ChevronUpIcon size={12} />
          </button>
          <button
            type="button"
            className={styles.messageCardIconBtn}
            onClick={onMoveDown}
            disabled={isLast}
            aria-label={t("playground.debug.multi.moveDown")}
            title={t("playground.debug.multi.moveDown")}
          >
            <ChevronDownIcon size={12} />
          </button>
          <button
            type="button"
            className={styles.messageCardIconBtn}
            onClick={onRemove}
            disabled={!canRemove}
            aria-label={t("playground.debug.multi.remove")}
            title={t("playground.debug.multi.remove")}
          >
            <TrashIcon size={12} />
          </button>
        </div>
      </header>
      <textarea
        className={styles.messageCardTextarea}
        value={message.content}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder={t(`playground.debug.multi.placeholder.${message.role}`)}
        rows={3}
      />
    </article>
  );
};

const AddMessageButton = ({
  onAdd,
}: {
  onAdd: (role: MessageRole) => void;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.addMessageWrap}>
      <button
        type="button"
        className={styles.addMessageBtn}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <PlusIcon size={14} />
        <span>{t("playground.debug.multi.addMessage")}</span>
        <span
          className={styles.addMessageChevron}
          data-open={open ? "true" : "false"}
        >
          <ChevronDownIcon size={12} />
        </span>
      </button>
      {open ? (
        <ul className={styles.addMessageMenu} role="menu">
          {ROLES.map((role) => (
            <li key={role}>
              <button
                type="button"
                className={styles.addMessageMenuItem}
                role="menuitem"
                onClick={() => {
                  onAdd(role);
                  setOpen(false);
                }}
              >
                {t(`playground.debug.multi.role.${role}`)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};
