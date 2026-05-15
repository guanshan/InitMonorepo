import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import type {
  SettingsRecord,
  SettingsRepositoryPort,
} from "../application/settings-repository.port";

@Injectable()
export class PrismaSettingsRepository implements SettingsRepositoryPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async get(key: string): Promise<SettingsRecord | null> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key } });
    if (!row) {
      return null;
    }
    return { value: row.value, updatedAt: row.updatedAt };
  }

  async upsert(key: string, value: string): Promise<SettingsRecord> {
    const row = await this.prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    return { value: row.value, updatedAt: row.updatedAt };
  }

  async compareAndSwap(
    key: string,
    expectedUpdatedAt: Date,
    nextValue: string,
  ): Promise<SettingsRecord | null> {
    // updateMany returns count without raising P2025 on miss; the row was
    // either modified between read and write, or never existed.
    const result = await this.prisma.systemSetting.updateMany({
      where: { key, updatedAt: expectedUpdatedAt },
      data: { value: nextValue },
    });
    if (result.count === 0) {
      return null;
    }
    const row = await this.prisma.systemSetting.findUnique({ where: { key } });
    if (!row) {
      // Theoretically reachable if the row was deleted between the
      // updateMany and the re-read; treat as a lost race.
      return null;
    }
    return { value: row.value, updatedAt: row.updatedAt };
  }
}
