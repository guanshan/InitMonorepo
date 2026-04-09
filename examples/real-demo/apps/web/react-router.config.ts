import type { Config } from "@react-router/dev/config";

import { normalizeBasePath } from "@real-demo/shared";

const configuredBasePath = process.env.VITE_BASE_PATH?.trim();

export default {
  appDirectory: "src/app",
  basename: normalizeBasePath(configuredBasePath),
  buildDirectory: "dist",
  ssr: false,
} satisfies Config;
