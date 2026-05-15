import type { SystemSettings } from "@real-demo/shared";

export const SYSTEM_SETTINGS_KEY = "system";

export const DEFAULT_SYSTEM_SETTINGS: Omit<SystemSettings, "updatedAt"> = {
  appName: "Real Demo",
  appTagline: "Full-stack monorepo reference",
  supportEmail: "",
  defaultLocale: "en",
  defaultTheme: "system",
  signUpEnabled: false,
  announcement: "",
};
