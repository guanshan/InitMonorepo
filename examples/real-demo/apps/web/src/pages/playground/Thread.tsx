import {
  ActionBarPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useMessage,
} from "@assistant-ui/react";
import type { ProviderVendor } from "@real-demo/shared";
import { useTranslation } from "react-i18next";
import { Streamdown } from "streamdown";

import {
  CheckIcon,
  CopyIcon,
  EditIcon,
  RefreshIcon,
  SendIcon,
  StopIcon,
} from "../../shared/ui/icons";
import { ProviderLogo } from "../../shared/ui/ProviderLogo";

import styles from "./PlaygroundPage.module.css";

const UserMessage = () => {
  return (
    <MessagePrimitive.Root className={`${styles.message} ${styles.messageUser}`}>
      <div className={styles.messageBody}>
        <div className={`${styles.messageBubble} ${styles.messageBubbleUser}`}>
          <MessagePrimitive.Content />
        </div>
        <UserActions />
      </div>
    </MessagePrimitive.Root>
  );
};

const UserEditComposer = () => {
  const { t } = useTranslation();
  return (
    <MessagePrimitive.Root className={`${styles.message} ${styles.messageUser}`}>
      <div className={styles.messageBody}>
        <ComposerPrimitive.Root className={styles.editComposer}>
          <ComposerPrimitive.Input
            asChild
            autoFocus
            submitOnEnter
          >
            <textarea className={styles.editComposerInput} />
          </ComposerPrimitive.Input>
          <div className={styles.editComposerActions}>
            <ComposerPrimitive.Cancel asChild>
              <button type="button" className={styles.secondaryBtn}>
                {t("playground.cancel")}
              </button>
            </ComposerPrimitive.Cancel>
            <ComposerPrimitive.Send asChild>
              <button type="button" className={styles.primaryBtn}>
                {t("playground.saveAndRun")}
              </button>
            </ComposerPrimitive.Send>
          </div>
        </ComposerPrimitive.Root>
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantAvatar = () => {
  const { t } = useTranslation();
  const message = useMessage();
  // The server stamps `vendor` on the assistant message via `messageMetadata`
  // (see playground.controller.ts). assistant-ui's AI SDK adapter propagates
  // the UIMessage's `metadata` verbatim onto the thread message.
  const vendor = (message.metadata as { vendor?: ProviderVendor } | undefined)
    ?.vendor;
  if (vendor) {
    return (
      <div
        className={`${styles.messageAvatar} ${styles.messageAvatarAssistant}`}
        aria-label={t("playground.role.assistant")}
      >
        <ProviderLogo vendor={vendor} size={18} />
      </div>
    );
  }
  return (
    <div
      className={`${styles.messageAvatar} ${styles.messageAvatarAssistant}`}
    >
      {t("playground.assistantAvatar")}
    </div>
  );
};

const AssistantMessage = () => {
  const { t } = useTranslation();
  return (
    <MessagePrimitive.Root className={styles.message}>
      <AssistantAvatar />
      <div className={styles.messageBody}>
        <div className={styles.messageHeader}>
          <span className={styles.messageRole}>
            {t("playground.role.assistant")}
          </span>
          <AssistantActions />
        </div>
        <AssistantContent />
        <AssistantMeta />
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantContent = () => {
  const { t } = useTranslation();
  const message = useMessage();
  const isStreaming = message.status?.type === "running";
  // Stream failures arrive as `incomplete` with reason `error`; the error
  // text (when the SSE pipeline included one) lands on `status.error`.
  const error =
    message.status?.type === "incomplete" &&
    message.status.reason === "error"
      ? typeof message.status.error === "string"
        ? message.status.error
        : t("errors.generic")
      : null;
  const text = message.content
    .filter((p) => p.type === "text")
    .map((p) => ("text" in p ? p.text : ""))
    .join("");

  if (error) {
    return (
      <div className={`${styles.messageBubble} ${styles.messageError}`}>
        {error}
      </div>
    );
  }
  if (isStreaming && text.length === 0) {
    return (
      <div className={styles.messageBubble}>
        <span className={styles.thinking}>
          <span className={styles.thinkingDots}>
            <span />
            <span />
            <span />
          </span>
          {t("playground.sending")}
        </span>
      </div>
    );
  }
  return (
    <div className={styles.messageBubble}>
      <Streamdown className={styles.markdownBody} parseIncompleteMarkdown>
        {text}
      </Streamdown>
    </div>
  );
};

const AssistantMeta = () => {
  const { t } = useTranslation();
  const message = useMessage();
  // Both latency and usage come from the server via `messageMetadata` on
  // `finish` — assistant-ui's AI SDK adapter propagates UIMessage.metadata
  // verbatim onto the thread message.
  const meta = message.metadata as
    | {
        latencyMs?: number | null;
        usage?: {
          totalTokens?: number | null;
          promptTokens?: number | null;
          completionTokens?: number | null;
        } | null;
      }
    | undefined;
  const latencyMs = meta?.latencyMs;
  if (latencyMs == null) return null;
  const usage = meta?.usage;
  if (usage) {
    return (
      <span className={styles.messageMeta}>
        {t("playground.usage", {
          total: usage.totalTokens ?? "-",
          prompt: usage.promptTokens ?? "-",
          completion: usage.completionTokens ?? "-",
          latency: latencyMs,
        })}
      </span>
    );
  }
  return (
    <span className={styles.messageMeta}>
      {t("playground.latencyOnly", { latency: latencyMs })}
    </span>
  );
};

const UserActions = () => {
  const { t } = useTranslation();
  return (
    <ActionBarPrimitive.Root className={styles.messageActions}>
      <ActionBarPrimitive.Edit asChild>
        <button
          type="button"
          className={styles.bubbleAction}
          aria-label={t("playground.edit")}
          title={t("playground.edit")}
        >
          <EditIcon size={12} />
        </button>
      </ActionBarPrimitive.Edit>
      <CopyButton />
    </ActionBarPrimitive.Root>
  );
};

const AssistantActions = () => {
  const { t } = useTranslation();
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      className={styles.messageActions}
    >
      <ActionBarPrimitive.Reload asChild>
        <button
          type="button"
          className={styles.bubbleAction}
          aria-label={t("playground.regenerate")}
          title={t("playground.regenerate")}
        >
          <RefreshIcon size={12} />
        </button>
      </ActionBarPrimitive.Reload>
      <CopyButton />
    </ActionBarPrimitive.Root>
  );
};

const CopyButton = () => {
  const { t } = useTranslation();
  return (
    <ActionBarPrimitive.Copy asChild copiedDuration={1500}>
      <button
        type="button"
        className={`${styles.bubbleAction} ${styles.copyAction}`}
        aria-label={t("playground.copy")}
        title={t("playground.copy")}
      >
        <span className={styles.copyIconIdle}>
          <CopyIcon size={12} />
        </span>
        <span className={styles.copyIconCopied}>
          <CheckIcon size={12} />
        </span>
      </button>
    </ActionBarPrimitive.Copy>
  );
};

const ThreadEmpty = () => {
  const { t } = useTranslation();
  return (
    <div className={styles.threadEmpty}>
      <p className={styles.threadEmptyTitle}>
        {t("playground.empty.title")}
      </p>
      <p className={styles.threadEmptyHint}>{t("playground.empty.hint")}</p>
    </div>
  );
};

const Composer = () => {
  const { t } = useTranslation();
  return (
    <ComposerPrimitive.Root className={styles.composerRoot}>
      <ComposerPrimitive.Input asChild submitOnEnter>
        <textarea
          className={styles.composerInput}
          placeholder={t("playground.inputPlaceholder")}
          aria-label={t("playground.inputLabel")}
          rows={3}
        />
      </ComposerPrimitive.Input>
      <div className={styles.composerToolbar}>
        <span className={styles.composerHint}>
          {t("playground.composerHint")}
        </span>
        <ThreadPrimitive.If running>
          <ComposerPrimitive.Cancel asChild>
            <button type="button" className={styles.composerStop}>
              <StopIcon size={14} />
              <span>{t("playground.stop")}</span>
            </button>
          </ComposerPrimitive.Cancel>
        </ThreadPrimitive.If>
        <ThreadPrimitive.If running={false}>
          <ComposerPrimitive.Send asChild>
            <button type="button" className={styles.composerSend}>
              <SendIcon />
              <span>{t("playground.send")}</span>
            </button>
          </ComposerPrimitive.Send>
        </ThreadPrimitive.If>
      </div>
    </ComposerPrimitive.Root>
  );
};

export const Thread = () => {
  return (
    <ThreadPrimitive.Root className={styles.threadRoot}>
      <ThreadPrimitive.Viewport className={styles.threadViewport}>
        <ThreadPrimitive.If empty>
          <ThreadEmpty />
        </ThreadPrimitive.If>
        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            UserEditComposer,
            AssistantMessage,
          }}
        />
      </ThreadPrimitive.Viewport>
      <div className={styles.composerWrap}>
        <Composer />
      </div>
    </ThreadPrimitive.Root>
  );
};
