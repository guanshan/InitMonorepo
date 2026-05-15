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

type StoredUser = {
  id: number;
  userId: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string;
  username: string;
  role: "SUPER_ADMIN" | "ADMIN" | "USER";
  department: unknown;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type StoredAccount = {
  id: number;
  accountId: string;
  providerId: string;
  password: string | null;
  userId: number;
};

type StoredSession = {
  id: number;
  tokenHash: string;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  userId: number;
};

const ADMIN_EMAIL = "admin@local.auth";
const ADMIN_PASSWORD = "Demo#2026.";

class FakePrismaService {
  private users: StoredUser[] = [];
  private accounts: StoredAccount[] = [];
  private sessions: StoredSession[] = [];
  private nextSessionId = 1;
  private nextAccountId = 1;

  reset() {
    this.users = [];
    this.accounts = [];
    this.sessions = [];
    this.nextSessionId = 1;
    this.nextAccountId = 1;
  }

  seedUser(input: {
    user: Omit<StoredUser, "lastLogin" | "createdAt" | "updatedAt">;
    passwordHash: string;
  }) {
    const now = new Date("2026-05-01T00:00:00.000Z");
    const user: StoredUser = {
      lastLogin: null,
      createdAt: now,
      updatedAt: now,
      ...input.user,
    };
    this.users.push(user);
    this.accounts.push({
      id: this.nextAccountId++,
      accountId: input.user.email,
      providerId: "credential",
      password: input.passwordHash,
      userId: input.user.id,
    });
  }

  readonly user = {
    findUnique: async ({ where }: { where: { email?: string; id?: number } }) =>
      this.users.find(
        (user) =>
          (where.email !== undefined && user.email === where.email) ||
          (where.id !== undefined && user.id === where.id),
      ) ?? null,
    update: async ({
      where,
      data,
    }: {
      where: { id: number };
      data: Partial<StoredUser>;
    }) => {
      const found = this.users.find((user) => user.id === where.id);
      if (!found) throw new Error("User not found");
      Object.assign(found, data);
      found.updatedAt = new Date();
      return found;
    },
  };

  readonly account = {
    findFirst: async ({
      where,
    }: {
      where: { userId: number; providerId: string };
    }) =>
      this.accounts.find(
        (account) =>
          account.userId === where.userId &&
          account.providerId === where.providerId,
      ) ?? null,
    update: async ({
      where,
      data,
    }: {
      where: { id: number };
      data: Partial<StoredAccount>;
    }) => {
      const found = this.accounts.find((account) => account.id === where.id);
      if (!found) throw new Error("Account not found");
      Object.assign(found, data);
      return found;
    },
  };

  readonly session = {
    create: async ({
      data,
    }: {
      data: Omit<StoredSession, "id">;
    }) => {
      const session: StoredSession = { id: this.nextSessionId++, ...data };
      this.sessions.push(session);
      return session;
    },
    findUnique: async ({
      where,
    }: {
      where: { tokenHash: string };
      include?: unknown;
    }) => {
      const session = this.sessions.find(
        (s) => s.tokenHash === where.tokenHash,
      );
      if (!session) return null;
      const user = this.users.find((u) => u.id === session.userId);
      if (!user) return null;
      return { ...session, user };
    },
    findMany: async ({
      where,
    }: {
      where: { userId: number };
      select?: unknown;
    }) =>
      this.sessions
        .filter((s) => s.userId === where.userId)
        .map((s) => ({ tokenHash: s.tokenHash })),
    deleteMany: async ({
      where,
    }: {
      where: { tokenHash?: string; userId?: number };
    }) => {
      const before = this.sessions.length;
      this.sessions = this.sessions.filter((s) => {
        if (where.tokenHash !== undefined && s.tokenHash === where.tokenHash) {
          return false;
        }
        if (where.userId !== undefined && s.userId === where.userId) {
          return false;
        }
        return true;
      });
      return { count: before - this.sessions.length };
    },
    delete: async ({ where }: { where: { id: number } }) => {
      const idx = this.sessions.findIndex((s) => s.id === where.id);
      if (idx === -1) throw new Error("Session not found");
      const [removed] = this.sessions.splice(idx, 1);
      return removed!;
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

const extractSessionCookie = (
  cookieHeader: string | string[] | undefined,
): string | null => {
  const cookies = Array.isArray(cookieHeader)
    ? cookieHeader
    : cookieHeader
      ? [cookieHeader]
      : [];
  for (const cookie of cookies) {
    if (cookie.startsWith("real_demo_session=")) {
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
        id: 1,
        userId: "u_admin",
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
    // Re-seed the admin from the original hashed password set in beforeAll.
    const admin = prismaService.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });
    void admin;
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
