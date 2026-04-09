import type { CreateUserDraft, User } from "./user";

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");

export interface ListUsersInput {
  page: number;
  pageSize: number;
}

export interface ListUsersResult {
  totalItems: number;
  users: User[];
}

export class DuplicateUserEmailError extends Error {
  constructor() {
    super("A user with that email already exists.");
    this.name = "DuplicateUserEmailError";
  }
}

export interface UserRepository {
  create(input: CreateUserDraft): Promise<User>;
  findById(id: string): Promise<User | null>;
  list(input: ListUsersInput): Promise<ListUsersResult>;
}
