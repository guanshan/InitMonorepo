/// <reference types="vitest/config" />

import { reactRouter } from "@react-router/dev/vite";
import { normalizeBasePath } from "@real-demo/shared";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const fixedBasePath = env.VITE_BASE_PATH ? normalizeBasePath(env.VITE_BASE_PATH) : null;

  return {
    base: fixedBasePath ? `${fixedBasePath}/` : "/",
    plugins: [reactRouter()],
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
