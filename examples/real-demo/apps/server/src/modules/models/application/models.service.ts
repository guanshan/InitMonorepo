import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type {
  CreateModelDefInput,
  DiscoverModelItem,
  DiscoverModelsInput,
  DiscoverModelsResult,
  ModelListQuery,
  ModelView,
  ProviderType,
  ProviderView,
  UpdateModelDefInput,
  VerifyModelResult,
} from "@real-demo/shared";
import {
  generateText,
  streamText,
  type ModelMessage,
  type StreamTextResult,
  type ToolSet,
} from "ai";

import {
  SAFE_URL_FORBIDDEN_HOST,
  SAFE_URL_INVALID,
  validateResolvedUpstreamHost,
  validateUpstreamUrl,
} from "../../../common/security/safe-url";
import {
  MODELS_REPOSITORY_PORT,
  type ModelRecord,
  type ModelsRepositoryPort,
} from "./models.repository.port";
import {
  PROVIDERS_REPOSITORY_PORT,
  type ProviderRecord,
  type ProvidersRepositoryPort,
} from "./providers.repository.port";
import { ProviderResolver } from "./provider-resolver";
import { redactSecrets } from "./secret-redaction";

const VERIFY_TIMEOUT_MS = 15_000;
const DISCOVER_TIMEOUT_MS = 15_000;
const DISCOVER_MAX_REDIRECTS = 5;
// Hard cap on parsed upstream entries before dedup/sort. Real OpenAI-shaped
// `/v1/models` responses are well under a hundred rows; anything bigger is
// almost certainly a buggy or hostile provider, and the per-row work
// (dedup + final `.sort`) is O(n log n) memory and CPU we don't want to eat.
const DISCOVER_MAX_ITEMS = 500;

const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 65536;

const stripTrailingSlash = (value: string) => value.replace(/\/+$/g, "");

const summarizeError = (err: unknown, fallback: string): string => {
  const raw = err instanceof Error ? err.message || fallback : fallback;
  return redactSecrets(raw);
};

const assertSafeUpstreamUrl = (baseUrl: string): void => {
  const result = validateUpstreamUrl(baseUrl);
  if (result.ok) return;
  if (result.reason === SAFE_URL_FORBIDDEN_HOST) {
    throw new BadRequestException(SAFE_URL_FORBIDDEN_HOST);
  }
  throw new BadRequestException(result.reason ?? SAFE_URL_INVALID);
};

/**
 * DNS-aware check fired immediately before every outbound provider fetch.
 * Stored providers passed the syntactic check on the way in, but the host
 * may have been re-pointed at a forbidden range since then — re-resolve.
 */
const assertResolvedUpstreamHost = async (baseUrl: string): Promise<void> => {
  const result = await validateResolvedUpstreamHost(baseUrl);
  if (result.ok) return;
  if (result.reason === SAFE_URL_FORBIDDEN_HOST) {
    throw new BadRequestException(SAFE_URL_FORBIDDEN_HOST);
  }
  throw new BadRequestException(result.reason ?? SAFE_URL_INVALID);
};

const buildModelsEndpoint = (baseUrl: string): string => {
  const normalized = stripTrailingSlash(baseUrl);
  if (/\/models$/.test(normalized)) return normalized;
  if (/\/v\d+\/?$/.test(normalized) || /\/paas\/v\d+\/?$/.test(normalized)) {
    return `${normalized}/models`;
  }
  return `${normalized}/v1/models`;
};

const discoverHeaders = (
  type: ProviderType,
  apiKey: string,
): Record<string, string> => {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (type === "anthropic") {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
};

const parseUpstreamModelList = (payload: unknown): DiscoverModelItem[] => {
  if (typeof payload !== "object" || payload === null) return [];
  const record = payload as Record<string, unknown>;
  const list = Array.isArray(record.data)
    ? (record.data as unknown[])
    : Array.isArray(record.models)
      ? (record.models as unknown[])
      : Array.isArray(record.result)
        ? (record.result as unknown[])
        : [];
  const seen = new Set<string>();
  const items: DiscoverModelItem[] = [];
  // Bound the input to the first N entries before iterating: a hostile or
  // broken upstream could otherwise force us to walk and sort an arbitrarily
  // large array.
  const bounded = list.slice(0, DISCOVER_MAX_ITEMS);
  for (const entry of bounded) {
    if (typeof entry === "string") {
      if (seen.has(entry)) continue;
      seen.add(entry);
      items.push({ id: entry, label: null });
      continue;
    }
    if (typeof entry !== "object" || entry === null) continue;
    const obj = entry as Record<string, unknown>;
    const id =
      typeof obj.id === "string"
        ? obj.id
        : typeof obj.name === "string"
          ? obj.name
          : typeof obj.model === "string"
            ? obj.model
            : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const display =
      typeof obj.display_name === "string"
        ? obj.display_name
        : typeof obj.label === "string"
          ? obj.label
          : null;
    items.push({ id, label: display && display !== id ? display : null });
  }
  items.sort((a, b) => a.id.localeCompare(b.id));
  return items;
};

const providerToView = (record: ProviderRecord): ProviderView => ({
  id: record.id,
  name: record.name,
  type: record.type,
  vendor: record.vendor,
  baseUrl: record.baseUrl,
  apiKeyPreview: record.apiKeyPreview,
  hasKey: record.apiKey.length > 0,
  lastVerifiedAt: record.lastVerifiedAt,
  lastError: record.lastError,
});

interface EffectiveParams {
  temperature: number;
  maxTokens: number;
}

const effectiveParams = (record: ModelRecord): EffectiveParams => ({
  temperature: record.temperature ?? DEFAULT_TEMPERATURE,
  maxTokens: record.maxTokens ?? DEFAULT_MAX_TOKENS,
});

@Injectable()
export class ModelsService {
  private readonly logger = new Logger(ModelsService.name);

  constructor(
    @Inject(MODELS_REPOSITORY_PORT)
    private readonly modelsRepo: ModelsRepositoryPort,
    @Inject(PROVIDERS_REPOSITORY_PORT)
    private readonly providersRepo: ProvidersRepositoryPort,
    @Inject(ProviderResolver) private readonly resolver: ProviderResolver,
  ) {}

  /* --------------------------- view assembly --------------------------- */

  private toModelView(
    record: ModelRecord,
    provider: ProviderRecord,
  ): ModelView {
    const effective = effectiveParams(record);
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      model: record.model,
      enabled: record.enabled,
      capabilities: record.capabilities,
      temperature: effective.temperature,
      maxTokens: effective.maxTokens,
      provider: providerToView(provider),
      lastVerifiedAt: record.lastVerifiedAt,
      lastError: record.lastError,
    };
  }

  /* --------------------------- CRUD ------------------------------------ */

  async list(query: ModelListQuery): Promise<ModelView[]> {
    const search = query.search?.toLowerCase().trim();
    const records = await this.modelsRepo.findAll();
    const filtered = records.filter((m) => {
      if (query.providerId && m.providerId !== query.providerId) return false;
      if (query.enabled !== undefined && m.enabled !== query.enabled) return false;
      if (search) {
        const haystack = `${m.id} ${m.name} ${m.model} ${m.description}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
    // Fetch every distinct provider once instead of per-row. Each lookup runs
    // an AES-GCM decrypt, so this collapses N decrypts to P (≤ provider count).
    const providerIds = [...new Set(filtered.map((m) => m.providerId))];
    const providers = await Promise.all(
      providerIds.map((id) => this.providersRepo.findByKey(id)),
    );
    const providerById = new Map<string, ProviderRecord>();
    for (const provider of providers) {
      if (provider) providerById.set(provider.id, provider);
    }
    return filtered.flatMap((record) => {
      const provider = providerById.get(record.providerId);
      if (!provider) {
        // Silently drop orphans; getting here means a FK invariant was broken
        // outside of Prisma's reach. Don't 500 the whole list.
        this.logger.warn(
          `Model "${record.id}" references missing provider "${record.providerId}"; omitting from list.`,
        );
        return [];
      }
      return [this.toModelView(record, provider)];
    });
  }

  async get(modelId: string): Promise<ModelView> {
    const record = await this.modelsRepo.findByKey(modelId);
    if (!record) throw new NotFoundException(`Model "${modelId}" not found.`);
    return this.resolveModelView(record);
  }

  async create(input: CreateModelDefInput): Promise<ModelView> {
    const record = await this.modelsRepo.create(input);
    return this.resolveModelView(record);
  }

  async update(
    modelId: string,
    input: UpdateModelDefInput,
  ): Promise<ModelView> {
    const record = await this.modelsRepo.update(modelId, {
      name: input.name,
      providerId: input.providerId,
      model: input.model,
      description: input.description,
      capabilities: input.capabilities,
      enabled: input.enabled,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
    });
    // Any change to a field that affects which upstream we hit (provider or
    // model identifier) invalidates the cached verification. Otherwise the UI
    // would still show the previous healthy/error status against the new
    // target — see ProvidersService.update for the same reasoning.
    const connectivityChanged =
      input.providerId !== undefined || input.model !== undefined;
    if (connectivityChanged) {
      await this.modelsRepo.setVerification(modelId, {
        lastVerifiedAt: null,
        lastError: null,
      });
      return this.resolveModelView({
        ...record,
        lastVerifiedAt: null,
        lastError: null,
      });
    }
    return this.resolveModelView(record);
  }

  async delete(modelId: string): Promise<void> {
    await this.modelsRepo.delete(modelId);
  }

  private async resolveModelView(record: ModelRecord): Promise<ModelView> {
    const provider = await this.providersRepo.findByKey(record.providerId);
    if (!provider) {
      throw new NotFoundException(
        `Provider "${record.providerId}" not found for model "${record.id}".`,
      );
    }
    return this.toModelView(record, provider);
  }

  /* --------------------------- verify ---------------------------------- */

  async verify(modelId: string): Promise<VerifyModelResult> {
    const record = await this.modelsRepo.findByKey(modelId);
    if (!record) throw new NotFoundException(`Model "${modelId}" not found.`);
    const provider = await this.providersRepo.findByKey(record.providerId);
    if (!provider) {
      throw new NotFoundException(
        `Provider "${record.providerId}" not found for model "${modelId}".`,
      );
    }
    // Re-check the stored baseUrl. The ingress validator ran at write time,
    // but the hostname may have been re-pointed since then.
    await assertResolvedUpstreamHost(provider.baseUrl);

    const startedAt = Date.now();
    const languageModel = this.resolver.build(provider, record.model);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
    try {
      await generateText({
        model: languageModel,
        messages: [{ role: "user", content: "ping" }],
        maxOutputTokens: 8,
        abortSignal: controller.signal,
      });
      const latencyMs = Date.now() - startedAt;
      await this.modelsRepo.setVerification(modelId, {
        lastVerifiedAt: new Date().toISOString(),
        lastError: null,
      });
      return { success: true, latencyMs, message: null };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const message = summarizeError(error, "Verification failed");
      // Keep the truncated, *redacted* message on the row so the UI/list shows
      // it, but log the full error (also redacted) at warn so operators can
      // dig through Pino output without having to query the DB.
      this.logger.warn(
        { modelId, latencyMs, error: redactSecrets(String(error)) },
        "Model verification failed",
      );
      await this.modelsRepo.setVerification(modelId, {
        lastVerifiedAt: new Date().toISOString(),
        lastError: message.slice(0, 500),
      });
      return { success: false, latencyMs, message };
    } finally {
      clearTimeout(timer);
    }
  }

  /* --------------------------- discover -------------------------------- */

  async discoverModels(
    input: DiscoverModelsInput,
  ): Promise<DiscoverModelsResult> {
    const { type, baseUrl, apiKey } = await this.resolveDiscoverCreds(input);
    assertSafeUpstreamUrl(baseUrl);
    await assertResolvedUpstreamHost(baseUrl);

    const endpoint = buildModelsEndpoint(baseUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DISCOVER_TIMEOUT_MS);
    const startedAt = Date.now();

    try {
      let response: Response;
      try {
        response = await this.fetchUpstreamWithSafeRedirects(endpoint, {
          method: "GET",
          headers: discoverHeaders(type, apiKey),
          signal: controller.signal,
        });
      } catch (error) {
        if (error instanceof BadRequestException) throw error;
        throw new ServiceUnavailableException(
          summarizeError(error, "Failed to reach the provider."),
        );
      }

      // Body reads must stay inside the same `try` so the abort timer keeps
      // firing if the upstream sent headers but stalls on the body. Clearing
      // the timer at header time would let a malicious or broken provider
      // hold the request open indefinitely past the 15s budget.
      const latencyMs = Date.now() - startedAt;
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new ServiceUnavailableException(
          `Upstream returned HTTP ${response.status}${
            text ? ` — ${redactSecrets(text).slice(0, 200)}` : ""
          }`,
        );
      }

      const payload = (await response.json().catch(() => null)) as unknown;
      return { models: parseUpstreamModelList(payload), latencyMs };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * `fetch` with manual redirect handling so the SSRF host check runs against
   * every hop. Default redirect-follow would let an upstream that passed the
   * initial validation 302 us straight at metadata.google.internal — see
   * `validateUpstreamUrl`. Headers (including the API key) are dropped on
   * cross-origin hops so a malicious-but-syntactically-valid redirect target
   * can't lift credentials it wouldn't otherwise see.
   */
  private async fetchUpstreamWithSafeRedirects(
    initialUrl: string,
    init: {
      method: string;
      headers: Record<string, string>;
      signal: AbortSignal;
    },
  ): Promise<Response> {
    let currentUrl = initialUrl;
    let headers = init.headers;
    let response = await fetch(currentUrl, {
      method: init.method,
      headers,
      redirect: "manual",
      signal: init.signal,
    });
    for (let hop = 0; hop < DISCOVER_MAX_REDIRECTS; hop++) {
      if (response.status < 300 || response.status >= 400) return response;
      if (response.status === 304) return response;
      const location = response.headers.get("location");
      if (!location) return response;

      let nextUrl: string;
      try {
        nextUrl = new URL(location, currentUrl).toString();
      } catch {
        throw new ServiceUnavailableException(
          "Upstream returned an invalid redirect location.",
        );
      }
      assertSafeUpstreamUrl(nextUrl);
      await assertResolvedUpstreamHost(nextUrl);

      const currentOrigin = new URL(currentUrl).origin;
      const nextOrigin = new URL(nextUrl).origin;
      if (nextOrigin !== currentOrigin) {
        // Strip credential-bearing headers on origin change. Keep Accept so
        // the next host still serves JSON.
        const stripped: Record<string, string> = {};
        for (const [k, v] of Object.entries(headers)) {
          if (k.toLowerCase() === "authorization") continue;
          if (k.toLowerCase() === "x-api-key") continue;
          stripped[k] = v;
        }
        headers = stripped;
      }

      currentUrl = nextUrl;
      response = await fetch(currentUrl, {
        method: init.method,
        headers,
        redirect: "manual",
        signal: init.signal,
      });
    }
    throw new ServiceUnavailableException(
      "Upstream redirected too many times.",
    );
  }

  private async resolveDiscoverCreds(input: DiscoverModelsInput): Promise<{
    type: ProviderType;
    baseUrl: string;
    apiKey: string;
  }> {
    if (input.modelId) {
      const model = await this.modelsRepo.findByKey(input.modelId);
      if (!model) {
        throw new NotFoundException(`Model "${input.modelId}" not found.`);
      }
      const provider = await this.providersRepo.findByKey(model.providerId);
      if (!provider) {
        throw new NotFoundException(
          `Provider for model "${input.modelId}" not found.`,
        );
      }
      if (!provider.apiKey) {
        throw new ServiceUnavailableException(
          `API key for provider "${provider.id}" is unavailable.`,
        );
      }
      return { type: provider.type, baseUrl: provider.baseUrl, apiKey: provider.apiKey };
    }
    if (input.providerId) {
      const provider = await this.providersRepo.findByKey(input.providerId);
      if (!provider) {
        throw new NotFoundException(
          `Provider "${input.providerId}" not found.`,
        );
      }
      if (!provider.apiKey) {
        throw new ServiceUnavailableException(
          `API key for provider "${provider.id}" is unavailable.`,
        );
      }
      return { type: provider.type, baseUrl: provider.baseUrl, apiKey: provider.apiKey };
    }
    if (input.type && input.baseUrl && input.apiKey) {
      // Ad-hoc credentials skip the provider table entirely; apply the
      // ingress check here so a bad baseUrl never reaches the resolved-host
      // check below.
      assertSafeUpstreamUrl(input.baseUrl);
      return {
        type: input.type,
        baseUrl: input.baseUrl,
        apiKey: input.apiKey,
      };
    }
    throw new BadRequestException(
      "Provide a modelId, a providerId, or a (type + baseUrl + apiKey) triple.",
    );
  }

  /* --------------------------- chat ------------------------------------ */

  async runChatStream(input: {
    modelId: string;
    messages: ModelMessage[];
    system?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stop?: string[];
  }): Promise<StreamTextResult<ToolSet, never>> {
    const { record, provider, effective } = await this.loadChatTargets(
      input.modelId,
    );
    const model = this.resolver.build(provider, record.model);
    return streamText({
      model,
      system: input.system,
      messages: input.messages,
      temperature: input.temperature ?? effective.temperature,
      maxOutputTokens: input.maxTokens ?? effective.maxTokens,
      topP: input.topP,
      frequencyPenalty: input.frequencyPenalty,
      presencePenalty: input.presencePenalty,
      stopSequences: input.stop,
    });
  }

  async runChat(input: {
    modelId: string;
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stop?: string[];
  }) {
    const { record, provider, effective } = await this.loadChatTargets(
      input.modelId,
    );
    const model = this.resolver.build(provider, record.model);
    const startedAt = Date.now();
    try {
      const result = await generateText({
        model,
        messages: input.messages,
        temperature: input.temperature ?? effective.temperature,
        maxOutputTokens: input.maxTokens ?? effective.maxTokens,
        topP: input.topP,
        frequencyPenalty: input.frequencyPenalty,
        presencePenalty: input.presencePenalty,
        stopSequences: input.stop,
      });
      const latencyMs = Date.now() - startedAt;
      const usage = result.usage;
      return {
        content: result.text,
        latencyMs,
        usage: usage
          ? {
              promptTokens: usage.inputTokens ?? null,
              completionTokens: usage.outputTokens ?? null,
              totalTokens: usage.totalTokens ?? null,
            }
          : null,
      };
    } catch (error) {
      throw new ServiceUnavailableException(
        summarizeError(error, "Upstream request failed."),
      );
    }
  }

  private async loadChatTargets(modelId: string): Promise<{
    record: ModelRecord;
    provider: ProviderRecord;
    effective: EffectiveParams;
  }> {
    const record = await this.modelsRepo.findByKey(modelId);
    if (!record) throw new NotFoundException(`Model "${modelId}" not found.`);
    if (!record.enabled) {
      throw new ServiceUnavailableException(`Model "${modelId}" is disabled.`);
    }
    const provider = await this.providersRepo.findByKey(record.providerId);
    if (!provider) {
      throw new NotFoundException(
        `Provider "${record.providerId}" not found for model "${modelId}".`,
      );
    }
    if (!provider.apiKey) {
      throw new ServiceUnavailableException(
        `API key for provider "${provider.id}" is unavailable.`,
      );
    }
    // SSRF re-check before any outbound chat / stream request: even though
    // the baseUrl passed the ingress check, the DNS record may have been
    // re-pointed at a forbidden range in the interim.
    await assertResolvedUpstreamHost(provider.baseUrl);
    return { record, provider, effective: effectiveParams(record) };
  }
}
