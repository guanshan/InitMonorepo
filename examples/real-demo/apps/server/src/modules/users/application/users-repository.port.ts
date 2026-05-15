import type { UserRole, UserStatus } from "../../auth/domain/auth.types";

export const USERS_REPOSITORY_PORT = Symbol("USERS_REPOSITORY_PORT");

export interface AdminUserRecord {
  // id is now the cuid string primary key (was `userId` before the schema migration).
  id: string;
  // userId is an alias for id kept for backward compatibility with existing
  // controller responses and the generated SDK.
  userId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  username: string;
  image: string;
  role: UserRole;
  status: UserStatus;
  /**
   * Normalised at the repository boundary so consumers can rely on the type.
   * The underlying column is `Json` (Prisma); rows that ever held malformed
   * JSON become `[]` rather than leaking `unknown` upward.
   */
  department: string[];
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListAdminUsersInput {
  page: number;
  pageSize: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface ListAdminUsersResult {
  items: AdminUserRecord[];
  totalItems: number;
}

export interface CreateAdminUserInput {
  email: string;
  name: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  department: string[];
}

export interface UpdateAdminUserInput {
  name?: string;
  username?: string;
  role?: UserRole;
  status?: UserStatus;
  department?: string[];
}

export interface UsersRepositoryPort {
  list(input: ListAdminUsersInput): Promise<ListAdminUsersResult>;
  findByUserId(userId: string): Promise<AdminUserRecord | null>;
  findByEmail(email: string): Promise<AdminUserRecord | null>;
  findByUsername(username: string): Promise<AdminUserRecord | null>;
  /** Count of `role=SUPER_ADMIN AND status=ACTIVE` rows; used by the last-admin guard. */
  countActiveSuperAdmins(): Promise<number>;
  create(
    input: CreateAdminUserInput,
    hashedPassword: string,
  ): Promise<AdminUserRecord>;
  update(userId: string, input: UpdateAdminUserInput): Promise<AdminUserRecord>;
  delete(userId: string): Promise<void>;
  resetPassword(userId: string, hashedPassword: string): Promise<void>;
}
