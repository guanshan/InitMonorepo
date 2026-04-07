import type { INestApplication } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";

import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { joinUrlPath } from "@real-demo/shared";
import { HttpStatus } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { cleanupOpenApiDoc } from "nestjs-zod";

import { AppModule } from "./app.module";
import { loadEnvironment } from "./common/config/env";
import { GlobalExceptionFilter } from "./common/http/global-exception.filter";
import {
  getOrCreateRequestId,
  type RequestWithRequestId,
} from "./common/http/request-id";
import { successResponse } from "./common/http/success-response";
import { HealthService } from "./modules/health/health.service";

const stripLeadingSlash = (value: string) => value.replace(/^\/+/, "");
const APP_RUNTIME_API_BASE_URL_SENTINEL = "__APP_RUNTIME_API_BASE_URL__";
const APP_RUNTIME_BASE_PATH_SENTINEL = "__APP_RUNTIME_BASE_PATH__";
const workspaceRoot = resolve(__dirname, "..", "..", "..");
const frontendDistDirectory = resolve(workspaceRoot, "apps/web/dist");
const frontendIndexHtmlPath = resolve(frontendDistDirectory, "index.html");
const healthRouteSegments = ["health", "ready", "live"] as const;

interface ResponseLike {
  setHeader: (name: string, value: string) => void;
}

interface FrontendRequestLike extends RequestWithRequestId {
  method?: string;
  originalUrl?: string;
  path?: string;
}

interface FrontendResponseLike {
  redirect: (statusCode: number, location: string) => void;
  send: (body: string) => void;
  type: (contentType: string) => void;
}

interface JsonResponseLike {
  json: (body: unknown) => void;
  status: (statusCode: number) => JsonResponseLike;
}

const escapeForRegularExpression = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const escapeForInlineScript = (value: string) =>
  value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("<", "\\u003c");

const getRequestPathname = (request: FrontendRequestLike) =>
  (request.originalUrl ?? request.path ?? "/").split("?")[0] || "/";

const isAssetRequest = (pathname: string) => /\.[a-z0-9]+$/i.test(pathname);

const setSecurityHeaders = (
  _request: unknown,
  response: ResponseLike,
  next: () => void,
) => {
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  next();
};

const attachRequestId = (
  request: RequestWithRequestId,
  response: ResponseLike,
  next: () => void,
) => {
  const requestId = getOrCreateRequestId(request);
  response.setHeader("x-request-id", requestId);
  next();
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
  html
    .replaceAll(
      APP_RUNTIME_API_BASE_URL_SENTINEL,
      escapeForInlineScript(environment.runtimeApiBaseUrl),
    )
    .replaceAll(
      APP_RUNTIME_BASE_PATH_SENTINEL,
      escapeForInlineScript(environment.appBasePath),
    );

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

const registerFrontendHosting = async (
  app: NestExpressApplication,
  environment: ReturnType<typeof loadEnvironment>,
) => {
  try {
    await access(frontendIndexHtmlPath);
  } catch {
    return;
  }

  app.useStaticAssets(frontendDistDirectory, {
    fallthrough: true,
    index: false,
    ...(environment.appBasePath === "/"
      ? {}
      : { prefix: environment.appBasePath }),
  });

  const httpAdapter = app.getHttpAdapter().getInstance() as {
    get: (
      path: RegExp,
      handler: (
        request: FrontendRequestLike,
        response: FrontendResponseLike,
        next: () => void,
      ) => void | Promise<void>,
    ) => void;
  };

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

      const indexHtml = await readFile(frontendIndexHtmlPath, "utf8");
      response.type("html");
      response.send(injectRuntimeConfigIntoHtml(indexHtml, environment));
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
  const apiPrefix = stripLeadingSlash(
    joinUrlPath(environment.appBasePath, "api"),
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
  app.use(attachRequestId);
  app.use(setSecurityHeaders);
  app.setGlobalPrefix(apiPrefix);
  app.useGlobalFilters(new GlobalExceptionFilter());
  registerHealthRoutes(app);

  if (environment.swaggerEnabled) {
    const document = cleanupOpenApiDoc(createOpenApiDocument(app));
    SwaggerModule.setup(swaggerPath, app, document, {
      jsonDocumentUrl: swaggerJsonPath,
    });
  }

  await registerFrontendHosting(app, environment);
};

export const createApp = async () => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  await configureApp(app);
  return app;
};
