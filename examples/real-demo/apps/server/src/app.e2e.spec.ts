import "reflect-metadata";

// CryptoService refuses to boot without REAL_DEMO_ENCRYPTION_KEY (correctly;
// no plaintext fallback in prod). Stub it here so AppModule can wire up under
// the test harness. The value never encrypts anything real — FakePrismaService
// bypasses the provider table.
process.env.REAL_DEMO_ENCRYPTION_KEY =
  process.env.REAL_DEMO_ENCRYPTION_KEY ??
  Buffer.alloc(32, 1).toString("base64");

import type { NestExpressApplication } from "@nestjs/platform-express";

import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { AppModule } from "./app.module";
import { configureApp } from "./app.factory";
import { CacheService } from "./infrastructure/cache/cache.service";
import { PrismaService } from "./infrastructure/prisma/prisma.service";
import { PasswordService } from "./modules/auth/application/password.service";

// --- Types matching the updated Prisma schema (string PKs, BetterAuth fields) ---

type StoredUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string;
  username: string | null;
  role: "SUPER_ADMIN" | "ADMIN" | "USER";
  department: unknown;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type StoredAccount = {
  id: string;
  accountId: string;
  providerId: string;
  password: string | null;
  userId: string;
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  scope: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type StoredSession = {
  id: string;
  token: string;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

type StoredVerification = {
  id: string;
  identifier: string;
  value: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

const ADMIN_EMAIL = "admin@local.auth";
const ADMIN_PASSWORD = "Demo#2026.";

// --- WHERE clause resolver -----------------------------------------------
// BetterAuth's prismaAdapter wraps equality conditions as { field: { equals: value } }
// while our application code uses the shorthand { field: value }.
// This helper handles both formats, plus AND/OR combinators.

type WhereClause = Record<string, unknown>;

function resolveValue(condition: unknown): { op: "eq"; value: unknown } | null {
  if (condition === null || condition === undefined) return { op: "eq", value: condition };
  if (typeof condition !== "object") return { op: "eq", value: condition };
  const obj = condition as Record<string, unknown>;
  if ("equals" in obj) return { op: "eq", value: obj["equals"] };
  return null;
}

function matchesWhere(record: Record<string, unknown>, where: WhereClause): boolean {
  for (const [key, condition] of Object.entries(where)) {
    if (key === "AND" && Array.isArray(condition)) {
      if (!condition.every((c: WhereClause) => matchesWhere(record, c))) return false;
      continue;
    }
    if (key === "OR" && Array.isArray(condition)) {
      if (!condition.some((c: WhereClause) => matchesWhere(record, c))) return false;
      continue;
    }
    const resolved = resolveValue(condition);
    if (resolved) {
      if (record[key] !== resolved.value) return false;
    } else {
      // Nested object without "equals" — skip (e.g. unsupported operators)
    }
  }
  return true;
}

// --- Fake Prisma compatible with BetterAuth's prismaAdapter call patterns ---

class FakePrismaService {
  private users: StoredUser[] = [];
  private accounts: StoredAccount[] = [];
  private sessions: StoredSession[] = [];
  private verifications: StoredVerification[] = [];
  private idCounter = 0;

  private nextId() {
    return `fake_${++this.idCounter}`;
  }

  reset() {
    this.users = [];
    this.accounts = [];
    this.sessions = [];
    this.verifications = [];
    this.idCounter = 0;
  }

  seedUser(input: {
    user: Omit<StoredUser, "lastLogin" | "createdAt" | "updatedAt">;
    passwordHash: string;
  }) {
    const now = new Date("2026-05-01T00:00:00.000Z");
    const user: StoredUser = { lastLogin: null, createdAt: now, updatedAt: now, ...input.user };
    this.users.push(user);
    this.accounts.push({
      id: this.nextId(),
      // BetterAuth credential accounts use email as accountId
      accountId: input.user.email,
      providerId: "credential",
      password: input.passwordHash,
      userId: input.user.id,
      accessToken: null,
      refreshToken: null,
      idToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      scope: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  readonly user = {
    findUnique: async ({
      where,
    }: {
      where: WhereClause;
      select?: unknown;
    }): Promise<StoredUser | null> =>
      this.users.find((u) => matchesWhere(u as unknown as Record<string, unknown>, where)) ?? null,

    findFirst: async ({
      where,
    }: {
      where: WhereClause;
      select?: unknown;
    }): Promise<StoredUser | null> =>
      this.users.find((u) => matchesWhere(u as unknown as Record<string, unknown>, where)) ?? null,

    create: async ({
      data,
    }: {
      data: Partial<StoredUser> & { id?: string };
      select?: unknown;
    }): Promise<StoredUser> => {
      const now = new Date();
      const user: StoredUser = {
        id: data.id ?? this.nextId(),
        name: data.name ?? "",
        email: data.email ?? "",
        emailVerified: data.emailVerified ?? false,
        image: data.image ?? "",
        username: data.username ?? null,
        role: (data.role as StoredUser["role"]) ?? "USER",
        department: data.department ?? [],
        status: (data.status as StoredUser["status"]) ?? "ACTIVE",
        lastLogin: null,
        createdAt: data.createdAt ?? now,
        updatedAt: data.updatedAt ?? now,
      };
      this.users.push(user);
      return user;
    },

    findMany: async ({
      where,
    }: {
      where?: WhereClause;
      take?: number;
      skip?: number;
      orderBy?: unknown;
      select?: unknown;
    }): Promise<StoredUser[]> => {
      if (!where) return [...this.users];
      return this.users.filter((u) =>
        matchesWhere(u as unknown as Record<string, unknown>, where),
      );
    },

    update: async ({
      where,
      data,
    }: {
      where: WhereClause;
      data: Partial<StoredUser>;
      select?: unknown;
    }): Promise<StoredUser> => {
      const found = this.users.find((u) =>
        matchesWhere(u as unknown as Record<string, unknown>, where),
      );
      if (!found) throw new Error(`User not found for where: ${JSON.stringify(where)}`);
      Object.assign(found, data);
      found.updatedAt = new Date();
      return found;
    },
  };

  readonly account = {
    findFirst: async ({
      where,
    }: {
      where: WhereClause;
      select?: unknown;
    }): Promise<StoredAccount | null> =>
      this.accounts.find((a) =>
        matchesWhere(a as unknown as Record<string, unknown>, where),
      ) ?? null,

    create: async ({
      data,
    }: {
      data: Partial<StoredAccount> & { id?: string };
      select?: unknown;
    }): Promise<StoredAccount> => {
      const now = new Date();
      const account: StoredAccount = {
        id: data.id ?? this.nextId(),
        accountId: data.accountId ?? "",
        providerId: data.providerId ?? "",
        password: data.password ?? null,
        userId: data.userId ?? "",
        accessToken: data.accessToken ?? null,
        refreshToken: data.refreshToken ?? null,
        idToken: data.idToken ?? null,
        accessTokenExpiresAt: data.accessTokenExpiresAt ?? null,
        refreshTokenExpiresAt: data.refreshTokenExpiresAt ?? null,
        scope: data.scope ?? null,
        createdAt: data.createdAt ?? now,
        updatedAt: data.updatedAt ?? now,
      };
      this.accounts.push(account);
      return account;
    },

    findMany: async ({
      where,
    }: {
      where?: WhereClause;
      take?: number;
      skip?: number;
      orderBy?: unknown;
      select?: unknown;
    }): Promise<StoredAccount[]> => {
      if (!where) return [...this.accounts];
      return this.accounts.filter((a) =>
        matchesWhere(a as unknown as Record<string, unknown>, where),
      );
    },

    update: async ({
      where,
      data,
    }: {
      where: WhereClause;
      data: Partial<StoredAccount>;
      select?: unknown;
    }): Promise<StoredAccount> => {
      const found = this.accounts.find((a) =>
        matchesWhere(a as unknown as Record<string, unknown>, where),
      );
      if (!found) throw new Error(`Account not found for where: ${JSON.stringify(where)}`);
      Object.assign(found, data);
      found.updatedAt = new Date();
      return found;
    },
  };

  readonly session = {
    findFirst: async ({
      where,
      include,
    }: {
      where: WhereClause;
      include?: { user?: boolean };
      select?: unknown;
    }): Promise<(StoredSession & { user?: StoredUser }) | null> => {
      const session = this.sessions.find((s) =>
        matchesWhere(s as unknown as Record<string, unknown>, where),
      );
      if (!session) return null;
      if (include?.user) {
        const user = this.users.find((u) => u.id === session.userId);
        return user ? { ...session, user } : null;
      }
      return session;
    },

    create: async ({
      data,
    }: {
      data: Partial<StoredSession> & { token: string; userId: string; expiresAt: Date };
      select?: unknown;
    }): Promise<StoredSession> => {
      const now = new Date();
      const session: StoredSession = {
        id: data.id ?? this.nextId(),
        token: data.token,
        expiresAt: data.expiresAt,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        userId: data.userId,
        createdAt: data.createdAt ?? now,
        updatedAt: data.updatedAt ?? now,
      };
      this.sessions.push(session);
      return session;
    },

    update: async ({
      where,
      data,
    }: {
      where: WhereClause;
      data: Partial<StoredSession>;
      select?: unknown;
    }): Promise<StoredSession> => {
      const found = this.sessions.find((s) =>
        matchesWhere(s as unknown as Record<string, unknown>, where),
      );
      if (!found) throw new Error(`Session not found for where: ${JSON.stringify(where)}`);
      Object.assign(found, data);
      found.updatedAt = new Date();
      return found;
    },

    delete: async ({
      where,
    }: {
      where: WhereClause;
    }): Promise<StoredSession> => {
      const idx = this.sessions.findIndex((s) =>
        matchesWhere(s as unknown as Record<string, unknown>, where),
      );
      if (idx === -1) throw new Error(`Session not found for where: ${JSON.stringify(where)}`);
      const [removed] = this.sessions.splice(idx, 1);
      return removed!;
    },

    findMany: async ({
      where,
    }: {
      where?: WhereClause;
      take?: number;
      skip?: number;
      orderBy?: unknown;
      select?: unknown;
    }): Promise<StoredSession[]> => {
      if (!where) return [...this.sessions];
      return this.sessions.filter((s) =>
        matchesWhere(s as unknown as Record<string, unknown>, where),
      );
    },

    deleteMany: async ({
      where,
    }: {
      where: WhereClause;
    }): Promise<{ count: number }> => {
      const before = this.sessions.length;
      this.sessions = this.sessions.filter(
        (s) => !matchesWhere(s as unknown as Record<string, unknown>, where),
      );
      return { count: before - this.sessions.length };
    },
  };

  readonly verification = {
    findFirst: async ({
      where,
    }: {
      where: WhereClause;
      select?: unknown;
    }): Promise<StoredVerification | null> =>
      this.verifications.find((v) =>
        matchesWhere(v as unknown as Record<string, unknown>, where),
      ) ?? null,

    create: async ({
      data,
    }: {
      data: Partial<StoredVerification> & { id?: string };
      select?: unknown;
    }): Promise<StoredVerification> => {
      const now = new Date();
      const v: StoredVerification = {
        id: data.id ?? this.nextId(),
        identifier: data.identifier ?? "",
        value: data.value ?? "",
        expiresAt: data.expiresAt ?? new Date(Date.now() + 3600_000),
        createdAt: data.createdAt ?? now,
        updatedAt: data.updatedAt ?? now,
      };
      this.verifications.push(v);
      return v;
    },

    update: async ({
      where,
      data,
    }: {
      where: WhereClause;
      data: Partial<StoredVerification>;
    }): Promise<StoredVerification> => {
      const found = this.verifications.find((v) =>
        matchesWhere(v as unknown as Record<string, unknown>, where),
      );
      if (!found) throw new Error(`Verification not found`);
      Object.assign(found, data);
      found.updatedAt = new Date();
      return found;
    },

    delete: async ({ where }: { where: WhereClause }) => {
      const idx = this.verifications.findIndex((v) =>
        matchesWhere(v as unknown as Record<string, unknown>, where),
      );
      if (idx !== -1) this.verifications.splice(idx, 1);
    },

    deleteMany: async ({ where }: { where: WhereClause }) => {
      const before = this.verifications.length;
      this.verifications = this.verifications.filter(
        (v) => !matchesWhere(v as unknown as Record<string, unknown>, where),
      );
      return { count: before - this.verifications.length };
    },
  };

  async isReady() {
    return true;
  }
}

class FakeCacheService {
  private store = new Map<string, unknown>();

  reset() {
    this.store.clear();
  }

  async delete(key: string) {
    this.store.delete(key);
  }

  async get<TValue>(key: string) {
    const value = this.store.get(key);
    return value === undefined ? null : (structuredClone(value) as TValue);
  }

  async getAndDelete<TValue>(key: string) {
    const value = this.store.get(key);
    this.store.delete(key);
    return value === undefined ? null : (structuredClone(value) as TValue);
  }

  async increment() {
    return null;
  }

  async isReady() {
    return true;
  }

  async set<TValue>(key: string, value: TValue) {
    this.store.set(key, structuredClone(value));
  }

  async setStrict<TValue>(key: string, value: TValue) {
    this.store.set(key, structuredClone(value));
  }

  setCaptcha(captchaId: string, answer: string) {
    this.store.set(`auth:captcha:${captchaId}`, answer.toLowerCase());
  }
}

// BetterAuth sets cookie name "real_demo.session_token" (cookiePrefix + ".session_token")
const extractSessionCookie = (
  cookieHeader: string | string[] | undefined,
): string | null => {
  const cookies = Array.isArray(cookieHeader)
    ? cookieHeader
    : cookieHeader
      ? [cookieHeader]
      : [];
  for (const cookie of cookies) {
    if (cookie.startsWith("real_demo.session_token=")) {
      return cookie.split(";")[0] ?? null;
    }
  }
  return null;
};

describe("App (e2e)", () => {
  let app: NestExpressApplication;

  const prismaService = new FakePrismaService();
  const cacheService = new FakeCacheService();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaService)
      .overrideProvider(CacheService)
      .useValue(cacheService)
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    await configureApp(app);
    await app.init();

    const passwordService = app.get(PasswordService);
    const passwordHash = await passwordService.hash(ADMIN_PASSWORD);
    prismaService.seedUser({
      user: {
        id: "u_admin",
        name: "Admin User",
        email: ADMIN_EMAIL,
        emailVerified: true,
        image: "",
        username: "admin",
        role: "ADMIN",
        department: [],
        status: "ACTIVE",
      },
      passwordHash,
    });
  });

  beforeEach(() => {
    cacheService.reset();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns a success envelope for /health", async () => {
    const response = await request(app.getHttpServer())
      .get("/health")
      .expect(200);

    expect(response.body).toMatchObject({
      data: {
        services: {
          cache: "up",
          database: "up",
        },
        status: "ok",
      },
      success: true,
    });
    expect(response.body.meta.requestId).toEqual(expect.any(String));
    expect(response.headers["x-request-id"]).toBe(response.body.meta.requestId);
  });

  it("issues a captcha challenge and stores the answer in the cache", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/captcha")
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        captchaId: expect.any(String),
        svg: expect.stringContaining("<svg"),
      },
    });

    const captchaId: string = response.body.data.captchaId;
    const stored = await cacheService.get<string>(`auth:captcha:${captchaId}`);
    expect(stored).toMatch(/^[a-z0-9]+$/);
  });

  it("rejects sign-in when the captcha is missing", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/sign-in")
      .send({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        captchaId: "",
        captchaAnswer: "",
      })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it("signs in with valid credentials and returns the session user", async () => {
    cacheService.setCaptcha("captcha-1", "abcde");

    const signInResponse = await request(app.getHttpServer())
      .post("/api/v1/auth/sign-in")
      .send({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        captchaId: "captcha-1",
        captchaAnswer: "abcde",
      })
      .expect(200);

    expect(signInResponse.body).toMatchObject({
      success: true,
      data: { authenticated: true },
    });

    const sessionCookie = extractSessionCookie(
      signInResponse.headers["set-cookie"],
    );
    expect(sessionCookie).not.toBeNull();

    const meResponse = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Cookie", sessionCookie!)
      .expect(200);

    expect(meResponse.body).toMatchObject({
      success: true,
      data: {
        email: ADMIN_EMAIL,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
  });

  it("rejects /api/v1/auth/me without a session cookie", async () => {
    await request(app.getHttpServer()).get("/api/v1/auth/me").expect(401);
  });

  it("rejects sign-in with an invalid password", async () => {
    cacheService.setCaptcha("captcha-bad", "abcde");

    await request(app.getHttpServer())
      .post("/api/v1/auth/sign-in")
      .send({
        email: ADMIN_EMAIL,
        password: "wrong-password",
        captchaId: "captcha-bad",
        captchaAnswer: "abcde",
      })
      .expect(401);
  });

  it("signs out and invalidates the session cookie", async () => {
    cacheService.setCaptcha("captcha-2", "abcde");

    const signInResponse = await request(app.getHttpServer())
      .post("/api/v1/auth/sign-in")
      .send({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        captchaId: "captcha-2",
        captchaAnswer: "abcde",
      })
      .expect(200);

    const sessionCookie = extractSessionCookie(
      signInResponse.headers["set-cookie"],
    );
    expect(sessionCookie).not.toBeNull();

    await request(app.getHttpServer())
      .post("/api/v1/auth/sign-out")
      .set("Cookie", sessionCookie!)
      .expect(200);

    await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Cookie", sessionCookie!)
      .expect(401);
  });

  it("blocks the native BetterAuth email sign-in endpoint", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/sign-in/email")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(403);
  });

  it("exposes seeded dev accounts when AUTH_DEV_LOGIN_ENABLED is true in dev", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/auth/dev-accounts")
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        accounts: expect.any(Array),
      },
    });
  });

  it("reports the iOA login status (disabled in this demo)", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/auth/sign-in/ioa/status")
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: { enabled: false },
    });
  });
});
