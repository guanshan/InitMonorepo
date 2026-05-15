import type { UserRole, UserStatus } from "../domain/auth.types";

export const AUTH_REPOSITORY_PORT = Symbol("AUTH_REPOSITORY_PORT");

export interface AuthUserRecord {
  id: string;
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
  id: string;
  accountId: string;
  providerId: string;
  password: string | null;
  userId: string;
}

export interface AuthRepositoryPort {
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  findAccountByUserIdAndProvider(
    userId: string,
    providerId: string,
  ): Promise<AuthAccountRecord | null>;
  revokeAllSessionsForUser(userId: string): Promise<void>;
  updateUserLastLogin(userId: string): Promise<void>;
  updateAccountPassword(accountId: string, hashedPassword: string): Promise<void>;
}
