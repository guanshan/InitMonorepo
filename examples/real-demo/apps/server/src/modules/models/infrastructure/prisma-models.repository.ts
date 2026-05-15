import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { ModelCapabilities } from "@real-demo/shared";

import {
  isPrismaRecordNotFound,
  isPrismaUniqueViolation,
} from "../../../common/db/prisma-errors";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import type {
  ModelCreateInput,
  ModelRecord,
  ModelsRepositoryPort,
  ModelUpdateInput,
  ModelVerificationPatch,
} from "../application/models.repository.port";

type ModelRow = {
  modelKey: string;
  name: string;
  modelIdent: string;
  description: string;
  enabled: boolean;
  capabilities: unknown;
  temperature: number | null;
  maxTokens: number | null;
  lastVerifiedAt: Date | null;
  lastError: string | null;
  provider: { providerKey: string } | null;
};

const DEFAULT_CAPABILITIES: ModelCapabilities = {
  vision: false,
  tools: false,
  json: false,
  reasoning: false,
  streaming: true,
};

const normaliseCapabilities = (raw: unknown): ModelCapabilities => {
  if (typeof raw !== "object" || raw === null) return { ...DEFAULT_CAPABILITIES };
  const r = raw as Partial<Record<keyof ModelCapabilities, unknown>>;
  return {
    vision: r.vision === true,
    tools: r.tools === true,
    json: r.json === true,
    reasoning: r.reasoning === true,
    streaming: r.streaming !== false,
  };
};

const toRecord = (row: ModelRow): ModelRecord => ({
  id: row.modelKey,
  name: row.name,
  providerId: row.provider?.providerKey ?? "",
  model: row.modelIdent,
  description: row.description,
  enabled: row.enabled,
  capabilities: normaliseCapabilities(row.capabilities),
  temperature: row.temperature ?? undefined,
  maxTokens: row.maxTokens ?? undefined,
  lastVerifiedAt: row.lastVerifiedAt?.toISOString() ?? null,
  lastError: row.lastError,
});

@Injectable()
export class PrismaModelsRepository implements ModelsRepositoryPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async resolveProviderId(providerKey: string): Promise<number> {
    const provider = await this.prisma.provider.findUnique({
      where: { providerKey },
      select: { id: true },
    });
    if (!provider) {
      throw new BadRequestException(`Provider "${providerKey}" not found.`);
    }
    return provider.id;
  }

  async findAll(): Promise<ModelRecord[]> {
    const rows = await this.prisma.model.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        provider: { select: { providerKey: true } },
      },
    });
    return rows.map(toRecord);
  }

  async findByKey(modelKey: string): Promise<ModelRecord | null> {
    const row = await this.prisma.model.findUnique({
      where: { modelKey },
      include: {
        provider: { select: { providerKey: true } },
      },
    });
    return row ? toRecord(row) : null;
  }

  async create(input: ModelCreateInput): Promise<ModelRecord> {
    const providerId = await this.resolveProviderId(input.providerId);
    try {
      const row = await this.prisma.model.create({
        data: {
          modelKey: input.id,
          name: input.name,
          providerId,
          modelIdent: input.model,
          description: input.description,
          enabled: input.enabled,
          capabilities: input.capabilities as unknown as object,
          temperature: input.temperature ?? null,
          maxTokens: input.maxTokens ?? null,
        },
        include: {
          provider: { select: { providerKey: true } },
        },
      });
      return toRecord(row);
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        throw new ConflictException(`Model "${input.id}" already exists.`);
      }
      throw err;
    }
  }

  async update(modelKey: string, patch: ModelUpdateInput): Promise<ModelRecord> {
    const data: Record<string, unknown> = {};
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.model !== undefined) data.modelIdent = patch.model;
    if (patch.description !== undefined) data.description = patch.description;
    if (patch.enabled !== undefined) data.enabled = patch.enabled;
    if (patch.capabilities !== undefined) {
      data.capabilities = patch.capabilities as unknown as object;
    }
    if (patch.temperature !== undefined) data.temperature = patch.temperature;
    if (patch.maxTokens !== undefined) data.maxTokens = patch.maxTokens;
    if (patch.providerId !== undefined) {
      data.providerId = await this.resolveProviderId(patch.providerId);
    }
    try {
      const row = await this.prisma.model.update({
        where: { modelKey },
        data,
        include: {
          provider: { select: { providerKey: true } },
        },
      });
      return toRecord(row);
    } catch (err) {
      if (isPrismaRecordNotFound(err)) {
        throw new NotFoundException(`Model "${modelKey}" not found.`);
      }
      throw err;
    }
  }

  async delete(modelKey: string): Promise<void> {
    try {
      await this.prisma.model.delete({ where: { modelKey } });
    } catch (err) {
      if (isPrismaRecordNotFound(err)) {
        throw new NotFoundException(`Model "${modelKey}" not found.`);
      }
      throw err;
    }
  }

  async setVerification(
    modelKey: string,
    patch: ModelVerificationPatch,
  ): Promise<void> {
    try {
      await this.prisma.model.update({
        where: { modelKey },
        data: {
          lastVerifiedAt: patch.lastVerifiedAt
            ? new Date(patch.lastVerifiedAt)
            : null,
          lastError: patch.lastError,
        },
      });
    } catch (err) {
      if (isPrismaRecordNotFound(err)) return;
      throw err;
    }
  }

  async clearVerificationForProvider(providerKey: string): Promise<void> {
    const provider = await this.prisma.provider.findUnique({
      where: { providerKey },
      select: { id: true },
    });
    if (!provider) return;

    await this.prisma.model.updateMany({
      where: { providerId: provider.id },
      data: {
        lastVerifiedAt: null,
        lastError: null,
      },
    });
  }
}
