import type { INestApplication } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { joinUrlPath } from "@real-demo/shared";
import { HttpStatus, Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { cleanupOpenApiDoc } from "nestjs-zod";

import { AppModule } from "./app.module";
import { cacheKeys } from "./common/cache/cache-keys";
import { CACHE_PORT, type CachePort } from "./common/cache/cache.port";
import { loadEnvironment } from "./common/config/env";
import { GlobalExceptionFilter } from "./common/http/global-exception.filter";
import { runWithRequestContext } from "./common/http/request-context";
import {
  getOrCreateRequestId,
  type RequestWithRequestId,
} from "./common/http/request-id";
import { successResponse } from "./common/http/success-response";
import { HealthService } from "./modules/health/health.service";

const stripLeadingSlash = (value: string) => value.replace(/^\/+/, "");
const APP_RUNTIME_API_BASE_URL_SENTINEL = "__APP_RUNTIME_API_BASE_URL__";
const workspaceRoot = resolve(__dirname, "..", "..", "..");
const frontendDistDirectory = resolve(workspaceRoot, "apps/web/dist/client");
const frontendAssetsDirectory = resolve(frontendDistDirectory, "assets");
const frontendIndexHtmlPath = resolve(frontendDistDirectory, "index.html");
const healthRouteSegments = ["health", "ready", "live"] as const;
const STATIC_ASSET_MAX_AGE_SECONDS = 31_536_000;
const WRITE_API_RATE_LIMIT_MAX_REQUESTS = 10;
const WRITE_API_RATE_LIMIT_WINDOW_SECONDS = 60;
const MEMORY_RATE_LIMIT_MAX_ENTRIES = 10_000;

interface ResponseLike {
  setHeader: (name: string, value: string) => void;
}

interface FrontendRequestLike extends RequestWithRequestId {
  ip?: string;
  method?: string;
  originalUrl?: string;
  path?: string;
  socket?: {
    remoteAddress?: string;
  };
}

interface FrontendResponseLike {
  redirect: (statusCode: number, location: string) => void;
  setHeader: (name: string, value: string) => void;
  send: (body: string) => void;
  type: (contentType: string) => void;
}

interface JsonResponseLike {
  json: (body: unknown) => void;
  status: (statusCode: number) => JsonResponseLike;
}

interface FrontendHostingState {
  contentSecurityPolicy: string;
  indexHtml: string;
}

interface MemoryRateLimitSnapshot {
  count: number;
  expiresAt: number;
}

class FrontendBasePathMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FrontendBasePathMismatchError";
  }
}

class FrontendBuildMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FrontendBuildMissingError";
  }
}

const frontendHostingLogger = new Logger("FrontendHosting");

const escapeForRegularExpression = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const escapeForInlineScript = (value: string) =>
  value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029")
    .replaceAll("<", "\\u003c");

const getRequestPathname = (request: FrontendRequestLike) =>
  (request.originalUrl ?? request.path ?? "/").split("?")[0] || "/";

const isAssetRequest = (pathname: string) => /\.[a-z0-9]+$/i.test(pathname);

const createHashSource = (value: string) =>
  `'sha256-${createHash("sha256").update(value).digest("base64")}'`;

const getInlineScriptHashes = (html: string) =>
  Array.from(
    new Set(
      Array.from(
        html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi),
      )
        .map((match) => match[1] ?? "")
        .filter((content) => content.trim().length > 0)
        .map(createHashSource),
    ),
  );

const getAbsoluteOrigin = (value: string) => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const createContentSecurityPolicy = (
  environment: ReturnType<typeof loadEnvironment>,
  inlineScriptHashes: string[] = [],
) => {
  const connectSrc = new Set(["'self'"]);
  const runtimeApiOrigin = getAbsoluteOrigin(environment.runtimeApiBaseUrl);

  if (runtimeApiOrigin) {
    connectSrc.add(runtimeApiOrigin);
  }

  return [
    `default-src 'self'`,
    `base-uri 'self'`,
    `connect-src ${Array.from(connectSrc).join(" ")}`,
    `font-src 'self' data:`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `img-src 'self' data: blob:`,
    `manifest-src 'self'`,
    `object-src 'none'`,
    `script-src 'self'${inlineScriptHashes.length > 0 ? ` ${inlineScriptHashes.join(" ")}` : ""}`,
    `script-src-attr 'none'`,
    `style-src 'self' 'unsafe-inline'`,
  ].join("; ");
};

const swaggerContentSecurityPolicy = [
  `default-src 'self'`,
  `base-uri 'self'`,
  `font-src 'self' data:`,
  `frame-ancestors 'none'`,
  `img-src 'self' data:`,
  `object-src 'none'`,
  `script-src 'self' 'unsafe-inline'`,
  `style-src 'self' 'unsafe-inline'`,
].join("; ");

const createSecurityHeadersMiddleware = (
  environment: ReturnType<typeof loadEnvironment>,
  frontendContentSecurityPolicy?: string,
) => {
  const apiDocsPath = joinUrlPath(environment.appBasePath, "api/docs");
  const defaultContentSecurityPolicy =
    frontendContentSecurityPolicy ?? createContentSecurityPolicy(environment);

  return (
    request: FrontendRequestLike,
    response: ResponseLike,
    next: () => void,
  ) => {
    const pathname = getRequestPathname(request);

    response.setHeader(
      "Content-Security-Policy",
      environment.swaggerEnabled && pathname.startsWith(apiDocsPath)
        ? swaggerContentSecurityPolicy
        : defaultContentSecurityPolicy,
    );
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    next();
  };
};

const attachRequestId = (
  request: RequestWithRequestId,
  response: ResponseLike,
  next: () => void,
) => {
  const requestId = getOrCreateRequestId(request);
  response.setHeader("x-request-id", requestId);
  runWithRequestContext(
    {
      requestId,
    },
    next,
  );
};

const getReservedHealthPaths = (
  environment: ReturnType<typeof loadEnvironment>,
) =>
  healthRouteSegments.flatMap((segment) =>
    environment.appBasePath === "/"
      ? [joinUrlPath("/", segment)]
      : [
          joinUrlPath("/", segment),
          joinUrlPath(environment.appBasePath, segment),
        ],
  );

const shouldServeFrontendRoute = (
  request: FrontendRequestLike,
  environment: ReturnType<typeof loadEnvironment>,
) => {
  if ((request.method ?? "GET").toUpperCase() !== "GET") {
    return false;
  }

  const pathname = getRequestPathname(request);

  if (isAssetRequest(pathname)) {
    return false;
  }

  if (pathname.startsWith(joinUrlPath(environment.appBasePath, "api"))) {
    return false;
  }

  if (getReservedHealthPaths(environment).includes(pathname)) {
    return false;
  }

  if (
    environment.swaggerEnabled &&
    pathname.startsWith(joinUrlPath(environment.appBasePath, "api/docs"))
  ) {
    return false;
  }

  return true;
};

const injectRuntimeConfigIntoHtml = (
  html: string,
  environment: ReturnType<typeof loadEnvironment>,
) =>
  html.replaceAll(
    APP_RUNTIME_API_BASE_URL_SENTINEL,
    escapeForInlineScript(environment.runtimeApiBaseUrl),
  );

const validateFrontendBasePath = (
  rawHtml: string,
  environment: ReturnType<typeof loadEnvironment>,
) => {
  const expectedPrefix =
    environment.appBasePath === "/" ? "/" : `${environment.appBasePath}/`;
  const modulePreloadMatch = rawHtml.match(
    /<link\b[^>]*\brel="modulepreload"[^>]*\bhref="([^"]+)"/,
  );
  const inlineImportMatch = rawHtml.match(
    /import\s+["']([^"']+\.js)["']/,
  );
  const assetRef = modulePreloadMatch?.[1] ?? inlineImportMatch?.[1];

  if (!assetRef) {
    return;
  }

  const assetsSegmentIndex = assetRef.indexOf("/assets/");
  const inferredPrefix =
    assetsSegmentIndex <= 0 ? "/" : `${assetRef.slice(0, assetsSegmentIndex)}/`;

  if (inferredPrefix !== expectedPrefix) {
    throw new FrontendBasePathMismatchError(
      `Frontend assets were built for a different base path. ` +
        `Expected asset prefix "${expectedPrefix}" but found "${inferredPrefix}" ` +
        `(from "${assetRef}"). ` +
        `Ensure VITE_BASE_PATH matches APP_BASE_PATH="${environment.appBasePath}" during the web build.`,
    );
  }
};

const loadFrontendHostingState = async (
  environment: ReturnType<typeof loadEnvironment>,
): Promise<FrontendHostingState | null> => {
  try {
    await access(frontendIndexHtmlPath);
  } catch {
    if (environment.nodeEnv === "production") {
      throw new FrontendBuildMissingError(
        `Built frontend assets were not found at "${frontendIndexHtmlPath}". ` +
          `Run the web build before starting the production server.`,
      );
    }

    return null;
  }

  const rawHtml = await readFile(frontendIndexHtmlPath, "utf8");

  try {
    validateFrontendBasePath(rawHtml, environment);
  } catch (error) {
    if (
      error instanceof FrontendBasePathMismatchError &&
      environment.nodeEnv !== "production"
    ) {
      frontendHostingLogger.warn(
        `${error.message} Skipping frontend hosting for this non-production process until the web app is rebuilt.`,
      );
      return null;
    }

    throw error;
  }

  const indexHtml = injectRuntimeConfigIntoHtml(rawHtml, environment);

  return {
    contentSecurityPolicy: createContentSecurityPolicy(
      environment,
      getInlineScriptHashes(indexHtml),
    ),
    indexHtml,
  };
};

const setStaticAssetCacheHeaders = (
  response: ResponseLike,
  filePath: string,
) => {
  if (filePath.startsWith(frontendAssetsDirectory)) {
    response.setHeader(
      "Cache-Control",
      `public, max-age=${STATIC_ASSET_MAX_AGE_SECONDS}, immutable`,
    );
    return;
  }

  response.setHeader("Cache-Control", "public, max-age=300");
};

const sendFrontendIndex = (
  response: FrontendResponseLike,
  frontendHostingState: FrontendHostingState,
) => {
  response.setHeader("Cache-Control", "no-cache");
  response.type("html");
  response.send(frontendHostingState.indexHtml);
};

const getClientIpAddress = (request: FrontendRequestLike) => {
  return (
    request.ip?.trim() || request.socket?.remoteAddress?.trim() || "unknown"
  );
};

const createWriteApiRateLimitMiddleware = (
  app: NestExpressApplication,
  environment: ReturnType<typeof loadEnvironment>,
) => {
  const cacheService = app.get<CachePort>(CACHE_PORT);
  const apiPrefix = joinUrlPath(environment.appBasePath, "api/v1");
  const limitedMethods = new Set(["DELETE", "PATCH", "POST", "PUT"]);
  const logger = new Logger("WriteApiRateLimit");
  const memoryRateLimitSnapshots = new Map<string, MemoryRateLimitSnapshot>();
  let usingMemoryFallback = false;

  const incrementMemoryRateLimit = (ipAddress: string) => {
    const now = Date.now();
    const existingSnapshot = memoryRateLimitSnapshots.get(ipAddress);

    if (!existingSnapshot || existingSnapshot.expiresAt <= now) {
      if (
        !existingSnapshot &&
        memoryRateLimitSnapshots.size >= MEMORY_RATE_LIMIT_MAX_ENTRIES
      ) {
        for (const [key, snapshot] of memoryRateLimitSnapshots) {
          if (snapshot.expiresAt <= now) {
            memoryRateLimitSnapshots.delete(key);
          }
        }

        if (memoryRateLimitSnapshots.size >= MEMORY_RATE_LIMIT_MAX_ENTRIES) {
          return WRITE_API_RATE_LIMIT_MAX_REQUESTS + 1;
        }
      }

      memoryRateLimitSnapshots.set(ipAddress, {
        count: 1,
        expiresAt: now + WRITE_API_RATE_LIMIT_WINDOW_SECONDS * 1000,
      });
      return 1;
    }

    existingSnapshot.count += 1;
    return existingSnapshot.count;
  };

  const activateMemoryFallback = (reason: string) => {
    if (usingMemoryFallback) {
      return;
    }

    usingMemoryFallback = true;
    logger.warn(
      `Redis-backed write rate limiting is unavailable; falling back to in-memory protection. ${reason}`,
    );
  };

  const clearMemoryFallback = () => {
    if (!usingMemoryFallback) {
      return;
    }

    usingMemoryFallback = false;
    memoryRateLimitSnapshots.clear();
    logger.log("Redis-backed write rate limiting recovered.");
  };

  return async (
    request: FrontendRequestLike,
    response: JsonResponseLike & ResponseLike,
    next: () => void,
  ) => {
    const requestMethod = (request.method ?? "GET").toUpperCase();

    if (!limitedMethods.has(requestMethod)) {
      next();
      return;
    }

    if (!getRequestPathname(request).startsWith(apiPrefix)) {
      next();
      return;
    }

    const clientIpAddress = getClientIpAddress(request);
    let requestCount: number;

    try {
      const redisRequestCount = await cacheService.increment(
        cacheKeys.rateLimit.byIp(clientIpAddress),
        WRITE_API_RATE_LIMIT_WINDOW_SECONDS,
      );

      if (redisRequestCount === null) {
        activateMemoryFallback(
          "Redis returned no counter result for the current request window.",
        );
        requestCount = incrementMemoryRateLimit(clientIpAddress);
      } else {
        clearMemoryFallback();
        requestCount = redisRequestCount;
      }
    } catch (error) {
      activateMemoryFallback(
        `Last error: ${error instanceof Error ? error.message : "unknown error"}`,
      );
      requestCount = incrementMemoryRateLimit(clientIpAddress);
    }

    if (requestCount <= WRITE_API_RATE_LIMIT_MAX_REQUESTS) {
      next();
      return;
    }

    response.setHeader(
      "Retry-After",
      String(WRITE_API_RATE_LIMIT_WINDOW_SECONDS),
    );
    response.status(HttpStatus.TOO_MANY_REQUESTS).json({
      success: false as const,
      error: {
        code: "rate_limit_exceeded",
        message: "Too many write requests from this IP. Please retry later.",
      },
      meta: {
        requestId: getOrCreateRequestId(request),
        timestamp: new Date().toISOString(),
      },
    });
  };
};

const registerHealthRoutes = (app: NestExpressApplication) => {
  const healthService = app.get(HealthService);
  const httpAdapter = app.getHttpAdapter().getInstance() as {
    get: (
      path: string,
      handler: (
        request: FrontendRequestLike,
        response: JsonResponseLike,
      ) => void | Promise<void>,
    ) => void;
  };

  const createReadinessHandler = async (
    request: FrontendRequestLike,
    response: JsonResponseLike,
  ) => {
    const snapshot = await healthService.createReadinessSnapshot();

    if (!snapshot.ready) {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    response.json(
      successResponse(
        {
          services: snapshot.services,
          status: snapshot.ready ? "ok" : "degraded",
        },
        {
          requestId: getOrCreateRequestId(request),
        },
      ),
    );
  };

  const createLivenessHandler = (
    request: FrontendRequestLike,
    response: JsonResponseLike,
  ) => {
    response.json(
      successResponse(healthService.createLivenessSnapshot(), {
        requestId: getOrCreateRequestId(request),
      }),
    );
  };

  httpAdapter.get(joinUrlPath("/", "health"), createReadinessHandler);
  httpAdapter.get(joinUrlPath("/", "ready"), createReadinessHandler);
  httpAdapter.get(joinUrlPath("/", "live"), createLivenessHandler);
};

const registerFrontendHosting = (
  app: NestExpressApplication,
  environment: ReturnType<typeof loadEnvironment>,
  frontendHostingState: FrontendHostingState | null,
) => {
  if (!frontendHostingState) {
    return;
  }

  const indexPath = joinUrlPath(environment.appBasePath, "index.html");
  const httpAdapter = app.getHttpAdapter().getInstance() as {
    get: (
      path: string | RegExp,
      handler: (
        request: FrontendRequestLike,
        response: FrontendResponseLike,
        next: () => void,
      ) => void | Promise<void>,
    ) => void;
  };

  httpAdapter.get(indexPath, (_request, response) => {
    sendFrontendIndex(response, frontendHostingState);
  });

  app.useStaticAssets(frontendDistDirectory, {
    fallthrough: true,
    index: false,
    setHeaders: setStaticAssetCacheHeaders,
    ...(environment.appBasePath === "/"
      ? {}
      : { prefix: environment.appBasePath }),
  });

  httpAdapter.get(
    environment.appBasePath === "/"
      ? /.*/
      : new RegExp(
          `^${escapeForRegularExpression(environment.appBasePath)}(?:/.*)?$`,
        ),
    async (request, response, next) => {
      if (!shouldServeFrontendRoute(request, environment)) {
        next();
        return;
      }

      const pathname = getRequestPathname(request);

      if (
        environment.appBasePath !== "/" &&
        pathname === environment.appBasePath
      ) {
        response.redirect(302, `${environment.appBasePath}/`);
        return;
      }

      sendFrontendIndex(response, frontendHostingState);
    },
  );
};

export const createOpenApiDocument = (
  app: INestApplication,
  environment = loadEnvironment(),
) => {
  const builder = new DocumentBuilder()
    .setTitle("Real Demo API")
    .setDescription("User management API for the real demo monorepo.")
    .setVersion("0.1.0")
    .addServer(environment.appBasePath)
    .build();

  const document = SwaggerModule.createDocument(app, builder, {
    operationIdFactory: (_controllerKey, methodKey) => methodKey,
  });

  if (environment.appBasePath !== "/") {
    document.paths = Object.fromEntries(
      Object.entries(document.paths).map(([path, pathItem]) => [
        path.startsWith(environment.appBasePath)
          ? path.slice(environment.appBasePath.length) || "/"
          : path,
        pathItem,
      ]),
    );
  }

  return document;
};

export const configureApp = async (app: NestExpressApplication) => {
  const environment = loadEnvironment();
  const frontendHostingState = await loadFrontendHostingState(environment);
  const apiPrefix = stripLeadingSlash(
    joinUrlPath(environment.appBasePath, "api/v1"),
  );
  const swaggerPath = stripLeadingSlash(
    joinUrlPath(environment.appBasePath, "api/docs"),
  );
  const swaggerJsonPath = stripLeadingSlash(
    joinUrlPath(environment.appBasePath, "api/docs/openapi.json"),
  );

  app.enableCors({
    origin: environment.corsOrigins,
  });
  app.enableShutdownHooks();
  app.set("trust proxy", environment.trustProxy);
  app.use(attachRequestId);
  app.use(
    createSecurityHeadersMiddleware(
      environment,
      frontendHostingState?.contentSecurityPolicy,
    ),
  );
  app.use(createWriteApiRateLimitMiddleware(app, environment));
  app.setGlobalPrefix(apiPrefix);
  app.useGlobalFilters(new GlobalExceptionFilter());
  registerHealthRoutes(app);

  if (environment.swaggerEnabled) {
    const document = cleanupOpenApiDoc(createOpenApiDocument(app));
    SwaggerModule.setup(swaggerPath, app, document, {
      jsonDocumentUrl: swaggerJsonPath,
    });
  }

  registerFrontendHosting(app, environment, frontendHostingState);
};

export const createApp = async () => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  await configureApp(app);
  return app;
};
