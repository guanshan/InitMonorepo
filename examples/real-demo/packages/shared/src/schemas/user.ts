import { z } from "zod";

import { createApiSuccessSchema } from "../contracts/api-envelope.js";

export const UserRoleSchema = z.enum(["SUPER_ADMIN", "ADMIN", "USER"]);
export const UserStatusSchema = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]);
export const UserRoleSourceSchema = z.enum(["base", "direct", "department"]);

export const SessionUserSchema = z
  .object({
    userId: z.string().min(1),
    name: z.string(),
    email: z.string().email(),
    username: z.string(),
    role: UserRoleSchema,
    baseRole: UserRoleSchema,
    roleSource: UserRoleSourceSchema,
    department: z.array(z.string()),
    status: UserStatusSchema,
    image: z.string(),
  })
  .strict();

export const SignInInputSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "validation.email.required")
      .email("validation.email.invalid"),
    password: z.string().min(1, "validation.password.required"),
    captchaId: z.string().min(1, "validation.captcha.required"),
    captchaAnswer: z
      .string()
      .trim()
      .min(1, "validation.captcha.required")
      .max(16, "validation.captcha.invalid"),
  })
  .strict();

export const CaptchaChallengeSchema = z
  .object({
    captchaId: z.string().min(1),
    svg: z.string().min(1),
  })
  .strict();

export const ChangePasswordInputSchema = z
  .object({
    currentPassword: z.string().min(1, "validation.password.required"),
    newPassword: z.string().min(8, "validation.password.tooShort"),
  })
  .strict();

export const AuthStateSchema = z
  .object({
    authenticated: z.boolean(),
  })
  .strict();

export const IoaStatusSchema = z.object({ enabled: z.boolean() }).strict();

export const DevAccountSchema = z
  .object({
    role: UserRoleSchema,
    email: z.string().email(),
    password: z.string().min(1),
  })
  .strict();

export const DevAccountsListSchema = z
  .object({
    accounts: z.array(DevAccountSchema),
  })
  .strict();

export const SessionUserResponseSchema =
  createApiSuccessSchema(SessionUserSchema);
export const AuthStateResponseSchema = createApiSuccessSchema(AuthStateSchema);
export const CaptchaChallengeResponseSchema = createApiSuccessSchema(
  CaptchaChallengeSchema,
);
export const IoaStatusResponseSchema = createApiSuccessSchema(IoaStatusSchema);
export const DevAccountsResponseSchema =
  createApiSuccessSchema(DevAccountsListSchema);
export const ChangePasswordResponseSchema = createApiSuccessSchema(
  z.object({ changed: z.boolean() }).strict(),
);
