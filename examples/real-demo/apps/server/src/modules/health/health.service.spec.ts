import { describe, expect, it, vi } from "vitest";

import { HealthService } from "./health.service";

describe("HealthService", () => {
  it("returns a degraded readiness snapshot when a dependency is down", async () => {
    const service = new HealthService(
      {
        isReady: vi.fn().mockResolvedValue(true),
      } as never,
      {
        isReady: vi.fn().mockResolvedValue(false),
      } as never,
    );

    await expect(service.createReadinessSnapshot()).resolves.toEqual({
      ready: false,
      services: {
        cache: "down",
        database: "up",
      },
    });
  });

  it("returns a healthy liveness snapshot", () => {
    const service = new HealthService(
      {
        isReady: vi.fn().mockResolvedValue(true),
      } as never,
      {
        isReady: vi.fn().mockResolvedValue(true),
      } as never,
    );

    expect(service.createLivenessSnapshot()).toEqual({
      status: "ok",
    });
  });
});
