import { describe, expect, it, vi } from "vitest";

import { CreateUserUseCase } from "./create-user.use-case";

describe("CreateUserUseCase", () => {
  it("creates a user and invalidates the list cache", async () => {
    const repository = {
      create: vi.fn().mockResolvedValue({
        id: "user_1",
        name: "Ada Lovelace",
        email: "ada@example.com",
        role: "ADMIN",
        createdAt: new Date("2026-04-06T00:00:00.000Z"),
        updatedAt: new Date("2026-04-06T00:00:00.000Z"),
      }),
    };

    const cacheService = {
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const useCase = new CreateUserUseCase(repository as never, cacheService as never);
    const result = await useCase.execute({
      email: "ada@example.com",
      name: "Ada Lovelace",
      role: "ADMIN",
    });

    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(cacheService.delete).toHaveBeenCalledWith("query:users:list");
    expect(cacheService.set).toHaveBeenCalledWith(
      "entity:user:user_1",
      expect.objectContaining({
        createdAt: "2026-04-06T00:00:00.000Z",
        id: "user_1",
        updatedAt: "2026-04-06T00:00:00.000Z",
      }),
      120,
    );
    expect(result.email).toBe("ada@example.com");
  });
});
