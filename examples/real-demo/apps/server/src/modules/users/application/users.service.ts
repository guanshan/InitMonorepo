import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PasswordService } from "../../auth/application/password.service";
import { SessionService } from "../../auth/application/session.service";
import type { UserRole, UserStatus } from "../../auth/domain/auth.types";
import type { AdminUserRecord } from "./users-repository.port";
import {
  USERS_REPOSITORY_PORT,
  type UsersRepositoryPort,
} from "./users-repository.port";

interface ListUsersInput {
  page: number;
  pageSize: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
}

interface CreateUserInput {
  email: string;
  name: string;
  username?: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  department: string[];
}

interface UpdateUserInput {
  name?: string;
  username?: string;
  role?: UserRole;
  status?: UserStatus;
  department?: string[];
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const deriveUsername = (input: { username?: string; email: string }) => {
  if (input.username && input.username.trim().length > 0) {
    return input.username.trim();
  }
  return input.email.split("@")[0] ?? input.email;
};

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY_PORT)
    private readonly usersRepo: UsersRepositoryPort,
    @Inject(PasswordService)
    private readonly passwordService: PasswordService,
    @Inject(SessionService)
    private readonly sessionService: SessionService,
  ) {}

  list(input: ListUsersInput) {
    return this.usersRepo.list(input);
  }

  async getByUserId(userId: string): Promise<AdminUserRecord> {
    const user = await this.usersRepo.findByUserId(userId);
    if (!user) {
      throw new NotFoundException("User not found.");
    }
    return user;
  }

  async create(input: CreateUserInput): Promise<AdminUserRecord> {
    const email = normalizeEmail(input.email);
    const existing = await this.usersRepo.findByEmail(email);
    if (existing) {
      throw new ConflictException("Email is already in use.");
    }

    const username = deriveUsername({ username: input.username, email });
    // `User.username` is not a DB-level unique column (existing rows can hold
    // duplicate empty defaults), so we enforce uniqueness at the service
    // layer. The `deriveUsername` fallback uses the email local-part, which
    // makes collisions actively likely (alice@a.com and alice@b.com both
    // derive to "alice"); failing fast with a 409 is friendlier than
    // accepting the row and confusing future logins.
    const usernameClash = await this.usersRepo.findByUsername(username);
    if (usernameClash) {
      throw new ConflictException("Username is already in use.");
    }

    const hashedPassword = await this.passwordService.hash(input.password);

    return this.usersRepo.create(
      {
        email,
        name: input.name.trim(),
        username,
        role: input.role,
        status: input.status,
        department: input.department,
      },
      hashedPassword,
    );
  }

  async update(
    actingUserId: string,
    userId: string,
    input: UpdateUserInput,
  ): Promise<AdminUserRecord> {
    const target = await this.usersRepo.findByUserId(userId);
    if (!target) {
      throw new NotFoundException("User not found.");
    }

    if (actingUserId === userId && input.status && input.status !== "ACTIVE") {
      throw new BadRequestException(
        "You cannot deactivate or suspend your own account.",
      );
    }
    if (actingUserId === userId && input.role && input.role !== target.role) {
      throw new BadRequestException("You cannot change your own role.");
    }

    // Last-active-SUPER_ADMIN guard. The self-checks above already cover
    // the "demote / suspend yourself" case; this catches the cross-account
    // case where SUPER_ADMIN A demotes / suspends SUPER_ADMIN B and zeroes
    // out the role.
    const willDemote =
      target.role === "SUPER_ADMIN" &&
      input.role !== undefined &&
      input.role !== "SUPER_ADMIN";
    const willDeactivate =
      target.role === "SUPER_ADMIN" &&
      target.status === "ACTIVE" &&
      input.status !== undefined &&
      input.status !== "ACTIVE";
    if (willDemote || willDeactivate) {
      const remaining = await this.usersRepo.countActiveSuperAdmins();
      if (remaining <= 1) {
        throw new BadRequestException(
          "Cannot reduce the active SUPER_ADMIN count below 1.",
        );
      }
    }

    if (input.username !== undefined && input.username !== target.username) {
      const clash = await this.usersRepo.findByUsername(input.username);
      if (clash && clash.id !== target.id) {
        throw new ConflictException("Username is already in use.");
      }
    }

    const updated = await this.usersRepo.update(userId, input);

    // Role / status changes must take effect immediately, not after the
    // 5-minute session cache TTL expires. Revoke every active session so the
    // next request re-resolves the user from the DB.
    const roleChanged =
      input.role !== undefined && input.role !== target.role;
    const statusChanged =
      input.status !== undefined && input.status !== target.status;
    if (roleChanged || statusChanged) {
      await this.sessionService.revokeAllForUser(target.id);
    }

    return updated;
  }

  async delete(actingUserId: string, userId: string): Promise<void> {
    if (actingUserId === userId) {
      throw new BadRequestException("You cannot delete your own account.");
    }
    const target = await this.usersRepo.findByUserId(userId);
    if (!target) {
      throw new NotFoundException("User not found.");
    }
    // Deleting the last active SUPER_ADMIN locks the system out of the
    // user-management endpoints. The self-check above prevents A from
    // deleting themselves; this prevents A from deleting B when B is the
    // only other active SUPER_ADMIN.
    if (target.role === "SUPER_ADMIN" && target.status === "ACTIVE") {
      const remaining = await this.usersRepo.countActiveSuperAdmins();
      if (remaining <= 1) {
        throw new BadRequestException(
          "Cannot delete the last active SUPER_ADMIN.",
        );
      }
    }
    // Drop sessions (and their cache entries) before deleting the user so a
    // recently-cached session can't outlive the account it points at.
    await this.sessionService.revokeAllForUser(target.id);
    await this.usersRepo.delete(userId);
  }

  async resetPassword(userId: string, password: string): Promise<void> {
    const target = await this.usersRepo.findByUserId(userId);
    if (!target) {
      throw new NotFoundException("User not found.");
    }
    const hashed = await this.passwordService.hash(password);
    await this.usersRepo.resetPassword(userId, hashed);
    // Repo also clears DB sessions, but cache entries are keyed by the raw
    // token hashes and must be cleared via the SessionService so the next
    // request can't validate against a stale snapshot.
    await this.sessionService.revokeAllForUser(target.id);
  }
}
