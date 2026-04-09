import { describe, expect, it, vi } from "vitest";

import { ListUsersUseCase } from "./list-users.use-case";

describe("ListUsersUseCase", () => {
  it("returns a cached users page when the cache is synchronized", async () => {
    const repository = {
      list: vi.fn(),
    };
    const cacheService = {
      get: vi
        .fn()
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce({
          totalItems: 1,
          users: [
            {
              createdAt: "2026-04-06T00:00:00.000Z",
              email: "ada@example.com",
              id: "user_1",
              name: "Ada Lovelace",
              role: "ADMIN",
              updatedAt: "2026-04-06T00:00:00.000Z",
            },
          ],
        }),
      set: vi.fn().mockResolvedValue(undefined),
    };

    const useCase = new ListUsersUseCase(
      repository as never,
      cacheService as never,
    );

    const result = await useCase.execute({
      page: 1,
      pageSize: 20,
    });

    expect(result).toMatchObject({
      cached: true,
      page: 1,
      pageSize: 20,
      totalItems: 1,
      users: [
        {
          email: "ada@example.com",
          id: "user_1",
        },
      ],
    });
    expect(repository.list).not.toHaveBeenCalled();
  });

  it("falls through to the database when cache returns null", async () => {
    const repository = {
      list: vi.fn().mockResolvedValue({
        totalItems: 1,
        users: [
          {
            createdAt: new Date("2026-04-09T00:00:00.000Z"),
            email: "fresh@example.com",
            id: "fresh_user",
            name: "Fresh User",
            role: "MEMBER",
            updatedAt: new Date("2026-04-09T00:00:00.000Z"),
          },
        ],
      }),
    };
    const cacheService = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
    };

    const useCase = new ListUsersUseCase(
      repository as never,
      cacheService as never,
    );

    const result = await useCase.execute({
      page: 1,
      pageSize: 20,
    });

    expect(result).toMatchObject({
      cached: false,
      totalItems: 1,
      users: [
        {
          email: "fresh@example.com",
          id: "fresh_user",
        },
      ],
    });
    expect(repository.list).toHaveBeenCalledTimes(1);
  });
});
