export const USER_ROLES = ["ADMIN", "MEMBER", "SUPPORT"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface CreateUserDraft {
  email: string;
  name: string;
  role: UserRole;
}

export interface User {
  createdAt: Date;
  email: string;
  id: string;
  name: string;
  role: UserRole;
  updatedAt: Date;
}
