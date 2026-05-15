import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import {
  SystemSettingsSchema,
  type SystemSettings,
  type UpdateSystemSettingsInput,
} from "@real-demo/shared";

import {
  DEFAULT_SYSTEM_SETTINGS,
  SYSTEM_SETTINGS_KEY,
} from "../domain/settings.types";
import {
  SETTINGS_REPOSITORY_PORT,
  type SettingsRecord,
  type SettingsRepositoryPort,
} from "./settings-repository.port";

@Injectable()
export class SettingsService {
  constructor(
    @Inject(SETTINGS_REPOSITORY_PORT)
    private readonly settingsRepo: SettingsRepositoryPort,
  ) {}

  async getSystemSettings(): Promise<SystemSettings> {
    const record = await this.loadOrSeed();
    return this.parseRecord(record.value, record.updatedAt);
  }

  async updateSystemSettings(
    input: UpdateSystemSettingsInput,
  ): Promise<SystemSettings> {
    // Read-merge-write under an optimistic lock keyed on `updatedAt`. Two
    // concurrent PATCHes will both read the same baseline, both attempt the
    // CAS, and exactly one will win — the loser sees `null` and raises
    // ConflictException so the client can refetch and retry instead of
    // silently overwriting the winner's changes.
    const current = await this.loadOrSeed();
    const parsedCurrent = this.parseRecord(current.value, current.updatedAt);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { updatedAt: _ignored, ...currentWithoutMeta } = parsedCurrent;
    const patch = Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined),
    );
    const next = { ...currentWithoutMeta, ...patch };
    const written = await this.settingsRepo.compareAndSwap(
      SYSTEM_SETTINGS_KEY,
      current.updatedAt,
      JSON.stringify(next),
    );
    if (!written) {
      throw new ConflictException(
        "System settings have been modified by another writer. Refresh and try again.",
      );
    }
    return this.parseRecord(written.value, written.updatedAt);
  }

  private async loadOrSeed(): Promise<SettingsRecord> {
    const record = await this.settingsRepo.get(SYSTEM_SETTINGS_KEY);
    if (record) return record;
    return this.settingsRepo.upsert(
      SYSTEM_SETTINGS_KEY,
      JSON.stringify(DEFAULT_SYSTEM_SETTINGS),
    );
  }

  private parseRecord(rawValue: string, updatedAt: Date): SystemSettings {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawValue);
    } catch {
      throw new InternalServerErrorException(
        "Stored system settings are not valid JSON.",
      );
    }
    if (typeof parsed !== "object" || parsed === null) {
      throw new InternalServerErrorException(
        "Stored system settings are malformed.",
      );
    }
    const merged = {
      ...DEFAULT_SYSTEM_SETTINGS,
      ...(parsed as Record<string, unknown>),
      updatedAt: updatedAt.toISOString(),
    };
    return SystemSettingsSchema.parse(merged);
  }
}
