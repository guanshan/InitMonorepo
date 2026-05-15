import { describe, expect, it, vi } from "vitest";

import type { PasswordService } from "../../auth/application/password.service";
import type { SessionService } from "../../auth/application/session.service";
import { UsersService } from "./users.service";
import type {
  AdminUserRecord,
  UsersRepositoryPort,
} from "./users-repository.port";

const baseRecord: AdminUserRecord = {
  id: 7,
  userId: "u_target",
  email: "target@example.com",
  emailVerified: true,
  name: "Target",
  username: "target",
  image: "",
  role: "USER",
  status: "ACTIVE",
  department: [],
  lastLogin: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const buildService = (overrides: { record?: Partial<AdminUserRecord> } = {}) => {
  const record = { ...baseRecord, ...overrides.record };
  const repo: UsersRepositoryPort = {
    list: vi.fn(),
    findByUserId: vi.fn().mockResolvedValue(record),
    findByEmail: vi.fn(),
    findByUsername: vi.fn().mockResolvedValue(null),
    countActiveSuperAdmins: vi.fn().mockResolvedValue(5),
    create: vi.fn(),
    update: vi.fn().mockImplementation(async (_id, patch) => ({
      ...record,
      ...patch,
    })),
    delete: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn().mockResolvedValue(undefined),
  };
  const passwordService = {
    hash: vi.fn().mockResolvedValue("hashed"),
    verify: vi.fn(),
  } as unknown as PasswordService;
  const sessionService = {
    revokeAllForUser: vi.fn().mockResolvedValue(undefined),
  } as unknown as SessionService & {
    revokeAllForUser: ReturnType<typeof vi.fn>;
  };

  const service = new UsersService(repo, passwordService, sessionService);
  return { service, repo, sessionService };
};

describe("UsersService session-revocation hooks", () => {
  it("revokes sessions when the role changes", async () => {
    const { service, sessionService } = buildService();

    await service.update("u_admin", "u_target", { role: "ADMIN" });

    expect(sessionService.revokeAllForUser).toHaveBeenCalledWith(baseRecord.id);
  });

  it("revokes sessions when the status changes", async () => {
    const { service, sessionService } = buildService();

    await service.update("u_admin", "u_target", { status: "SUSPENDED" });

    expect(sessionService.revokeAllForUser).toHaveBeenCalledWith(baseRecord.id);
  });

  it("does not revoke sessions for unrelated profile edits", async () => {
    const { service, sessionService } = buildService();

    await service.update("u_admin", "u_target", { name: "New Name" });

    expect(sessionService.revokeAllForUser).not.toHaveBeenCalled();
  });

  it("revokes sessions before deleting the user", async () => {
    const { service, repo, sessionService } = buildService();

    await service.delete("u_admin", "u_target");

    expect(sessionService.revokeAllForUser).toHaveBeenCalledWith(baseRecord.id);
    expect(repo.delete).toHaveBeenCalledWith("u_target");
    // Revoke must happen before delete so the SessionService can still look up
    // the live token hashes for cache eviction.
    const revokeOrder =
      sessionService.revokeAllForUser.mock.invocationCallOrder[0];
    const deleteOrder = (repo.delete as ReturnType<typeof vi.fn>).mock
      .invocationCallOrder[0];
    expect(revokeOrder).toBeLessThan(deleteOrder!);
  });

  it("revokes sessions after a password reset so the cache cannot keep the old auth", async () => {
    const { service, sessionService } = buildService();

    await service.resetPassword("u_target", "NewPassword123!");

    expect(sessionService.revokeAllForUser).toHaveBeenCalledWith(baseRecord.id);
  });

  it("refuses to demote the last active SUPER_ADMIN", async () => {
    const { service, repo } = buildService({
      record: { role: "SUPER_ADMIN", status: "ACTIVE" },
    });
    (repo.countActiveSuperAdmins as ReturnType<typeof vi.fn>).mockResolvedValue(
      1,
    );

    await expect(
      service.update("u_admin", "u_target", { role: "ADMIN" }),
    ).rejects.toThrow(/SUPER_ADMIN count/);
  });

  it("refuses to delete the last active SUPER_ADMIN", async () => {
    const { service, repo } = buildService({
      record: { role: "SUPER_ADMIN", status: "ACTIVE" },
    });
    (repo.countActiveSuperAdmins as ReturnType<typeof vi.fn>).mockResolvedValue(
      1,
    );

    await expect(service.delete("u_admin", "u_target")).rejects.toThrow(
      /last active SUPER_ADMIN/,
    );
  });

  it("refuses to create a user whose derived username collides", async () => {
    const { service, repo } = buildService();
    (repo.findByUsername as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...baseRecord,
      id: 99,
      username: "target",
    });

    await expect(
      service.create({
        email: "target@example.org",
        name: "Other",
        password: "Password123!",
        role: "USER",
        status: "ACTIVE",
        department: [],
      }),
    ).rejects.toThrow(/Username/);
  });
});
