import type { z } from "zod";

import type {
  SystemSettingsSchema,
  UpdateSystemSettingsInputSchema,
} from "../schemas/system-settings.js";

export type SystemSettings = z.infer<typeof SystemSettingsSchema>;
export type UpdateSystemSettingsInput = z.infer<
  typeof UpdateSystemSettingsInputSchema
>;
