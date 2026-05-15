import "dotenv/config";

import { randomBytes, scrypt } from "node:crypto";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set to seed the database");
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(databaseUrl),
});

const SCRYPT_PARAMS = {
  N: 16384,
  r: 16,
  p: 1,
  dkLen: 64,
  maxmem: 64 * 1024 * 1024,
} as const;

const hashPassword = (password: string) =>
  new Promise<string>((resolve, reject) => {
    const salt = randomBytes(16).toString("hex");
    scrypt(
      password.normalize("NFKC"),
      salt,
      SCRYPT_PARAMS.dkLen,
      {
        N: SCRYPT_PARAMS.N,
        r: SCRYPT_PARAMS.r,
        p: SCRYPT_PARAMS.p,
        maxmem: SCRYPT_PARAMS.maxmem,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(`${salt}:${(derivedKey as Buffer).toString("hex")}`);
      },
    );
  });

interface SeedAccount {
  email: string;
  name: string;
  username: string;
  role: "SUPER_ADMIN" | "ADMIN" | "USER";
  password: string;
}

const SEED_ACCOUNTS: SeedAccount[] = [
  {
    email: "superadmin@local.auth",
    name: "Super Admin",
    username: "superadmin",
    role: "SUPER_ADMIN",
    password: "Demo#2026.",
  },
  {
    email: "admin@local.auth",
    name: "Admin User",
    username: "admin",
    role: "ADMIN",
    password: "Demo#2026.",
  },
  {
    email: "user@local.auth",
    name: "Demo User",
    username: "demo",
    role: "USER",
    password: "User#2026.",
  },
];

const upsertAccount = async (account: SeedAccount) => {
  const hashedPassword = await hashPassword(account.password);

  // User.id is now a cuid String; upsert by email (stable natural key).
  const user = await prisma.user.upsert({
    where: { email: account.email },
    update: {
      name: account.name,
      username: account.username,
      role: account.role,
      status: "ACTIVE",
      emailVerified: true,
    },
    create: {
      email: account.email,
      name: account.name,
      username: account.username,
      role: account.role,
      status: "ACTIVE",
      emailVerified: true,
    },
  });

  const existing = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });

  if (existing) {
    await prisma.account.update({
      where: { id: existing.id },
      data: { password: hashedPassword, accountId: account.email },
    });
  } else {
    await prisma.account.create({
      data: {
        accountId: account.email,
        providerId: "credential",
        userId: user.id,
        password: hashedPassword,
      },
    });
  }
};

const run = async () => {
  for (const account of SEED_ACCOUNTS) {
    await upsertAccount(account);
  }
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
