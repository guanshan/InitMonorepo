import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import type {
  AuthAccountRecord,
  AuthRepositoryPort,
  AuthSessionRecord,
  AuthUserRecord,
  CreateSessionInput,
} from "../application/auth-repository.port";

@Injectable()
export class PrismaAuthRepository implements AuthRepositoryPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findAccountByUserIdAndProvider(
    userId: number,
    providerId: string,
  ): Promise<AuthAccountRecord | null> {
    return this.prisma.account.findFirst({
      where: { userId, providerId },
    });
  }

  async createSession(input: CreateSessionInput): Promise<void> {
    await this.prisma.session.create({ data: input });
  }

  async findSessionByTokenHash(
    tokenHash: string,
  ): Promise<AuthSessionRecord | null> {
    return this.prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    }) as Promise<AuthSessionRecord | null>;
  }

  async deleteSessionByTokenHash(tokenHash: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { tokenHash } });
  }

  async deleteSessionsByUserId(
    userId: number,
  ): Promise<{ tokenHashes: string[] }> {
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      select: { tokenHash: true },
    });
    await this.prisma.session.deleteMany({ where: { userId } });
    return { tokenHashes: sessions.map((s) => s.tokenHash) };
  }

  async deleteExpiredSession(sessionId: number): Promise<void> {
    await this.prisma.session
      .delete({ where: { id: sessionId } })
      .catch(() => {
        // Session may have been deleted by another request in the meantime;
        // both outcomes leave the cache hole closed, so swallow the race.
      });
  }

  async updateUserLastLogin(userId: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date() },
    });
  }

  async updateAccountPassword(
    accountId: number,
    hashedPassword: string,
  ): Promise<void> {
    await this.prisma.account.update({
      where: { id: accountId },
      data: { password: hashedPassword },
    });
  }
}
