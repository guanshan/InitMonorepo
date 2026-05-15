import { z } from "zod";

import {
  createApiPaginatedSchema,
  createApiSuccessSchema,
} from "../contracts/api-envelope.js";
import { UserRoleSchema, UserStatusSchema } from "./user.js";

export const AdminUserSchema = z
  .object({
    userId: z.string().min(1),
    name: z.string(),
    email: z.string().email(),
    username: z.string(),
    role: UserRoleSchema,
    status: UserStatusSchema,
    department: z.array(z.string()),
    emailVerified: z.boolean(),
    lastLogin: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

const NameSchema = z
  .string()
  .trim()
  .min(1, "validation.name.required")
  .max(128, "validation.name.tooLong");
const UsernameSchema = z
  .string()
  .trim()
  .min(1, "validation.username.required")
  .max(64, "validation.username.tooLong");
const EmailSchema = z
  .string()
  .trim()
  .min(1, "validation.email.required")
  .max(255, "validation.email.tooLong")
  .email("validation.email.invalid");
const DepartmentSchema = z
  .array(z.string().trim().min(1).max(64))
  .max(8, "validation.department.tooMany");

export const CreateAdminUserInputSchema = z
  .object({
    name: NameSchema,
    username: UsernameSchema.optional(),
    email: EmailSchema,
    role: UserRoleSchema,
    status: UserStatusSchema.default("ACTIVE"),
    department: DepartmentSchema.default([]),
    password: z
      .string()
      .min(8, "validation.password.tooShort")
      .max(128, "validation.password.tooLong"),
  })
  .strict();

export const UpdateAdminUserInputSchema = z
  .object({
    name: NameSchema.optional(),
    username: UsernameSchema.optional(),
    role: UserRoleSchema.optional(),
    status: UserStatusSchema.optional(),
    department: DepartmentSchema.optional(),
  })
  .strict();

export const ResetAdminUserPasswordInputSchema = z
  .object({
    password: z
      .string()
      .min(8, "validation.password.tooShort")
      .max(128, "validation.password.tooLong"),
  })
  .strict();

export const AdminUserListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(128).optional(),
    role: UserRoleSchema.optional(),
    status: UserStatusSchema.optional(),
  })
  .strict();

export const AdminUserResponseSchema = createApiSuccessSchema(AdminUserSchema);
export const AdminUserListResponseSchema =
  createApiPaginatedSchema(AdminUserSchema);
export const AdminUserMutationResponseSchema = createApiSuccessSchema(
  z.object({ changed: z.boolean() }).strict(),
);
