import {
  createUser as sdkCreateUser,
  deleteUser as sdkDeleteUser,
  listUsers as sdkListUsers,
  resetUserPassword as sdkResetUserPassword,
  updateUser as sdkUpdateUser,
} from "@real-demo/sdk";
import type {
  AdminUser,
  AdminUserListQuery,
  CreateAdminUserInput,
  Pagination,
  UpdateAdminUserInput,
} from "@real-demo/shared";

export interface AdminUserListResult {
  items: AdminUser[];
  pagination: Pagination;
}

// SDK responses are tagged unions of all documented status codes, but the
// fetcher throws for non-2xx so the success variant is the only one we can
// observe here. Cast to the shared contracts so callers don't have to walk
// the Orval-generated union.
type SdkEnvelope<T> = { success: true; data: T };
type SdkPaginatedEnvelope<T> = SdkEnvelope<T[]> & { pagination: Pagination };

export async function listAdminUsers(
  query: Partial<AdminUserListQuery>,
  options?: { signal?: AbortSignal },
): Promise<AdminUserListResult> {
  const response = await sdkListUsers(
    {
      ...(query.page !== undefined ? { page: query.page } : {}),
      ...(query.pageSize !== undefined ? { pageSize: query.pageSize } : {}),
      ...(query.search ? { search: query.search } : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
    },
    options?.signal ? { signal: options.signal } : undefined,
  );
  const body = response.data as unknown as SdkPaginatedEnvelope<AdminUser>;
  return { items: body.data, pagination: body.pagination };
}

export async function createAdminUser(
  input: CreateAdminUserInput,
): Promise<AdminUser> {
  const response = await sdkCreateUser(input);
  const body = response.data as unknown as SdkEnvelope<AdminUser>;
  return body.data;
}

export async function updateAdminUser(
  userId: string,
  input: UpdateAdminUserInput,
): Promise<AdminUser> {
  const response = await sdkUpdateUser(userId, input);
  const body = response.data as unknown as SdkEnvelope<AdminUser>;
  return body.data;
}

export async function deleteAdminUser(userId: string): Promise<void> {
  await sdkDeleteUser(userId);
}

export async function resetAdminUserPassword(
  userId: string,
  password: string,
): Promise<void> {
  await sdkResetUserPassword(userId, { password });
}
