/**
 * Convenience entry point — re-exports the base client and types.
 * For subpath imports, use "@real-demo/sdk/types" or "@real-demo/sdk/react".
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
