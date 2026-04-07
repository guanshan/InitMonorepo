import type { CreateUserInput, User, UserRole } from "@real-demo/shared";

const getUserInitial = (name: string) => name.trim().charAt(0).toUpperCase();

export interface UserListItem {
  email: string;
  id: string;
  initial: string;
  name: string;
  role: UserRole;
}

export interface UserDetailModel extends UserListItem {
  createdAt: Date;
  updatedAt: Date;
}

export type CreateUserDraft = Pick<CreateUserInput, "email" | "name" | "role">;

export const mapCreateUserDraftToDto = (
  input: CreateUserDraft,
): CreateUserInput => ({
  email: input.email,
  name: input.name,
  role: input.role,
});

export const mapUserToListItem = (user: User): UserListItem => ({
  email: user.email,
  id: user.id,
  initial: getUserInitial(user.name),
  name: user.name,
  role: user.role,
});

export const mapUserToDetailModel = (user: User): UserDetailModel => ({
  ...mapUserToListItem(user),
  createdAt: new Date(user.createdAt),
  updatedAt: new Date(user.updatedAt),
});
