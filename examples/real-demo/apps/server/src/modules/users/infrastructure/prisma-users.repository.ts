import { ConflictException, Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import {
  getPrismaUniqueViolationTargets,
  isPrismaUniqueViolation,
} from "../../../common/db/prisma-errors";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import type {
  AdminUserRecord,
  CreateAdminUserInput,
  ListAdminUsersInput,
  ListAdminUsersResult,
  UpdateAdminUserInput,
  UsersRepositoryPort,
} from "../application/users-repository.port";

const isUsernameTarget = (targets: string[]): boolean =>
  targets.some((t) => t === "username" || t === "user_username_key");

const isEmailTarget = (targets: string[]): boolean =>
  targets.some((t) => t === "email" || t === "user_email_key");

const translateUserUniqueViolation = (err: unknown): Error | null => {
  if (!isPrismaUniqueViolation(err)) return null;
  const targets = getPrismaUniqueViolationTargets(err);
  if (isUsernameTarget(targets)) {
    return new ConflictException("Username is already in use.");
  }
  if (isEmailTarget(targets)) {
    return new ConflictException("Email is already in use.");
  }
  return null;
};

const CREDENTIAL_PROVIDER = "credential";

const normaliseDepartment = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];
  return raw.filter((entry): entry is string => typeof entry === "string");
};

interface UserRow {
  id: number;
  userId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  username: string;
  image: string;
  role: AdminUserRecord["role"];
  status: AdminUserRecord["status"];
  department: unknown;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PrismaUsersRepository implements UsersRepositoryPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(input: ListAdminUsersInput): Promise<ListAdminUsersResult> {
    const where: Prisma.UserWhereInput = {};
    if (input.role) {
      where.role = input.role;
    }
    if (input.status) {
      where.status = input.status;
    }
    if (input.search) {
      where.OR = [
        { name: { contains: input.search } },
        { email: { contains: input.search } },
        { username: { contains: input.search } },
      ];
    }

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((row) => this.toRecord(row)),
      totalItems,
    };
  }

  async findByUserId(userId: string): Promise<AdminUserRecord | null> {
    const row = await this.prisma.user.findUnique({ where: { userId } });
    return row ? this.toRecord(row) : null;
  }

  async findByEmail(email: string): Promise<AdminUserRecord | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ? this.toRecord(row) : null;
  }

  async findByUsername(username: string): Promise<AdminUserRecord | null> {
    const row = await this.prisma.user.findUnique({ where: { username } });
    return row ? this.toRecord(row) : null;
  }

  async countActiveSuperAdmins(): Promise<number> {
    return this.prisma.user.count({
      where: { role: "SUPER_ADMIN", status: "ACTIVE" },
    });
  }

  async create(
    input: CreateAdminUserInput,
    hashedPassword: string,
  ): Promise<AdminUserRecord> {
    try {
      const row = await this.prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          username: input.username,
          role: input.role,
          status: input.status,
          emailVerified: true,
          department: input.department,
          accounts: {
            create: {
              accountId: input.email,
              providerId: CREDENTIAL_PROVIDER,
              password: hashedPassword,
            },
          },
        },
      });
      return this.toRecord(row);
    } catch (err) {
      // Catches the race where two concurrent creates pass the service-level
      // pre-check on (email, username) and reach the DB at the same time.
      // Without this, the second writer would surface a raw Prisma error
      // instead of the documented 409.
      const translated = translateUserUniqueViolation(err);
      if (translated) throw translated;
      throw err;
    }
  }

  async update(
    userId: string,
    input: UpdateAdminUserInput,
  ): Promise<AdminUserRecord> {
    try {
      const row = await this.prisma.user.update({
        where: { userId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.username !== undefined ? { username: input.username } : {}),
          ...(input.role !== undefined ? { role: input.role } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.department !== undefined
            ? { department: input.department }
            : {}),
        },
      });
      return this.toRecord(row);
    } catch (err) {
      const translated = translateUserUniqueViolation(err);
      if (translated) throw translated;
      throw err;
    }
  }

  async delete(userId: string): Promise<void> {
    await this.prisma.user.delete({ where: { userId } });
  }

  async resetPassword(userId: string, hashedPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) {
      return;
    }
    const account = await this.prisma.account.findFirst({
      where: { userId: user.id, providerId: CREDENTIAL_PROVIDER },
    });
    if (account) {
      await this.prisma.account.update({
        where: { id: account.id },
        data: { password: hashedPassword },
      });
    } else {
      await this.prisma.account.create({
        data: {
          accountId: user.email,
          providerId: CREDENTIAL_PROVIDER,
          password: hashedPassword,
          userId: user.id,
        },
      });
    }
    // Session revocation (including cache invalidation) is the service's
    // responsibility — see UsersService.resetPassword.
  }

  private toRecord(row: UserRow): AdminUserRecord {
    return {
      id: row.id,
      userId: row.userId,
      email: row.email,
      emailVerified: row.emailVerified,
      name: row.name,
      username: row.username,
      image: row.image,
      role: row.role,
      status: row.status,
      department: normaliseDepartment(row.department),
      lastLogin: row.lastLogin,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
