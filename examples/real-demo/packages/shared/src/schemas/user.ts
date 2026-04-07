import { z } from "zod";

import { createApiSuccessSchema } from "../contracts/api-envelope.js";

export const UserRoleSchema = z.enum(["ADMIN", "MEMBER", "SUPPORT"]);

export const UserSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(2).max(60),
    email: z.string().email(),
    role: UserRoleSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const CreateUserInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "validation.name.required")
      .min(2, "validation.name.min")
      .max(60, "validation.name.max"),
    email: z
      .string()
      .trim()
      .min(1, "validation.email.required")
      .email("validation.email.invalid"),
    role: UserRoleSchema.default("MEMBER"),
  })
  .strict();

export const UserListSchema = z.array(UserSchema);

export const UserListResponseSchema = createApiSuccessSchema(UserListSchema);
export const UserDetailResponseSchema = createApiSuccessSchema(UserSchema);
export const CreateUserResponseSchema = createApiSuccessSchema(UserSchema);
