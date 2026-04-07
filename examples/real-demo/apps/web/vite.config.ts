/// <reference types="vitest/config" />

import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const normalizeBasePath = (input: string | undefined) => {
  const trimmed = (input ?? "").trim();

  if (trimmed.length === 0 || trimmed === "/") {
    return "/";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const normalized = withLeadingSlash.replace(/\/{2,}/g, "/").replace(/\/+$/g, "");

  return normalized.length === 0 ? "/" : normalized;
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const fixedBasePath = env.VITE_BASE_PATH ? normalizeBasePath(env.VITE_BASE_PATH) : null;

  return {
    base: fixedBasePath ? `${fixedBasePath}/` : "./",
    plugins: [react()],
    server: {
      port: 14000,
      proxy: {
        "/api": {
          changeOrigin: true,
          target: "http://localhost:13000",
        },
        "/health": {
          target: "http://localhost:13000",
        },
        "/live": {
          target: "http://localhost:13000",
        },
        "/ready": {
          target: "http://localhost:13000",
        },
      },
      strictPort: true,
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/test/setup.ts",
    },
  };
});
