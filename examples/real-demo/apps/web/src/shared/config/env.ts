import { normalizeBasePath } from "@real-demo/shared";
import { z } from "zod";

const APP_RUNTIME_API_BASE_URL_SENTINEL = "__APP_RUNTIME_API_BASE_URL__";

const EnvironmentSchema = z.object({
  VITE_API_BASE_URL: z.string().default(""),
  VITE_APP_NAME: z.string().default("Real Demo"),
  VITE_BASE_PATH: z.string().optional(),
  VITE_DEFAULT_LOCALE: z.string().default("en"),
  VITE_DEFAULT_THEME: z.enum(["system", "light", "dark"]).default("system"),
});

declare global {
  interface Window {
    __APP_CONFIG__?: {
      APP_RUNTIME_API_BASE_URL?: string;
    };
  }
}

const resolveRuntimeValue = (value: string | undefined, sentinel: string) =>
  value && value !== sentinel ? value : undefined;

const parsedEnvironment = EnvironmentSchema.parse(import.meta.env);
const runtimeConfig = typeof window === "undefined" ? undefined : window.__APP_CONFIG__;

export const environment = {
  apiBaseUrl:
    resolveRuntimeValue(
      runtimeConfig?.APP_RUNTIME_API_BASE_URL,
      APP_RUNTIME_API_BASE_URL_SENTINEL,
    ) ?? parsedEnvironment.VITE_API_BASE_URL,
  appName: parsedEnvironment.VITE_APP_NAME,
  appBasePath: normalizeBasePath(parsedEnvironment.VITE_BASE_PATH),
  defaultLocale: parsedEnvironment.VITE_DEFAULT_LOCALE,
  defaultTheme: parsedEnvironment.VITE_DEFAULT_THEME,
};
