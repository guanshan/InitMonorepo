import type { z } from "zod";

import type {
  CreateUserInputSchema,
  UserRoleSchema,
  UserSchema,
} from "../schemas/user.js";

export type User = z.infer<typeof UserSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;
