import type { z } from "zod";

import type {
  CaptchaChallengeSchema,
  ChangePasswordInputSchema,
  DevAccountSchema,
  SessionUserSchema,
  SignInInputSchema,
  UserRoleSchema,
  UserRoleSourceSchema,
  UserStatusSchema,
} from "../schemas/user.js";

export type UserRole = z.infer<typeof UserRoleSchema>;
export type UserStatus = z.infer<typeof UserStatusSchema>;
export type UserRoleSource = z.infer<typeof UserRoleSourceSchema>;
export type SessionUser = z.infer<typeof SessionUserSchema>;
export type SignInInput = z.infer<typeof SignInInputSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordInputSchema>;
export type CaptchaChallenge = z.infer<typeof CaptchaChallengeSchema>;
export type DevAccount = z.infer<typeof DevAccountSchema>;
