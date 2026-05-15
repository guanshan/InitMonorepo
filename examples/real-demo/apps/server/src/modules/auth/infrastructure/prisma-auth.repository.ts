import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import type {
  AuthAccountRecord,
  AuthRepositoryPort,
  AuthUserRecord,
} from "../application/auth-repository.port";

@Injectable()
export class PrismaAuthRepository implements AuthRepositoryPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findAccountByUserIdAndProvider(
    userId: string,
    providerId: string,
  ): Promise<AuthAccountRecord | null> {
    return this.prisma.account.findFirst({ where: { userId, providerId } });
  }

  async revokeAllSessionsForUser(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId } });
  }

  async updateUserLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date() },
    });
  }

  async updateAccountPassword(
    accountId: string,
    hashedPassword: string,
  ): Promise<void> {
    await this.prisma.account.update({
      where: { id: accountId },
      data: { password: hashedPassword },
    });
  }
}
