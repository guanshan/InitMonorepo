import type {
  CreateUserInput as CreateUserRequest,
  User as ApiUser,
} from "@real-demo/shared";

import type { CreateUserDraft, User } from "../domain/user";

export const toCreateUserDraft = (
  request: CreateUserRequest,
): CreateUserDraft => ({
  email: request.email,
  name: request.name,
  role: request.role,
});

export const presentUser = (user: User): ApiUser => ({
  createdAt: user.createdAt.toISOString(),
  email: user.email,
  id: user.id,
  name: user.name,
  role: user.role,
  updatedAt: user.updatedAt.toISOString(),
});

export const presentUsers = (users: User[]) => users.map(presentUser);
