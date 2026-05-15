import type { UserRole, UserStatus, UserRoleSource } from "@real-demo/shared";

export type { UserRole, UserStatus, UserRoleSource };

export const ROLE_PRIORITY = {
  USER: 0,
  ADMIN: 1,
  SUPER_ADMIN: 2,
} as const satisfies { readonly [K in UserRole]: number };

export interface SessionUserInternal {
  // id is the cuid string primary key (previously the separate `userId` field).
  id: string;
  // userId is kept as a public-API alias so downstream consumers and the
  // generated SDK schema remain unchanged after the schema migration.
  userId: string;
  name: string;
  email: string;
  image: string;
  username: string;
  role: UserRole;
  baseRole: UserRole;
  roleSource: UserRoleSource;
  department: string[];
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export const AUTH_USER_ACCOUNT_SUSPENDED = "AUTH_USER_ACCOUNT_SUSPENDED";
export const AUTH_USER_ACCOUNT_INACTIVE = "AUTH_USER_ACCOUNT_INACTIVE";
