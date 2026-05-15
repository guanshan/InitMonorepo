import type { ModelView } from "@real-demo/shared";
import { Button } from "@real-demo/ui";
import { useTranslation } from "react-i18next";
import { Streamdown } from "streamdown";

import {
  AlertCircleIcon,
  PlusIcon,
  SendIcon,
  StopIcon,
  TrashIcon,
} from "../../../shared/ui/icons";
import { ProviderLogo } from "../../../shared/ui/ProviderLogo";
import styles from "../PlaygroundPage.module.css";

import { CompareSlotCard } from "./CompareSlotCard";
import { useCompareState, type CompareResponse } from "./useCompareState";

interface PlaygroundCompareProps {
  models: ModelView[];
  systemPrompt: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
  recentIds: string[];
}

export const PlaygroundCompare = ({
  models,
  systemPrompt,
  defaultTemperature,
  defaultMaxTokens,
  recentIds,
}: PlaygroundCompareProps) => {
  const { t } = useTranslation();
  const state = useCompareState({
    models,
    globalSystemPrompt: systemPrompt,
    defaultTemperature,
    defaultMaxTokens,
  });

  const activeCount = state.slots.filter((s) => s.modelId).length;
  const gridColsClass =
    activeCount <= 1
      ? styles.compareGrid1
      : activeCount === 2
        ? styles.compareGrid2
        : activeCount === 3
          ? styles.compareGrid3
          : styles.compareGrid4;

  return (
    <div className={styles.compareRoot}>
      {/* Slot cards toolbar */}
      <header className={styles.compareToolbar}>
        <div className={styles.compareSlotCards}>
          {state.slots.map((slot) => (
            <CompareSlotCard
              key={slot.id}
              slot={slot}
              models={models}
              recentIds={recentIds}
              canRemove={state.canRemove}
              globalSystemPrompt={systemPrompt}
              onModelChange={(id) => state.updateSlotModel(slot.id, id)}
              onTemperatureChange={(v) =>
                state.updateSlotTemperature(slot.id, v)
              }
              onMaxTokensChange={(v) => state.updateSlotMaxTokens(slot.id, v)}
              onSystemPromptOverrideChange={(v) =>
                state.updateSlotSystemPromptOverride(slot.id, v)
              }
              onRemove={() => state.removeSlot(slot.id)}
            />
          ))}
          {state.canAddMore ? (
            <button
              type="button"
              className={styles.compareAddSlotCard}
              onClick={state.addSlot}
              disabled={state.anyRunning}
            >
              <PlusIcon size={18} />
              <span>{t("playground.compare.addSlot")}</span>
            </button>
          ) : null}
        </div>
        {state.rounds.length > 0 ? (
          <button
            type="button"
            className={styles.compareClear}
            onClick={state.clearRounds}
            disabled={state.anyRunning}
            title={t("playground.compare.clear")}
          >
            <TrashIcon size={14} />
            <span>{t("playground.compare.clear")}</span>
          </button>
        ) : null}
      </header>

      {/* Rounds */}
      <div className={styles.compareRoundsScroll}>
        {state.rounds.length === 0 ? (
          <div className={styles.compareEmpty}>
            <p className={styles.compareEmptyTitle}>
              {t("playground.compare.empty.title")}
            </p>
            <p className={styles.compareEmptyHint}>
              {t("playground.compare.empty.hint")}
            </p>
          </div>
        ) : (
          state.rounds.map((round) => (
            <div key={round.id} className={styles.compareRound}>
              <div className={styles.compareUserMessage}>
                <span className={styles.compareUserBubble}>
                  {round.userMessage}
                </span>
              </div>
              <div className={`${styles.compareResponses} ${gridColsClass}`}>
                {round.responses.map((response) => (
                  <CompareResponseCard
                    key={response.slotId}
                    response={response}
                    onStop={() => state.stopOne(response.slotId)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <footer className={styles.compareComposer}>
        <textarea
          className={styles.compareComposerInput}
          value={state.prompt}
          onChange={(e) => state.setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (state.canSend) void state.send();
            }
          }}
          placeholder={
            state.slots.every((s) => !s.modelId)
              ? t("playground.compare.placeholderNoModel")
              : state.anyRunning
                ? t("playground.compare.placeholderRunning")
                : t("playground.compare.placeholderReady")
          }
          rows={3}
          disabled={state.slots.every((s) => !s.modelId)}
        />
        <div className={styles.compareComposerFooter}>
          <span className={styles.compareHint}>
            {t("playground.composerHint")}
          </span>
          {state.anyRunning ? (
            <Button type="button" variant="ghost" onClick={state.stopAll}>
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <StopIcon size={14} />
                <span>{t("playground.compare.stopAll")}</span>
              </span>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => void state.send()}
              disabled={!state.canSend}
            >
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <SendIcon />
                <span>{t("playground.send")}</span>
              </span>
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
};

interface CompareResponseCardProps {
  response: CompareResponse;
  onStop: () => void;
}

const CompareResponseCard = ({ response, onStop }: CompareResponseCardProps) => {
  const { t } = useTranslation();
  return (
    <article className={styles.compareCard}>
      <header className={styles.compareCardHeader}>
        <span className={styles.compareCardName}>
          {response.vendor ? (
            <ProviderLogo vendor={response.vendor} size={14} />
          ) : null}
          <span>{response.modelName}</span>
        </span>
        <span className={styles.compareCardMeta}>
          <span
            className={styles.compareCardParams}
            title={t("playground.compare.cardParamsTooltip", {
              temperature: response.temperature,
              maxTokens: response.maxTokens,
            })}
          >
            T {response.temperature.toFixed(2)}
          </span>
          {response.isRunning ? (
            <span className={styles.compareCardRunning}>
              <span className={styles.compareCardPulse} />
              {t("playground.compare.running")}
            </span>
          ) : null}
          {!response.isRunning && response.latencyMs !== null ? (
            <span className={styles.compareCardLatency}>
              {response.latencyMs}ms
            </span>
          ) : null}
          {!response.isRunning && response.usage?.totalTokens ? (
            <span className={styles.compareCardTokens}>
              {response.usage.totalTokens} tok
            </span>
          ) : null}
        </span>
      </header>
      <div className={styles.compareCardBody}>
        {response.error ? (
          <div className={styles.compareCardError}>
            <AlertCircleIcon size={12} />
            <span>{response.error}</span>
          </div>
        ) : response.content ? (
          <Streamdown
            className={styles.compareCardMarkdown}
            parseIncompleteMarkdown
          >
            {response.content}
          </Streamdown>
        ) : response.isRunning ? (
          <span className={styles.compareCardWaiting}>
            {t("playground.compare.thinking")}
          </span>
        ) : (
          <span className={styles.compareCardWaiting}>—</span>
        )}
      </div>
      {response.isRunning ? (
        <button
          type="button"
          className={styles.compareCardStop}
          onClick={onStop}
        >
          <StopIcon size={11} />
          {t("playground.stop")}
        </button>
      ) : null}
    </article>
  );
};
