import type { z } from "zod";

import type {
  AdminUserListQuerySchema,
  AdminUserSchema,
  CreateAdminUserInputSchema,
  ResetAdminUserPasswordInputSchema,
  UpdateAdminUserInputSchema,
} from "../schemas/admin-user.js";

export type AdminUser = z.infer<typeof AdminUserSchema>;
export type CreateAdminUserInput = z.infer<typeof CreateAdminUserInputSchema>;
export type UpdateAdminUserInput = z.infer<typeof UpdateAdminUserInputSchema>;
export type ResetAdminUserPasswordInput = z.infer<
  typeof ResetAdminUserPasswordInputSchema
>;
export type AdminUserListQuery = z.infer<typeof AdminUserListQuerySchema>;
