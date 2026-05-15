import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { ProviderType, ProviderVendor } from "@real-demo/shared";

import {
  isPrismaRecordNotFound,
  isPrismaUniqueViolation,
} from "../../../common/db/prisma-errors";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import { CryptoService } from "../application/crypto.service";
import type {
  ProviderCreateInput,
  ProviderRecord,
  ProvidersRepositoryPort,
  ProviderUpdateInput,
  ProviderVerificationPatch,
} from "../application/providers.repository.port";

type ProviderRow = {
  providerKey: string;
  name: string;
  type: string;
  vendor: string;
  baseUrl: string;
  apiKeyCipher: string;
  apiKeyPreview: string;
  lastVerifiedAt: Date | null;
  lastError: string | null;
};

@Injectable()
export class PrismaProvidersRepository implements ProvidersRepositoryPort {
  private readonly logger = new Logger(PrismaProvidersRepository.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CryptoService) private readonly crypto: CryptoService,
  ) {}

  private toRecord(row: ProviderRow): ProviderRecord {
    let apiKey: string;
    try {
      apiKey = this.crypto.decrypt(row.apiKeyCipher);
    } catch (err) {
      // Decrypt failure is almost always one of:
      //   - the envelope was written under a previous master key (rotation
      //     drift) → operator needs to rerun `rotate-encryption-key`
      //   - the row was tampered with at rest
      //   - the master key was changed without rotation
      // In every case the row is now silently unusable. Logging at warn (not
      // error) because the request itself succeeds — but operators NEED a
      // signal in the log stream to discover the broken row.
      this.logger.warn(
        {
          providerKey: row.providerKey,
          reason: err instanceof Error ? err.message : String(err),
        },
        "Failed to decrypt provider API key; provider will appear as 'no key'.",
      );
      apiKey = "";
    }
    return {
      id: row.providerKey,
      name: row.name,
      type: row.type as ProviderType,
      vendor: row.vendor as ProviderVendor,
      baseUrl: row.baseUrl,
      apiKey,
      apiKeyPreview: row.apiKeyPreview,
      lastVerifiedAt: row.lastVerifiedAt?.toISOString() ?? null,
      lastError: row.lastError,
    };
  }

  async findAll(): Promise<ProviderRecord[]> {
    const rows = await this.prisma.provider.findMany({
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => this.toRecord(row));
  }

  async findByKey(providerKey: string): Promise<ProviderRecord | null> {
    const row = await this.prisma.provider.findUnique({ where: { providerKey } });
    return row ? this.toRecord(row) : null;
  }

  async create(input: ProviderCreateInput): Promise<ProviderRecord> {
    try {
      const row = await this.prisma.provider.create({
        data: {
          providerKey: input.id,
          name: input.name,
          type: input.type,
          vendor: input.vendor,
          baseUrl: input.baseUrl,
          apiKeyCipher: this.crypto.encrypt(input.apiKey),
          apiKeyPreview: this.crypto.preview(input.apiKey),
        },
      });
      return this.toRecord(row);
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        throw new ConflictException(`Provider "${input.id}" already exists.`);
      }
      throw err;
    }
  }

  async update(
    providerKey: string,
    patch: ProviderUpdateInput,
  ): Promise<ProviderRecord> {
    const data: Record<string, unknown> = {};
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.type !== undefined) data.type = patch.type;
    if (patch.vendor !== undefined) data.vendor = patch.vendor;
    if (patch.baseUrl !== undefined) data.baseUrl = patch.baseUrl;
    if (patch.apiKey !== undefined && patch.apiKey.length > 0) {
      data.apiKeyCipher = this.crypto.encrypt(patch.apiKey);
      data.apiKeyPreview = this.crypto.preview(patch.apiKey);
    }
    try {
      const row = await this.prisma.provider.update({
        where: { providerKey },
        data,
      });
      return this.toRecord(row);
    } catch (err) {
      if (isPrismaRecordNotFound(err)) {
        throw new NotFoundException(`Provider "${providerKey}" not found.`);
      }
      throw err;
    }
  }

  async delete(providerKey: string): Promise<void> {
    try {
      await this.prisma.provider.delete({ where: { providerKey } });
    } catch (err) {
      if (isPrismaRecordNotFound(err)) {
        throw new NotFoundException(`Provider "${providerKey}" not found.`);
      }
      throw err;
    }
  }

  async setVerification(
    providerKey: string,
    patch: ProviderVerificationPatch,
  ): Promise<void> {
    try {
      await this.prisma.provider.update({
        where: { providerKey },
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
}
