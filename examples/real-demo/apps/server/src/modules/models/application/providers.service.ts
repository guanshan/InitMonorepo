import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  CreateProviderInput,
  ProviderView,
  UpdateProviderInput,
} from "@real-demo/shared";

import {
  SAFE_URL_FORBIDDEN_HOST,
  SAFE_URL_INVALID,
  validateUpstreamUrl,
} from "../../../common/security/safe-url";
import {
  MODELS_REPOSITORY_PORT,
  type ModelsRepositoryPort,
} from "./models.repository.port";
import {
  PROVIDERS_REPOSITORY_PORT,
  type ProviderRecord,
  type ProvidersRepositoryPort,
} from "./providers.repository.port";

const summarize = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message || fallback : fallback;

/**
 * Ingress check for any baseUrl that will be persisted. We don't DNS-resolve
 * here — that happens just before each outbound fetch — but we still reject
 * literal cloud-metadata / link-local IPs at the data-entry layer so they
 * never enter the database.
 */
const assertIngressBaseUrl = (baseUrl: string): void => {
  const result = validateUpstreamUrl(baseUrl);
  if (result.ok) return;
  if (result.reason === SAFE_URL_FORBIDDEN_HOST) {
    throw new BadRequestException(SAFE_URL_FORBIDDEN_HOST);
  }
  throw new BadRequestException(result.reason ?? SAFE_URL_INVALID);
};

const toView = (record: ProviderRecord): ProviderView => ({
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

@Injectable()
export class ProvidersService {
  constructor(
    @Inject(PROVIDERS_REPOSITORY_PORT)
    private readonly repo: ProvidersRepositoryPort,
    @Inject(MODELS_REPOSITORY_PORT)
    private readonly modelsRepo: ModelsRepositoryPort,
  ) {}

  async list(): Promise<ProviderView[]> {
    const records = await this.repo.findAll();
    return records.map(toView);
  }

  async get(id: string): Promise<ProviderView> {
    const record = await this.repo.findByKey(id);
    if (!record) throw new NotFoundException(`Provider "${id}" not found.`);
    return toView(record);
  }

  async create(input: CreateProviderInput): Promise<ProviderView> {
    assertIngressBaseUrl(input.baseUrl);
    try {
      const record = await this.repo.create(input);
      return toView(record);
    } catch (err) {
      // Bundlers can rename a class so `err.name === "ConflictException"`
      // is fragile; `instanceof` follows the prototype chain instead.
      if (err instanceof ConflictException) throw err;
      throw err instanceof Error
        ? err
        : new BadRequestException(summarize(err, "Failed to add provider."));
    }
  }

  async update(id: string, input: UpdateProviderInput): Promise<ProviderView> {
    if (input.apiKey !== undefined && input.apiKey.length === 0) {
      throw new BadRequestException(
        "apiKey must be a non-empty string; omit the field to keep the existing key.",
      );
    }
    if (input.baseUrl !== undefined) {
      assertIngressBaseUrl(input.baseUrl);
    }
    const record = await this.repo.update(id, {
      name: input.name,
      type: input.type,
      vendor: input.vendor,
      baseUrl: input.baseUrl,
      apiKey: input.apiKey,
    });
    // Any change to a field that affects connectivity invalidates the cached
    // verification result. Without this, a previously-healthy provider that's
    // had its baseUrl repointed at a broken endpoint would still display
    // `healthy` until someone re-runs verify; conversely, a fixed provider
    // would still show its stale lastError.
    const connectivityChanged =
      input.baseUrl !== undefined ||
      input.apiKey !== undefined ||
      input.type !== undefined ||
      input.vendor !== undefined;
    if (connectivityChanged) {
      await this.repo.setVerification(id, {
        lastVerifiedAt: null,
        lastError: null,
      });
      await this.modelsRepo.clearVerificationForProvider(id);
      return toView({ ...record, lastVerifiedAt: null, lastError: null });
    }
    return toView(record);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
