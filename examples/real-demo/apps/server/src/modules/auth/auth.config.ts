import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import type { PrismaClient } from "@prisma/client";
import type { RedisClientType } from "redis";

// ---- scrypt password helpers (matches existing PasswordService format) ----

const SCRYPT_PARAMS = {
  N: 16384,
  r: 16,
  p: 1,
  dkLen: 64,
  maxmem: 64 * 1024 * 1024,
} as const;

const deriveKey = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(
      password,
      salt,
      SCRYPT_PARAMS.dkLen,
      { N: SCRYPT_PARAMS.N, r: SCRYPT_PARAMS.r, p: SCRYPT_PARAMS.p, maxmem: SCRYPT_PARAMS.maxmem },
      (err, key) => (err ? reject(err) : resolve(key as Buffer)),
    ),
  );

const hashPassword = async (password: string): Promise<string> => {
  const normalized = password.normalize("NFKC");
  const salt = randomBytes(16).toString("hex");
  const key = await deriveKey(normalized, salt);
  return `${salt}:${key.toString("hex")}`;
};

const verifyPassword = async ({
  hash,
  password,
}: {
  hash: string;
  password: string;
}): Promise<boolean> => {
  const [salt, stored] = hash.split(":");
  if (!salt || !stored) return false;
  const key = await deriveKey(password.normalize("NFKC"), salt);
  const storedBuf = Buffer.from(stored, "hex");
  return key.length === storedBuf.length && timingSafeEqual(key, storedBuf);
};

// ---- factory ----

export interface BetterAuthOptions {
  baseURL: string;
  secret: string;
  trustedOrigins: string[];
  redis?: RedisClientType;
}

export const createBetterAuth = (
  prisma: PrismaClient,
  opts: BetterAuthOptions,
) => {
  const secondaryStorage = opts.redis
    ? {
        get: (key: string) => opts.redis!.get(`ba:${key}`),
        set: async (key: string, value: string, ttl?: number) => {
          if (ttl) {
            await opts.redis!.set(`ba:${key}`, value, { EX: ttl });
          } else {
            await opts.redis!.set(`ba:${key}`, value);
          }
        },
        delete: async (key: string) => {
          await opts.redis!.del(`ba:${key}`);
        },
      }
    : undefined;

  const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
  if (process.env.GITHUB_CLIENT_ID) {
    socialProviders.github = {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    };
  }
  if (process.env.GOOGLE_CLIENT_ID) {
    socialProviders.google = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    };
  }

  return betterAuth({
    database: prismaAdapter(prisma as Parameters<typeof prismaAdapter>[0], {
      provider: "mysql",
    }),
    baseURL: opts.baseURL,
    basePath: "/api/auth",
    secret: opts.secret,
    trustedOrigins: opts.trustedOrigins,
    emailAndPassword: {
      enabled: true,
      // User creation is admin-only; BetterAuth should not self-register.
      disableSignUp: true,
      password: { hash: hashPassword, verify: verifyPassword },
    },
    session: {
      expiresIn: 7 * 24 * 60 * 60,
      updateAge: 24 * 60 * 60,
    },
    advanced: {
      // Cookie will be named "real_demo.session_token".
      cookiePrefix: "real_demo",
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      },
    },
    user: {
      additionalFields: {
        username: { type: "string", required: false, input: false },
        role: { type: "string", defaultValue: "USER", input: false },
        status: { type: "string", defaultValue: "ACTIVE", input: false },
        department: { type: "string", defaultValue: "[]", input: false },
        lastLogin: { type: "date", required: false, input: false },
      },
    },
    databaseHooks: {
      session: {
        create: {
          after: async (session) => {
            await prisma.user.update({
              where: { id: session.userId },
              data: { lastLogin: new Date() },
            });
          },
        },
      },
      user: {
        create: {
          // For OAuth sign-ins, auto-derive username from email when not provided.
          before: async (data) => ({
            data: {
              ...data,
              username:
                (data as Record<string, unknown>).username ??
                `${(data.email as string).split("@")[0]}_${Date.now().toString(36)}`,
            },
          }),
        },
      },
    },
    socialProviders: socialProviders as Parameters<typeof betterAuth>[0]["socialProviders"],
    ...(secondaryStorage ? { secondaryStorage } : {}),
  });
};

export type BetterAuthInstance = ReturnType<typeof createBetterAuth>;
