import { ConflictException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { SettingsService } from "./settings.service";
import type { SettingsRepositoryPort } from "./settings-repository.port";

const TS_INITIAL = new Date("2026-01-01T00:00:00.000Z");
const TS_AFTER_WRITE = new Date("2026-01-02T00:00:00.000Z");

const buildRepo = (initial: string | null) => {
  let value = initial;
  let updatedAt = initial ? TS_INITIAL : TS_INITIAL;
  const writes: string[] = [];

  const repo: SettingsRepositoryPort = {
    async get() {
      if (value === null) return null;
      return { value, updatedAt };
    },
    async upsert(_key, next) {
      value = next;
      updatedAt = TS_AFTER_WRITE;
      writes.push(next);
      return { value: next, updatedAt };
    },
    async compareAndSwap(_key, expectedUpdatedAt, next) {
      if (value === null) return null;
      if (expectedUpdatedAt.getTime() !== updatedAt.getTime()) return null;
      value = next;
      updatedAt = TS_AFTER_WRITE;
      writes.push(next);
      return { value: next, updatedAt };
    },
  };

  return { repo, writes };
};

describe("SettingsService.updateSystemSettings", () => {
  it("only overwrites fields the caller actually sent", async () => {
    const stored = {
      appName: "Custom App",
      appTagline: "Custom tagline",
      supportEmail: "ops@example.com",
      defaultLocale: "zh",
      defaultTheme: "dark",
      signUpEnabled: true,
      announcement: "Maintenance Friday",
    };
    const { repo, writes } = buildRepo(JSON.stringify(stored));
    const service = new SettingsService(repo);

    const result = await service.updateSystemSettings({ appName: "Renamed" });

    expect(result.appName).toBe("Renamed");
    expect(result.appTagline).toBe(stored.appTagline);
    expect(result.supportEmail).toBe(stored.supportEmail);
    expect(result.defaultLocale).toBe(stored.defaultLocale);
    expect(result.defaultTheme).toBe(stored.defaultTheme);
    expect(result.signUpEnabled).toBe(stored.signUpEnabled);
    expect(result.announcement).toBe(stored.announcement);

    const persisted = JSON.parse(writes.at(-1) ?? "{}");
    expect(persisted).toMatchObject({
      appName: "Renamed",
      appTagline: stored.appTagline,
      supportEmail: stored.supportEmail,
      defaultLocale: stored.defaultLocale,
      defaultTheme: stored.defaultTheme,
      signUpEnabled: stored.signUpEnabled,
      announcement: stored.announcement,
    });
  });

  it("ignores explicit undefined entries from the patch", async () => {
    const stored = {
      appName: "Custom App",
      appTagline: "Keep me",
      supportEmail: "",
      defaultLocale: "en",
      defaultTheme: "system",
      signUpEnabled: false,
      announcement: "Keep this too",
    };
    const { repo } = buildRepo(JSON.stringify(stored));
    const service = new SettingsService(repo);

    const result = await service.updateSystemSettings({
      appName: "New",
      appTagline: undefined,
      announcement: undefined,
    });

    expect(result.appName).toBe("New");
    expect(result.appTagline).toBe(stored.appTagline);
    expect(result.announcement).toBe(stored.announcement);
  });

  it("throws ConflictException when another writer changed the row", async () => {
    const stored = {
      appName: "App",
      appTagline: "",
      supportEmail: "",
      defaultLocale: "en",
      defaultTheme: "system",
      signUpEnabled: false,
      announcement: "",
    };
    const { repo } = buildRepo(JSON.stringify(stored));

    // Simulate a concurrent writer by having CAS unconditionally fail to
    // match. The other PATCH "won" between the read and the write.
    const racingRepo: SettingsRepositoryPort = {
      ...repo,
      async compareAndSwap() {
        return null;
      },
    };
    const racingService = new SettingsService(racingRepo);

    await expect(
      racingService.updateSystemSettings({ appName: "Loser" }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
