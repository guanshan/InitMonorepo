import type { UserRole, UserStatus } from "../domain/auth.types";

export const AUTH_REPOSITORY_PORT = Symbol("AUTH_REPOSITORY_PORT");

export interface AuthUserRecord {
  id: number;
  userId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  username: string | null;
  image: string;
  role: UserRole;
  status: UserStatus;
  department: unknown;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthAccountRecord {
  id: number;
  accountId: string;
  providerId: string;
  password: string | null;
  userId: number;
}

export interface AuthSessionRecord {
  id: number;
  tokenHash: string;
  expiresAt: Date;
  userId: number;
  user: AuthUserRecord;
}

export interface CreateSessionInput {
  tokenHash: string;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  userId: number;
}

export interface AuthRepositoryPort {
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  findAccountByUserIdAndProvider(
    userId: number,
    providerId: string,
  ): Promise<AuthAccountRecord | null>;
  createSession(input: CreateSessionInput): Promise<void>;
  findSessionByTokenHash(tokenHash: string): Promise<AuthSessionRecord | null>;
  deleteSessionByTokenHash(tokenHash: string): Promise<void>;
  deleteSessionsByUserId(userId: number): Promise<{ tokenHashes: string[] }>;
  deleteExpiredSession(sessionId: number): Promise<void>;
  updateUserLastLogin(userId: number): Promise<void>;
  updateAccountPassword(
    accountId: number,
    hashedPassword: string,
  ): Promise<void>;
}
