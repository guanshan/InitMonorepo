import { createHash, randomBytes } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";

import { CACHE_PORT, type CachePort } from "../../../common/cache/cache.port";
import { cacheKeys } from "../../../common/cache/cache-keys";
import {
  AUTH_SESSION_TTL_MS,
  type SessionUserInternal,
} from "../domain/auth.types";
import {
  AUTH_REPOSITORY_PORT,
  type AuthRepositoryPort,
} from "./auth-repository.port";
import { RoleService } from "./role.service";

const SESSION_CACHE_TTL_SECONDS = 300;

const hashSessionToken = (rawToken: string) =>
  createHash("sha256").update(rawToken).digest("hex");

@Injectable()
export class SessionService {
  constructor(
    @Inject(AUTH_REPOSITORY_PORT)
    private readonly authRepo: AuthRepositoryPort,
    @Inject(CACHE_PORT) private readonly cache: CachePort,
    @Inject(RoleService) private readonly roleService: RoleService,
  ) {}

  async create(input: {
    userId: number;
    ipAddress: string;
    userAgent: string;
  }): Promise<string> {
    const rawToken = randomBytes(64).toString("hex");
    const tokenHash = hashSessionToken(rawToken);
    const expiresAt = new Date(Date.now() + AUTH_SESSION_TTL_MS);

    await this.authRepo.createSession({
      tokenHash,
      expiresAt,
      ipAddress: input.ipAddress.slice(0, 64),
      userAgent: input.userAgent.slice(0, 512),
      userId: input.userId,
    });

    return rawToken;
  }

  async validate(rawToken: string): Promise<SessionUserInternal | null> {
    const tokenHash = hashSessionToken(rawToken);
    const cached = await this.cache.get<SessionUserInternal>(
      cacheKeys.auth.sessionById(tokenHash),
    );
    if (cached) {
      return {
        ...cached,
        createdAt: new Date(cached.createdAt),
        updatedAt: new Date(cached.updatedAt),
      };
    }

    const session = await this.authRepo.findSessionByTokenHash(tokenHash);

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await this.authRepo.deleteExpiredSession(session.id);
      }
      return null;
    }

    const user = session.user;
    const resolvedRole = await this.roleService.resolveUserRole({
      baseRole: user.role,
      department: user.department,
    });

    const sessionUser: SessionUserInternal = {
      id: user.id,
      userId: user.userId,
      name: user.name,
      email: user.email,
      image: user.image,
      username: user.username || user.name,
      role: resolvedRole.role,
      baseRole: resolvedRole.baseRole,
      roleSource: resolvedRole.roleSource,
      department: Array.isArray(user.department)
        ? (user.department as string[])
        : [],
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    await this.cache.set(
      cacheKeys.auth.sessionById(tokenHash),
      sessionUser,
      SESSION_CACHE_TTL_SECONDS,
    );

    return sessionUser;
  }

  async revoke(rawToken: string): Promise<void> {
    const tokenHash = hashSessionToken(rawToken);
    await this.cache.delete(cacheKeys.auth.sessionById(tokenHash));
    await this.authRepo.deleteSessionByTokenHash(tokenHash);
  }

  async revokeAllForUser(userId: number): Promise<void> {
    const { tokenHashes } = await this.authRepo.deleteSessionsByUserId(userId);

    for (const tokenHash of tokenHashes) {
      await this.cache.delete(cacheKeys.auth.sessionById(tokenHash));
    }
  }
}
