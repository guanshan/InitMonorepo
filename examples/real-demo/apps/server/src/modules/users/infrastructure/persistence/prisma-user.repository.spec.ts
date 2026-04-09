import { describe, expect, it, vi } from "vitest";

import { PrismaUserRepository } from "./prisma-user.repository";

describe("PrismaUserRepository", () => {
  it("reads paginated users inside a transaction with a deterministic sort order", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        createdAt: new Date("2026-04-07T00:00:00.000Z"),
        email: "grace@example.com",
        id: "user_2",
        name: "Grace Hopper",
        role: "SUPPORT",
        updatedAt: new Date("2026-04-07T00:00:00.000Z"),
      },
    ]);
    const count = vi.fn().mockResolvedValue(3);
    const transaction = vi.fn(
      async <T extends readonly unknown[]>(
        operations: { [Key in keyof T]: Promise<T[Key]> },
      ) => Promise.all(operations) as Promise<T>,
    );

    const repository = new PrismaUserRepository({
      $transaction: transaction,
      user: {
        count,
        findMany,
      },
    } as never);

    const result = await repository.list({
      page: 2,
      pageSize: 1,
    });

    expect(findMany).toHaveBeenCalledWith({
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      skip: 1,
      take: 1,
    });
    expect(count).toHaveBeenCalledTimes(1);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      totalItems: 3,
      users: [
        {
          createdAt: new Date("2026-04-07T00:00:00.000Z"),
          email: "grace@example.com",
          id: "user_2",
          name: "Grace Hopper",
          role: "SUPPORT",
          updatedAt: new Date("2026-04-07T00:00:00.000Z"),
        },
      ],
    });
  });
});
