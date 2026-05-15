import type {
  CreateProviderInput,
  DiscoverModelItem,
  ModelCapabilities,
  ModelView,
  ProviderPreset,
  ProviderType,
  ProviderVendor,
  ProviderView,
  UpdateProviderInput,
  VerifyModelResult,
} from "@real-demo/shared";
import { PROVIDER_PRESETS } from "@real-demo/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createModel,
  updateModel,
  verifyModel,
} from "../../../shared/api/models";
import {
  createProvider,
  discoverModels,
  updateProvider,
} from "../../../shared/api/providers";

export type WizardStep = "provider" | "connection" | "model" | "params" | "verify";

export const CREATE_STEPS: WizardStep[] = [
  "provider",
  "connection",
  "model",
  "params",
];
export const EDIT_STEPS: WizardStep[] = ["connection", "model", "params"];

const DEFAULT_CAPABILITIES: ModelCapabilities = {
  vision: false,
  tools: false,
  json: false,
  reasoning: false,
  streaming: true,
};

const slugify = (input: string): string =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9-_.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

interface CreatedModelMarker {
  modelKey: string;
  modelIdent: string;
}

type VerifyResultExt = VerifyModelResult;

export interface UseModelFormDialogStateOptions {
  open: boolean;
  initial: ModelView | null;
  providers: ProviderView[];
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function useModelFormDialogState({
  open,
  initial,
  providers,
  onOpenChange,
  onSuccess,
}: UseModelFormDialogStateOptions) {
  const isEdit = Boolean(initial);
  const wizardSteps = isEdit ? EDIT_STEPS : CREATE_STEPS;

  // --- Step
  const [step, setStep] = useState<WizardStep>(wizardSteps[0]!);

  // --- Provider (create) / existing provider id (edit)
  const [presetId, setPresetId] = useState<string | null>(null);
  const [providerKey, setProviderKey] = useState("");
  const [providerName, setProviderName] = useState("");
  const [providerType, setProviderType] = useState<ProviderType>(
    "openai-compatible",
  );
  const [providerVendor, setProviderVendor] = useState<ProviderVendor>("custom");

  // --- Connection
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs: number;
    message: string | null;
  } | null>(null);

  // --- Model
  const [modelSelectMode, setModelSelectMode] = useState<"list" | "manual">(
    "list",
  );
  const [availableModels, setAvailableModels] = useState<DiscoverModelItem[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [manualModelId, setManualModelId] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const [modelKey, setModelKey] = useState(""); // slug
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // --- Params
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(65536);
  const [capabilities, setCapabilities] = useState<ModelCapabilities>({
    ...DEFAULT_CAPABILITIES,
  });
  const [enabled, setEnabled] = useState(true);

  // --- Submission / verify
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdModels, setCreatedModels] = useState<CreatedModelMarker[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [verifyResults, setVerifyResults] = useState<
    Record<string, VerifyResultExt>
  >({});

  // Reset all state whenever the dialog opens
  const initRef = useRef(false);
  useEffect(() => {
    if (!open) {
      initRef.current = false;
      return;
    }
    if (initRef.current) return;
    initRef.current = true;
    setStep(wizardSteps[0]!);
    setSubmitting(false);
    setSubmitError(null);
    setCreatedModels([]);
    setVerifyResults({});
    setTesting(false);
    setTestResult(null);
    setDiscoverError(null);
    setAvailableModels([]);
    setSelectedModelIds([]);
    setManualModelId("");
    setModelSearch("");
    setShowApiKey(false);
    if (initial) {
      setPresetId(null);
      setProviderKey(initial.provider.id);
      setProviderName(initial.provider.name);
      setProviderType(initial.provider.type);
      setProviderVendor(initial.provider.vendor);
      setBaseUrl(initial.provider.baseUrl);
      setApiKey("");
      setModelSelectMode("manual");
      setManualModelId(initial.model);
      setModelKey(initial.id);
      setName(initial.name);
      setDescription(initial.description);
      setTemperature(initial.temperature);
      setMaxTokens(initial.maxTokens);
      setCapabilities(initial.capabilities);
      setEnabled(initial.enabled);
    } else {
      setPresetId(null);
      setProviderKey("");
      setProviderName("");
      setProviderType("openai-compatible");
      setProviderVendor("custom");
      setBaseUrl("");
      setApiKey("");
      setModelSelectMode("list");
      setModelKey("");
      setName("");
      setDescription("");
      setTemperature(0.7);
      setMaxTokens(65536);
      setCapabilities({ ...DEFAULT_CAPABILITIES });
      setEnabled(true);
    }
  }, [open, initial, wizardSteps]);

  const handlePresetPick = useCallback((preset: ProviderPreset) => {
    setPresetId(preset.id);
    setProviderKey(preset.id);
    setProviderName(preset.name);
    setProviderType(preset.type);
    setProviderVendor(preset.vendor);
    setBaseUrl(preset.baseUrl);
    setTestResult(null);
    setAvailableModels([]);
    setSelectedModelIds([]);
  }, []);

  // --- Test connection
  const handleTestConnection = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    const start = Date.now();
    try {
      const trimmedBaseUrl = baseUrl.trim();
      const trimmedApiKey = apiKey.trim();
      const baseUrlChanged =
        isEdit && initial
          ? trimmedBaseUrl !== initial.provider.baseUrl.trim()
          : false;

      if (isEdit && trimmedApiKey.length === 0) {
        if (baseUrlChanged) {
          setTestResult({
            success: false,
            latencyMs: Date.now() - start,
            message: "admin.models.wizard.connection.testNeedsKeyForChangedUrl",
          });
          return;
        }
        await discoverModels({ providerId: providerKey });
      } else {
        await discoverModels({
          type: providerType,
          baseUrl: trimmedBaseUrl,
          apiKey: trimmedApiKey,
        });
      }
      setTestResult({ success: true, latencyMs: Date.now() - start, message: null });
    } catch (err) {
      setTestResult({
        success: false,
        latencyMs: Date.now() - start,
        message: err instanceof Error ? err.message : "Connection failed",
      });
    } finally {
      setTesting(false);
    }
  }, [isEdit, initial, baseUrl, apiKey, providerKey, providerType]);

  // --- Fetch available models for the list tab
  const fetchAvailableModels = useCallback(async () => {
    setLoadingModels(true);
    setDiscoverError(null);
    try {
      const trimmedBaseUrl = baseUrl.trim();
      const trimmedApiKey = apiKey.trim();
      const baseUrlChanged =
        isEdit && initial
          ? trimmedBaseUrl !== initial.provider.baseUrl.trim()
          : false;

      if (isEdit && baseUrlChanged && trimmedApiKey.length === 0) {
        setDiscoverError(
          "admin.models.wizard.connection.discoverNeedsKeyForChangedUrl",
        );
        setAvailableModels([]);
        return;
      }

      const result =
        isEdit && trimmedApiKey.length === 0
          ? await discoverModels({ providerId: providerKey })
          : await discoverModels({
              type: providerType,
              baseUrl: trimmedBaseUrl,
              apiKey: trimmedApiKey,
            });
      setAvailableModels(result.models);
    } catch (err) {
      setDiscoverError(err instanceof Error ? err.message : "Failed to fetch");
      setAvailableModels([]);
    } finally {
      setLoadingModels(false);
    }
  }, [isEdit, initial, providerKey, providerType, baseUrl, apiKey]);

  const toggleModelSelection = useCallback((id: string) => {
    setSelectedModelIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  }, []);

  const selectAllFiltered = useCallback((ids: string[]) => {
    setSelectedModelIds(ids);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedModelIds([]);
    setManualModelId("");
  }, []);

  const filteredModels = useMemo(() => {
    const q = modelSearch.trim().toLowerCase();
    if (!q) return availableModels;
    return availableModels.filter((m) =>
      `${m.id} ${m.label ?? ""}`.toLowerCase().includes(q),
    );
  }, [availableModels, modelSearch]);

  // --- Next step gating
  const canProceed = useMemo(() => {
    switch (step) {
      case "provider":
        return Boolean(presetId);
      case "connection":
        if (isEdit) return baseUrl.trim().length > 0;
        return baseUrl.trim().length > 0 && apiKey.trim().length > 0;
      case "model":
        if (modelSelectMode === "list") {
          return selectedModelIds.length > 0;
        }
        return manualModelId.trim().length > 0;
      case "params":
        return true;
      default:
        return false;
    }
  }, [
    step,
    presetId,
    isEdit,
    baseUrl,
    apiKey,
    modelSelectMode,
    selectedModelIds.length,
    manualModelId,
  ]);

  const currentStepIndex = wizardSteps.indexOf(step);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === wizardSteps.length - 1;
  const isVerifyStep = step === "verify";

  const handleNext = useCallback(() => {
    const next = wizardSteps[currentStepIndex + 1];
    if (next) setStep(next);
  }, [wizardSteps, currentStepIndex]);

  const handlePrev = useCallback(() => {
    const prev = wizardSteps[currentStepIndex - 1];
    if (prev) setStep(prev);
  }, [wizardSteps, currentStepIndex]);

  // --- Upsert provider (create mode only)
  //
  // If the targeted providerKey already exists, fall back to PATCHing only
  // when the existing row is one the operator can see — i.e. it's already in
  // the `providers` snapshot this dialog received from the page. Otherwise
  // a malicious / sleep-deprived admin could collide with a key owned by a
  // different team and silently rewrite that team's upstream credentials.
  const upsertProvider = useCallback(async (): Promise<string> => {
    const key = providerKey || slugify(providerName || "custom");
    const payload: CreateProviderInput = {
      id: key,
      name: providerName || key,
      type: providerType,
      vendor: providerVendor,
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
    };
    try {
      await createProvider(payload);
      return key;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      const conflict = /already exists/i.test(msg) || /conflict/i.test(msg);
      if (!conflict) {
        throw err;
      }
      const known = providers.some((p) => p.id === key);
      if (!known) {
        // Surface a user-actionable error instead of silently overwriting a
        // provider this dialog doesn't even know about. The form caller
        // should advise the operator to pick the existing entry from the
        // providers list and switch to Edit mode.
        throw new Error("admin.providers.error.conflictRequiresEdit", {
          cause: err,
        });
      }
      await updateProvider(key, {
        name: payload.name,
        type: payload.type,
        vendor: payload.vendor,
        baseUrl: payload.baseUrl,
        apiKey: payload.apiKey,
      });
      return key;
    }
  }, [
    providerKey,
    providerName,
    providerType,
    providerVendor,
    baseUrl,
    apiKey,
    providers,
  ]);

  // --- Submit: create / update model(s)
  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      let resolvedProviderKey = providerKey;
      if (!isEdit) {
        resolvedProviderKey = await upsertProvider();
      }

      const idsToCreate =
        modelSelectMode === "list" && !isEdit
          ? selectedModelIds
          : [manualModelId.trim()];

      const created: CreatedModelMarker[] = [];

      if (isEdit && initial) {
        const providerPatch: UpdateProviderInput = {};
        const trimmedBaseUrl = baseUrl.trim();
        const trimmedApiKey = apiKey.trim();

        if (trimmedBaseUrl !== initial.provider.baseUrl.trim()) {
          providerPatch.baseUrl = trimmedBaseUrl;
        }
        if (trimmedApiKey.length > 0) {
          providerPatch.apiKey = trimmedApiKey;
        }
        if (Object.keys(providerPatch).length > 0) {
          await updateProvider(initial.provider.id, providerPatch);
        }

        await updateModel(initial.id, {
          name: name.trim() || initial.name,
          model: manualModelId.trim() || initial.model,
          description: description.trim(),
          capabilities,
          enabled,
          temperature,
          maxTokens,
        });
        created.push({ modelKey: initial.id, modelIdent: manualModelId.trim() || initial.model });
      } else {
        for (const ident of idsToCreate) {
          // For batch create: derive a per-model slug from the upstream ident.
          // For single create: prefer user-typed name → slug, fallback to ident slug.
          const slug =
            idsToCreate.length === 1
              ? slugify(modelKey || name || ident)
              : slugify(`${resolvedProviderKey}-${ident}`);
          const displayName =
            idsToCreate.length === 1
              ? (name.trim() || ident)
              : ident;
          await createModel({
            id: slug,
            name: displayName,
            providerId: resolvedProviderKey,
            model: ident,
            description: description.trim(),
            capabilities,
            enabled,
            temperature,
            maxTokens,
          });
          created.push({ modelKey: slug, modelIdent: ident });
        }
      }

      setCreatedModels(created);
      onSuccess();
      if (isEdit) {
        onOpenChange(false);
      } else {
        // Move to verify step
        setStep("verify");
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }, [
    providerKey,
    isEdit,
    upsertProvider,
    modelSelectMode,
    selectedModelIds,
    manualModelId,
    initial,
    name,
    baseUrl,
    apiKey,
    description,
    capabilities,
    enabled,
    temperature,
    maxTokens,
    modelKey,
    onOpenChange,
    onSuccess,
  ]);

  // --- Verify (post-creation)
  const handleVerifyAll = useCallback(async () => {
    setVerifying(true);
    try {
      for (const created of createdModels) {
        try {
          const result = await verifyModel(created.modelKey);
          setVerifyResults((prev) => ({ ...prev, [created.modelKey]: result }));
        } catch (err) {
          setVerifyResults((prev) => ({
            ...prev,
            [created.modelKey]: {
              success: false,
              latencyMs: 0,
              message: err instanceof Error ? err.message : "Verify failed",
            },
          }));
        }
      }
    } finally {
      setVerifying(false);
    }
  }, [createdModels]);

  const handleFinish = useCallback(() => onOpenChange(false), [onOpenChange]);

  return {
    // step machinery
    step,
    setStep,
    wizardSteps,
    currentStepIndex,
    isFirstStep,
    isLastStep,
    isVerifyStep,
    isEdit,
    canProceed,
    handleNext,
    handlePrev,
    // provider
    presetId,
    handlePresetPick,
    providerName,
    presets: PROVIDER_PRESETS,
    existingProvider:
      providers.find((p) => p.id === providerKey) ?? null,
    // connection
    baseUrl,
    setBaseUrl,
    apiKey,
    setApiKey,
    showApiKey,
    setShowApiKey,
    testing,
    testResult,
    handleTestConnection,
    // model
    modelSelectMode,
    setModelSelectMode,
    availableModels,
    loadingModels,
    discoverError,
    fetchAvailableModels,
    selectedModelIds,
    toggleModelSelection,
    selectAllFiltered,
    clearSelection,
    manualModelId,
    setManualModelId,
    modelSearch,
    setModelSearch,
    filteredModels,
    modelKey,
    setModelKey,
    name,
    setName,
    description,
    setDescription,
    // params
    temperature,
    setTemperature,
    maxTokens,
    setMaxTokens,
    capabilities,
    setCapabilities,
    enabled,
    setEnabled,
    // submission
    submitting,
    submitError,
    handleSubmit,
    // verify
    createdModels,
    verifying,
    verifyResults,
    handleVerifyAll,
    handleFinish,
  };
}

export type ModelFormDialogState = ReturnType<typeof useModelFormDialogState>;
