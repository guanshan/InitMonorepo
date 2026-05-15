import { describe, expect, it, vi } from "vitest";

import { ProvidersService } from "./providers.service";
import type {
  ProviderRecord,
  ProvidersRepositoryPort,
} from "./providers.repository.port";
import type { ModelsRepositoryPort } from "./models.repository.port";

const baseProvider: ProviderRecord = {
  id: "openai",
  name: "OpenAI",
  type: "openai",
  vendor: "openai",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "sk-demo",
  apiKeyPreview: "sk••••",
  lastVerifiedAt: "2026-01-01T00:00:00.000Z",
  lastError: null,
};

const buildService = () => {
  const repo: ProvidersRepositoryPort = {
    findAll: vi.fn().mockResolvedValue([baseProvider]),
    findByKey: vi.fn().mockResolvedValue(baseProvider),
    create: vi.fn().mockImplementation(async (input) => ({
      ...input,
      apiKeyPreview: "sk••••",
      lastVerifiedAt: null,
      lastError: null,
    })),
    update: vi.fn().mockImplementation(async (_id, patch) => {
      const definedPatch = Object.fromEntries(
        Object.entries(patch).filter(([, value]) => value !== undefined),
      );
      return {
        ...baseProvider,
        ...definedPatch,
      };
    }),
    delete: vi.fn().mockResolvedValue(undefined),
    setVerification: vi.fn().mockResolvedValue(undefined),
  };
  const modelsRepo: ModelsRepositoryPort = {
    findAll: vi.fn(),
    findByKey: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    setVerification: vi.fn(),
    clearVerificationForProvider: vi.fn().mockResolvedValue(undefined),
  };
  const service = new ProvidersService(repo, modelsRepo);
  return { service, repo, modelsRepo };
};

describe("ProvidersService.update", () => {
  it("clears provider and model verification when connectivity changes", async () => {
    const { service, repo, modelsRepo } = buildService();

    const result = await service.update("openai", {
      baseUrl: "https://gateway.example.com/v1",
    });

    expect(repo.setVerification).toHaveBeenCalledWith("openai", {
      lastVerifiedAt: null,
      lastError: null,
    });
    expect(modelsRepo.clearVerificationForProvider).toHaveBeenCalledWith(
      "openai",
    );
    expect(result.lastVerifiedAt).toBeNull();
    expect(result.lastError).toBeNull();
  });

  it("leaves verification caches intact for display-only edits", async () => {
    const { service, repo, modelsRepo } = buildService();

    await service.update("openai", { name: "Renamed" });

    expect(repo.setVerification).not.toHaveBeenCalled();
    expect(modelsRepo.clearVerificationForProvider).not.toHaveBeenCalled();
  });
});
