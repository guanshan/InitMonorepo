import { normalizeBasePath } from "@real-demo/shared";
import { z } from "zod";

const loopbackHostnames = new Set(["localhost", "127.0.0.1", "[::1]"]);
const loopbackOrigins = ["localhost", "127.0.0.1", "[::1]"];

const BooleanEnvironmentSchema = z
  .enum(["true", "false"])
  .default("true")
  .transform((value) => value === "true");

const EnvironmentSchema = z.object({
  APP_BASE_PATH: z.string().default("/"),
  APP_RUNTIME_API_BASE_URL: z.string().default(""),
  CORS_ORIGIN: z.string().default("http://localhost:14000"),
  DATABASE_URL: z.string().trim().optional(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(13000),
  REDIS_URL: z.string().trim().optional(),
  SWAGGER_ENABLED: BooleanEnvironmentSchema,
});

type Environment = {
  appBasePath: string;
  corsOrigins: string[];
  databaseUrl: string;
  logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";
  nodeEnv: "development" | "test" | "production";
  port: number;
  redisUrl: string;
  runtimeApiBaseUrl: string;
  swaggerEnabled: boolean;
};

const resolveConnectionString = (
  name: "DATABASE_URL" | "REDIS_URL",
  value: string | undefined,
  fallback: string | undefined,
) => {
  const resolvedValue = value?.trim() || fallback;

  if (!resolvedValue) {
    throw new Error(
      `${name} must be provided via the environment for production deployments.`,
    );
  }

  return resolvedValue;
};

const expandLoopbackCorsOrigin = (origin: string) => {
  const trimmedOrigin = origin.trim();

  if (trimmedOrigin.length === 0) {
    return [];
  }

  try {
    const parsedOrigin = new URL(trimmedOrigin);

    if (!loopbackHostnames.has(parsedOrigin.hostname)) {
      return [trimmedOrigin];
    }

    const portSuffix = parsedOrigin.port.length > 0 ? `:${parsedOrigin.port}` : "";

    return loopbackOrigins.map(
      (hostname) => `${parsedOrigin.protocol}//${hostname}${portSuffix}`,
    );
  } catch {
    return [trimmedOrigin];
  }
};

export const loadEnvironment = (): Environment => {
  const parsed = EnvironmentSchema.parse(process.env);
  const normalizedAppBasePath = normalizeBasePath(parsed.APP_BASE_PATH);
  const normalizedRuntimeApiBaseUrl =
    parsed.APP_RUNTIME_API_BASE_URL.trim().length > 0
      ? parsed.APP_RUNTIME_API_BASE_URL.trim()
      : normalizedAppBasePath === "/"
        ? ""
        : normalizedAppBasePath;
  const localDatabaseUrl = "mysql://app:app@localhost:13306/real_demo";
  const localRedisUrl = "redis://localhost:16379";
  const databaseUrl = resolveConnectionString(
    "DATABASE_URL",
    parsed.DATABASE_URL,
    parsed.NODE_ENV === "production" ? undefined : localDatabaseUrl,
  );
  const redisUrl = resolveConnectionString(
    "REDIS_URL",
    parsed.REDIS_URL,
    parsed.NODE_ENV === "production" ? undefined : localRedisUrl,
  );

  return {
    appBasePath: normalizedAppBasePath,
    corsOrigins: [...new Set(parsed.CORS_ORIGIN.split(",").flatMap(expandLoopbackCorsOrigin))],
    databaseUrl,
    logLevel: parsed.LOG_LEVEL,
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    redisUrl,
    runtimeApiBaseUrl: normalizedRuntimeApiBaseUrl,
    swaggerEnabled: parsed.SWAGGER_ENABLED,
  };
};
