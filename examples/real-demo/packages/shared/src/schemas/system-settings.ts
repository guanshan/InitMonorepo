import { z } from "zod";

import { createApiSuccessSchema } from "../contracts/api-envelope.js";

const appNameField = z
  .string()
  .trim()
  .min(1, "validation.appName.required")
  .max(64, "validation.appName.tooLong");
const appTaglineField = z.string().trim().max(160);
const supportEmailField = z
  .string()
  .trim()
  .max(255)
  .refine(
    (value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    "validation.email.invalid",
  );
const defaultLocaleField = z.enum(["en", "zh"]);
const defaultThemeField = z.enum(["light", "dark", "system"]);
const signUpEnabledField = z.boolean();
const announcementField = z.string().trim().max(500);

// Defaults belong on the read-side schema so the service can fill in missing
// rows. Keep them off the update-side schema to avoid having `.partial()`
// silently fabricate values for fields the caller never sent.
export const SystemSettingsSchema = z
  .object({
    appName: appNameField,
    appTagline: appTaglineField.default(""),
    supportEmail: supportEmailField.default(""),
    defaultLocale: defaultLocaleField.default("en"),
    defaultTheme: defaultThemeField.default("system"),
    signUpEnabled: signUpEnabledField.default(false),
    announcement: announcementField.default(""),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const UpdateSystemSettingsInputSchema = z
  .object({
    appName: appNameField.optional(),
    appTagline: appTaglineField.optional(),
    supportEmail: supportEmailField.optional(),
    defaultLocale: defaultLocaleField.optional(),
    defaultTheme: defaultThemeField.optional(),
    signUpEnabled: signUpEnabledField.optional(),
    announcement: announcementField.optional(),
  })
  .strict();

export const SystemSettingsResponseSchema =
  createApiSuccessSchema(SystemSettingsSchema);
