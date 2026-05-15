import type { ModelView, ProviderView } from "@real-demo/shared";
import { Button, Modal } from "@real-demo/ui";
import { useTranslation } from "react-i18next";

import { ModelFormConnectionStep } from "./model-form/ModelFormConnectionStep";
import { ModelFormModelStep } from "./model-form/ModelFormModelStep";
import { ModelFormParamsStep } from "./model-form/ModelFormParamsStep";
import { ModelFormProviderStep } from "./model-form/ModelFormProviderStep";
import { ModelFormVerifyStep } from "./model-form/ModelFormVerifyStep";
import { useModelFormDialogState } from "./model-form/useModelFormDialogState";
import styles from "./ModelsPage.module.css";

interface ModelFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  initial?: ModelView | null;
  providers: ProviderView[];
  onOpenChange: (open: boolean) => void;
  /**
   * Fired after a successful create/update so the parent page can refetch.
   * (The dialog performs the POST/PATCH itself via `useModelFormDialogState`
   * — there is no parent-supplied `onSubmit` because that would let two
   * different write paths drift apart.)
   */
  onProvidersChanged?: () => Promise<void> | void;
}

export const ModelFormDialog = ({
  open,
  mode,
  initial,
  providers,
  onOpenChange,
  onProvidersChanged,
}: ModelFormDialogProps) => {
  const { t } = useTranslation();
  const state = useModelFormDialogState({
    open,
    initial: mode === "edit" ? initial ?? null : null,
    providers,
    onOpenChange,
    onSuccess: () => void onProvidersChanged?.(),
  });

  const renderStep = () => {
    switch (state.step) {
      case "provider":
        return (
          <ModelFormProviderStep
            presets={state.presets}
            presetId={state.presetId}
            handlePresetPick={state.handlePresetPick}
          />
        );
      case "connection":
        return (
          <ModelFormConnectionStep
            isEdit={state.isEdit}
            presetId={state.presetId}
            presets={state.presets}
            existingProvider={state.existingProvider}
            baseUrl={state.baseUrl}
            setBaseUrl={state.setBaseUrl}
            apiKey={state.apiKey}
            setApiKey={state.setApiKey}
            showApiKey={state.showApiKey}
            setShowApiKey={state.setShowApiKey}
            testing={state.testing}
            testResult={state.testResult}
            handleTestConnection={state.handleTestConnection}
          />
        );
      case "model":
        return (
          <ModelFormModelStep
            isEdit={state.isEdit}
            modelSelectMode={state.modelSelectMode}
            setModelSelectMode={state.setModelSelectMode}
            availableModels={state.availableModels}
            loadingModels={state.loadingModels}
            discoverError={state.discoverError}
            fetchAvailableModels={state.fetchAvailableModels}
            selectedModelIds={state.selectedModelIds}
            toggleModelSelection={state.toggleModelSelection}
            selectAllFiltered={state.selectAllFiltered}
            clearSelection={state.clearSelection}
            manualModelId={state.manualModelId}
            setManualModelId={state.setManualModelId}
            modelSearch={state.modelSearch}
            setModelSearch={state.setModelSearch}
            filteredModels={state.filteredModels}
            modelKey={state.modelKey}
            setModelKey={state.setModelKey}
            name={state.name}
            setName={state.setName}
          />
        );
      case "params":
        return (
          <ModelFormParamsStep
            temperature={state.temperature}
            setTemperature={state.setTemperature}
            maxTokens={state.maxTokens}
            setMaxTokens={state.setMaxTokens}
            capabilities={state.capabilities}
            setCapabilities={state.setCapabilities}
            enabled={state.enabled}
            setEnabled={state.setEnabled}
            description={state.description}
            setDescription={state.setDescription}
            selectedModelIds={state.selectedModelIds}
            isEdit={state.isEdit}
          />
        );
      case "verify":
        return (
          <ModelFormVerifyStep
            createdModels={state.createdModels}
            verifying={state.verifying}
            verifyResults={state.verifyResults}
            handleVerifyAll={state.handleVerifyAll}
          />
        );
    }
  };

  const totalSteps = state.wizardSteps.length + (state.isEdit ? 0 : 1); // include verify for create
  const filledSteps = state.isVerifyStep
    ? totalSteps
    : state.currentStepIndex + 1;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (state.submitting) return;
        onOpenChange(next);
      }}
      title={
        state.isEdit
          ? t("admin.models.editModel")
          : state.isVerifyStep
            ? t("admin.models.wizard.verify.title")
            : t("admin.models.addModel")
      }
      closeLabel={t("admin.users.closeForm")}
    >
      <div className={styles.wizardShell}>
        <div className={styles.wizardProgress}>
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <span
              key={idx}
              className={`${styles.wizardProgressBar} ${
                idx < filledSteps ? styles.wizardProgressBarFilled : ""
              }`}
            />
          ))}
        </div>

        <div className={styles.wizardStepDescription}>
          {state.isVerifyStep
            ? t("admin.models.wizard.verify.description")
            : t(`admin.models.wizard.${state.step}.description`)}
        </div>

        <div className={styles.wizardBody}>{renderStep()}</div>

        {state.submitError ? (
          <p className={styles.formError} role="alert">
            {state.submitError}
          </p>
        ) : null}

        <div className={styles.wizardFooter}>
          {state.isVerifyStep ? (
            <Button type="button" onClick={state.handleFinish}>
              {t("admin.models.wizard.verify.finish")}
            </Button>
          ) : (
            <>
              {!state.isFirstStep ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={state.handlePrev}
                  disabled={state.submitting}
                >
                  {t("admin.models.wizard.prev")}
                </Button>
              ) : null}
              <div className={styles.wizardFooterSpacer} />
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={state.submitting}
              >
                {t("common.cancel")}
              </Button>
              {state.isLastStep ? (
                <Button
                  type="button"
                  onClick={() => void state.handleSubmit()}
                  disabled={state.submitting || !state.canProceed}
                >
                  {state.submitting
                    ? t("common.saving")
                    : !state.isEdit && state.selectedModelIds.length > 1
                      ? t("admin.models.wizard.submitBatch", {
                          count: state.selectedModelIds.length,
                        })
                      : t("common.save")}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={state.handleNext}
                  disabled={!state.canProceed}
                >
                  {t("admin.models.wizard.next")}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
