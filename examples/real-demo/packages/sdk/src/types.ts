/**
 * Pure types, schemas, and base client — no React dependency.
 * Import from "@real-demo/sdk/types" to avoid pulling in React.
 */
export * from "./generated/model";
export { ApiRequestError } from "./runtime/fetcher";
export {
  listUsers,
  getUserById,
  createUser,
  getListUsersUrl,
  getGetUserByIdUrl,
  getCreateUserUrl,
} from "./generated/client";
export type {
  listUsersResponse,
  getUserByIdResponse,
  createUserResponse,
} from "./generated/client";
