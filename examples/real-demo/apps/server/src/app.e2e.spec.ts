import "reflect-metadata";

import type { NestExpressApplication } from "@nestjs/platform-express";

import { access, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { Prisma } from "@prisma/client";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { AppModule } from "./app.module";
import { configureApp } from "./app.factory";
import { CacheService } from "./infrastructure/cache/cache.service";
import { PrismaService } from "./infrastructure/prisma/prisma.service";

type StoredUser = {
  createdAt: Date;
  email: string;
  id: string;
  name: string;
  role: "ADMIN" | "MEMBER" | "SUPPORT";
  updatedAt: Date;
};

const compareStoredUsers = (left: StoredUser, right: StoredUser) => {
  const createdAtDifference =
    right.createdAt.getTime() - left.createdAt.getTime();

  if (createdAtDifference !== 0) {
    return createdAtDifference;
  }

  return right.id.localeCompare(left.id);
};

const frontendDistDirectory = resolve(
  __dirname,
  "..",
  "..",
  "web",
  "dist",
  "client",
);
const frontendAssetDirectory = resolve(frontendDistDirectory, "assets");
const frontendIndexHtmlPath = resolve(frontendDistDirectory, "index.html");
const createBasePathFixture = (basePath: string, assetFileName: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Real Demo Test Fixture</title>
    <link rel="modulepreload" href="${basePath}/assets/${assetFileName}"/>
    <script>
      window.__APP_CONFIG__ = {
        APP_RUNTIME_API_BASE_URL: "__APP_RUNTIME_API_BASE_URL__"
      };
    </script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

const resolveBuiltAssetFileName = async () => {
  const assetFileNames = (await readdir(frontendAssetDirectory))
    .filter((fileName) => fileName.endsWith(".js"))
    .sort();

  if (assetFileNames.length === 0) {
    throw new Error(
      `No built frontend JavaScript assets were found in ${frontendAssetDirectory}. ` +
        `Run the web build before executing the server e2e suite.`,
    );
  }

  return assetFileNames[0]!;
};

const createSeedUsers = (): StoredUser[] => [
  {
    createdAt: new Date("2026-04-06T00:00:00.000Z"),
    email: "ada@example.com",
    id: "user_1",
    name: "Ada Lovelace",
    role: "ADMIN",
    updatedAt: new Date("2026-04-06T00:00:00.000Z"),
  },
  {
    createdAt: new Date("2026-04-07T00:00:00.000Z"),
    email: "grace@example.com",
    id: "user_2",
    name: "Grace Hopper",
    role: "SUPPORT",
    updatedAt: new Date("2026-04-07T00:00:00.000Z"),
  },
];

class FakePrismaService {
  private users = createSeedUsers();

  async $transaction<T extends readonly unknown[]>(
    operations: { [Key in keyof T]: Promise<T[Key]> },
  ): Promise<T> {
    return Promise.all(operations) as Promise<T>;
  }

  readonly user = {
    create: async ({
      data,
    }: {
      data: Pick<StoredUser, "email" | "name" | "role">;
    }) => {
      if (this.users.some((user) => user.email === data.email)) {
        throw new Prisma.PrismaClientKnownRequestError(
          "Unique constraint failed on the fields: (`email`)",
          {
            clientVersion: "test",
            code: "P2002",
          },
        );
      }

      const createdAt = new Date("2026-04-08T00:00:00.000Z");
      const user: StoredUser = {
        createdAt,
        email: data.email,
        id: `user_${this.users.length + 1}`,
        name: data.name,
        role: data.role,
        updatedAt: createdAt,
      };

      this.users.push(user);

      return user;
    },
    count: async () => this.users.length,
    findMany: async ({
      skip = 0,
      take,
    }: {
      orderBy?: unknown;
      skip?: number;
      take?: number;
    } = {}) => {
      const users = [...this.users].sort(compareStoredUsers);

      return users.slice(skip, take === undefined ? undefined : skip + take);
    },
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.users.find((user) => user.id === where.id) ?? null,
  };

  async isReady() {
    return true;
  }

  reset() {
    this.users = createSeedUsers();
  }

  setUsers(users: StoredUser[]) {
    this.users = [...users];
  }
}

class FakeCacheService {
  private store = new Map<string, unknown>();
  private incrementMode: "normal" | "null" | "throw" = "normal";
  private disabled = false;

  async delete(key: string) {
    if (this.disabled) {
      return;
    }

    this.store.delete(key);
  }

  async get<TValue>(key: string) {
    if (this.disabled) {
      return null;
    }

    const value = this.store.get(key);
    return value === undefined ? null : (structuredClone(value) as TValue);
  }

  async increment(key: string) {
    if (this.incrementMode === "throw") {
      throw new Error("Redis increment failed");
    }

    if (this.incrementMode === "null" || this.disabled) {
      return null;
    }

    const value = Number(this.store.get(key) ?? 0) + 1;
    this.store.set(key, value);
    return value;
  }

  async isReady() {
    return !this.disabled;
  }

  reset() {
    this.store.clear();
    this.incrementMode = "normal";
    this.disabled = false;
  }

  async set<TValue>(key: string, value: TValue) {
    if (this.disabled) {
      return;
    }

    this.store.set(key, structuredClone(value));
  }

  setDisabled(value: boolean) {
    this.disabled = value;
  }

  setIncrementMode(mode: "normal" | "null" | "throw") {
    this.incrementMode = mode;
  }
}

describe("App (e2e)", () => {
  let app: NestExpressApplication;
  let builtFrontendAssetFileName: string;

  const prismaService = new FakePrismaService();
  const cacheService = new FakeCacheService();

  beforeAll(async () => {
    await access(frontendDistDirectory);
    await access(frontendIndexHtmlPath);
    await access(frontendAssetDirectory);
    builtFrontendAssetFileName = await resolveBuiltAssetFileName();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaService)
      .overrideProvider(CacheService)
      .useValue(cacheService)
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    await configureApp(app);
    await app.init();
  });

  beforeEach(() => {
    prismaService.reset();
    cacheService.reset();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns a success envelope for /health", async () => {
    const response = await request(app.getHttpServer())
      .get("/health")
      .expect(200);

    expect(response.body).toMatchObject({
      data: {
        services: {
          cache: "up",
          database: "up",
        },
        status: "ok",
      },
      success: true,
    });
    expect(response.body.meta.requestId).toEqual(expect.any(String));
    expect(response.headers["x-request-id"]).toBe(response.body.meta.requestId);
  });

  it("keeps health endpoints at the root even when the app base path changes", async () => {
    const originalAppBasePath = process.env.APP_BASE_PATH;
    const originalSwaggerEnabled = process.env.SWAGGER_ENABLED;
    const originalHtml = await readFile(frontendIndexHtmlPath, "utf8");

    process.env.APP_BASE_PATH = "/real-demo";
    process.env.SWAGGER_ENABLED = "false";
    await writeFile(
      frontendIndexHtmlPath,
      createBasePathFixture("/real-demo", builtFrontendAssetFileName),
      "utf8",
    );

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaService)
      .overrideProvider(CacheService)
      .useValue(cacheService)
      .compile();

    const basePathApp =
      moduleRef.createNestApplication<NestExpressApplication>();

    try {
      await configureApp(basePathApp);
      await basePathApp.init();

      const response = await request(basePathApp.getHttpServer())
        .get("/health")
        .expect(200);

      expect(response.body).toMatchObject({
        data: {
          services: {
            cache: "up",
            database: "up",
          },
          status: "ok",
        },
        success: true,
      });

      await request(basePathApp.getHttpServer())
        .get("/real-demo/health")
        .expect(404);
      await request(basePathApp.getHttpServer())
        .get("/real-demo/api/health")
        .expect(404);
    } finally {
      if (originalAppBasePath === undefined) {
        delete process.env.APP_BASE_PATH;
      } else {
        process.env.APP_BASE_PATH = originalAppBasePath;
      }

      if (originalSwaggerEnabled === undefined) {
        delete process.env.SWAGGER_ENABLED;
      } else {
        process.env.SWAGGER_ENABLED = originalSwaggerEnabled;
      }

      await writeFile(frontendIndexHtmlPath, originalHtml, "utf8");
      await basePathApp.close();
    }
  });

  it("keeps the OpenAPI server base path aligned with APP_BASE_PATH", async () => {
    const originalAppBasePath = process.env.APP_BASE_PATH;
    const originalNodeEnv = process.env.NODE_ENV;
    const originalSwaggerEnabled = process.env.SWAGGER_ENABLED;
    const originalHtml = await readFile(frontendIndexHtmlPath, "utf8");

    process.env.APP_BASE_PATH = "/real-demo";
    process.env.NODE_ENV = "development";
    process.env.SWAGGER_ENABLED = "true";
    await writeFile(
      frontendIndexHtmlPath,
      createBasePathFixture("/real-demo", builtFrontendAssetFileName),
      "utf8",
    );

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaService)
      .overrideProvider(CacheService)
      .useValue(cacheService)
      .compile();

    const basePathApp =
      moduleRef.createNestApplication<NestExpressApplication>();

    try {
      await configureApp(basePathApp);
      await basePathApp.init();

      const response = await request(basePathApp.getHttpServer())
        .get("/real-demo/api/docs/openapi.json")
        .expect(200);

      expect(response.body.servers).toEqual([
        {
          url: "/real-demo",
        },
      ]);
      expect(response.body.paths).toEqual(
        expect.objectContaining({
          "/api/v1/users": expect.any(Object),
          "/api/v1/users/{id}": expect.any(Object),
        }),
      );
    } finally {
      if (originalAppBasePath === undefined) {
        delete process.env.APP_BASE_PATH;
      } else {
        process.env.APP_BASE_PATH = originalAppBasePath;
      }

      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalNodeEnv;
      }

      if (originalSwaggerEnabled === undefined) {
        delete process.env.SWAGGER_ENABLED;
      } else {
        process.env.SWAGGER_ENABLED = originalSwaggerEnabled;
      }

      await writeFile(frontendIndexHtmlPath, originalHtml, "utf8");
      await basePathApp.close();
    }
  });

  it("skips stale frontend hosting when the built base path mismatches outside production", async () => {
    const originalAppBasePath = process.env.APP_BASE_PATH;
    const originalNodeEnv = process.env.NODE_ENV;
    const originalSwaggerEnabled = process.env.SWAGGER_ENABLED;
    const originalHtml = await readFile(frontendIndexHtmlPath, "utf8");

    process.env.APP_BASE_PATH = "/real-demo";
    process.env.NODE_ENV = "development";
    process.env.SWAGGER_ENABLED = "false";
    await writeFile(
      frontendIndexHtmlPath,
      createBasePathFixture("/another-base-path", builtFrontendAssetFileName),
      "utf8",
    );

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaService)
      .overrideProvider(CacheService)
      .useValue(cacheService)
      .compile();

    const basePathApp =
      moduleRef.createNestApplication<NestExpressApplication>();

    try {
      await configureApp(basePathApp);
      await basePathApp.init();

      await request(basePathApp.getHttpServer()).get("/health").expect(200);
      await request(basePathApp.getHttpServer())
        .get("/real-demo/missing")
        .expect(404);
      await request(basePathApp.getHttpServer())
        .get("/real-demo/index.html")
        .expect(404);
    } finally {
      if (originalAppBasePath === undefined) {
        delete process.env.APP_BASE_PATH;
      } else {
        process.env.APP_BASE_PATH = originalAppBasePath;
      }

      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalNodeEnv;
      }

      if (originalSwaggerEnabled === undefined) {
        delete process.env.SWAGGER_ENABLED;
      } else {
        process.env.SWAGGER_ENABLED = originalSwaggerEnabled;
      }

      await writeFile(frontendIndexHtmlPath, originalHtml, "utf8");
      await basePathApp.close();
    }
  });

  it("fails fast in production when the built frontend shell is missing", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const backupIndexHtmlPath = resolve(
      frontendDistDirectory,
      "index.html.production-backup",
    );

    process.env.NODE_ENV = "production";
    await rename(frontendIndexHtmlPath, backupIndexHtmlPath);

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaService)
      .overrideProvider(CacheService)
      .useValue(cacheService)
      .compile();

    const productionApp =
      moduleRef.createNestApplication<NestExpressApplication>();

    try {
      await expect(configureApp(productionApp)).rejects.toThrow(
        /Built frontend assets were not found/,
      );
    } finally {
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalNodeEnv;
      }

      await rename(backupIndexHtmlPath, frontendIndexHtmlPath);
      await productionApp.close();
    }
  });
  it("serves the frontend shell for unknown non-api routes", async () => {
    const response = await request(app.getHttpServer())
      .get("/missing")
      .expect(200);

    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.headers["cache-control"]).toBe("no-cache");
    expect(response.headers["content-security-policy"]).toContain(
      "script-src 'self' 'sha256-",
    );
    expect(response.text).toContain("__APP_CONFIG__");
  });

  it("serves the injected frontend shell for explicit index.html requests", async () => {
    const response = await request(app.getHttpServer())
      .get("/index.html")
      .expect(200);

    expect(response.headers["cache-control"]).toBe("no-cache");
    expect(response.text).toContain('APP_RUNTIME_API_BASE_URL: ""');
    expect(response.text).not.toContain("__APP_RUNTIME_API_BASE_URL__");
  });

  it("serves immutable cache headers for hashed frontend assets", async () => {
    const builtAssetFilePath = resolve(
      frontendAssetDirectory,
      builtFrontendAssetFileName,
    );
    const builtAssetSource = await readFile(builtAssetFilePath, "utf8");
    const response = await request(app.getHttpServer())
      .get(`/assets/${builtFrontendAssetFileName}`)
      .expect(200);

    expect(response.headers["cache-control"]).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(response.text).toBe(builtAssetSource);
  });

  it("caches the injected frontend index.html at startup", async () => {
    const initialResponse = await request(app.getHttpServer())
      .get("/missing")
      .expect(200);
    const originalHtml = await readFile(frontendIndexHtmlPath, "utf8");

    try {
      await writeFile(
        frontendIndexHtmlPath,
        `${originalHtml}\n<!-- updated-after-boot -->\n`,
        "utf8",
      );

      const cachedResponse = await request(app.getHttpServer())
        .get("/missing")
        .expect(200);

      expect(cachedResponse.text).toBe(initialResponse.text);
      expect(cachedResponse.text).not.toContain("updated-after-boot");
    } finally {
      await writeFile(frontendIndexHtmlPath, originalHtml, "utf8");
    }
  });

  it("lists users and reuses the cached snapshot on repeated requests", async () => {
    const firstResponse = await request(app.getHttpServer())
      .get("/api/v1/users")
      .expect(200);
    const secondResponse = await request(app.getHttpServer())
      .get("/api/v1/users")
      .expect(200);

    expect(firstResponse.body).toMatchObject({
      data: [
        {
          email: "grace@example.com",
          id: "user_2",
        },
        {
          email: "ada@example.com",
          id: "user_1",
        },
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 2,
        totalPages: 1,
      },
      meta: {
        cached: false,
      },
      success: true,
    });
    expect(secondResponse.body.meta.cached).toBe(true);
    expect(secondResponse.body.data).toEqual(firstResponse.body.data);
  });

  it("paginates deterministically when users share the same createdAt timestamp", async () => {
    const sharedCreatedAt = new Date("2026-04-07T00:00:00.000Z");

    prismaService.setUsers([
      {
        createdAt: sharedCreatedAt,
        email: "ada@example.com",
        id: "user_1",
        name: "Ada Lovelace",
        role: "ADMIN",
        updatedAt: sharedCreatedAt,
      },
      {
        createdAt: sharedCreatedAt,
        email: "grace@example.com",
        id: "user_2",
        name: "Grace Hopper",
        role: "SUPPORT",
        updatedAt: sharedCreatedAt,
      },
      {
        createdAt: new Date("2026-04-06T00:00:00.000Z"),
        email: "katherine@example.com",
        id: "user_3",
        name: "Katherine Johnson",
        role: "MEMBER",
        updatedAt: new Date("2026-04-06T00:00:00.000Z"),
      },
    ]);

    const firstPageResponse = await request(app.getHttpServer())
      .get("/api/v1/users?page=1&pageSize=1")
      .expect(200);
    const secondPageResponse = await request(app.getHttpServer())
      .get("/api/v1/users?page=2&pageSize=1")
      .expect(200);

    expect(firstPageResponse.body).toMatchObject({
      data: [
        {
          email: "grace@example.com",
          id: "user_2",
        },
      ],
      pagination: {
        page: 1,
        pageSize: 1,
        totalItems: 3,
        totalPages: 3,
      },
    });
    expect(secondPageResponse.body).toMatchObject({
      data: [
        {
          email: "ada@example.com",
          id: "user_1",
        },
      ],
      pagination: {
        page: 2,
        pageSize: 1,
        totalItems: 3,
        totalPages: 3,
      },
    });
  });

  it("allows common local loopback origins for browser development", async () => {
    for (const origin of [
      "http://localhost:14000",
      "http://127.0.0.1:14000",
      "http://[::1]:14000",
    ]) {
      const response = await request(app.getHttpServer())
        .get("/api/v1/users")
        .set("Origin", origin)
        .expect(200);

      expect(response.headers["access-control-allow-origin"]).toBe(origin);
    }
  });

  it("creates a user, invalidates the cached list, and exposes the detail route", async () => {
    await request(app.getHttpServer()).get("/api/v1/users").expect(200);
    await request(app.getHttpServer()).get("/api/v1/users").expect(200);

    const createResponse = await request(app.getHttpServer())
      .post("/api/v1/users")
      .send({
        email: "katherine@example.com",
        name: "Katherine Johnson",
        role: "MEMBER",
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      data: {
        email: "katherine@example.com",
        id: "user_3",
        name: "Katherine Johnson",
        role: "MEMBER",
      },
      success: true,
    });

    const listAfterCreate = await request(app.getHttpServer())
      .get("/api/v1/users")
      .expect(200);
    const detailResponse = await request(app.getHttpServer())
      .get("/api/v1/users/user_3")
      .expect(200);
    const detailResponseFromCache = await request(app.getHttpServer())
      .get("/api/v1/users/user_3")
      .expect(200);

    expect(listAfterCreate.body.meta.cached).toBe(false);
    expect(listAfterCreate.body.data[0]).toMatchObject({
      email: "katherine@example.com",
      id: "user_3",
    });
    expect(detailResponse.body).toMatchObject({
      data: {
        email: "katherine@example.com",
        id: "user_3",
      },
      meta: {
        cached: true,
      },
      success: true,
    });
    expect(detailResponseFromCache.body.meta.cached).toBe(true);
  });

  it("serves fresh data from the database when Redis is unavailable", async () => {
    await request(app.getHttpServer()).get("/api/v1/users").expect(200);
    await request(app.getHttpServer()).get("/api/v1/users").expect(200);

    cacheService.setDisabled(true);

    await request(app.getHttpServer())
      .post("/api/v1/users")
      .send({
        email: "katherine@example.com",
        name: "Katherine Johnson",
        role: "MEMBER",
      })
      .expect(201);

    const listAfterCreate = await request(app.getHttpServer())
      .get("/api/v1/users")
      .expect(200);

    expect(listAfterCreate.body).toMatchObject({
      meta: {
        cached: false,
      },
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 3,
        totalPages: 1,
      },
    });
    expect(listAfterCreate.body.data[0]).toMatchObject({
      email: "katherine@example.com",
      id: "user_3",
    });
  });

  it("returns unified business errors for duplicate emails and missing users", async () => {
    const duplicateResponse = await request(app.getHttpServer())
      .post("/api/v1/users")
      .send({
        email: "ada@example.com",
        name: "Ada Lovelace",
        role: "ADMIN",
      })
      .expect(409);

    const missingUserResponse = await request(app.getHttpServer())
      .get("/api/v1/users/user_missing")
      .expect(404);

    expect(duplicateResponse.body).toMatchObject({
      error: {
        code: "user_conflict",
        message: "A user with that email already exists.",
      },
      success: false,
    });
    expect(missingUserResponse.body).toMatchObject({
      error: {
        code: "user_not_found",
        message: "The requested user could not be found.",
      },
      success: false,
    });
  });

  it("rate-limits repeated write requests from the same IP", async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await request(app.getHttpServer())
        .post("/api/v1/users")
        .send({})
        .expect(400);
    }

    const limitedResponse = await request(app.getHttpServer())
      .post("/api/v1/users")
      .send({})
      .expect(429);

    expect(limitedResponse.headers["retry-after"]).toBe("60");
    expect(limitedResponse.body).toMatchObject({
      error: {
        code: "rate_limit_exceeded",
      },
      success: false,
    });
  });

  it("falls back to in-memory rate limiting when Redis counters are unavailable", async () => {
    cacheService.setIncrementMode("null");

    for (let attempt = 0; attempt < 10; attempt += 1) {
      await request(app.getHttpServer())
        .post("/api/v1/users")
        .send({})
        .expect(400);
    }

    await request(app.getHttpServer())
      .post("/api/v1/users")
      .send({})
      .expect(429);
  });

  it("rate-limits proxied clients by forwarded IP when TRUST_PROXY is configured", async () => {
    const originalTrustProxy = process.env.TRUST_PROXY;

    process.env.TRUST_PROXY = "loopback";

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaService)
      .overrideProvider(CacheService)
      .useValue(cacheService)
      .compile();

    const trustedProxyApp =
      moduleRef.createNestApplication<NestExpressApplication>();

    try {
      await configureApp(trustedProxyApp);
      await trustedProxyApp.init();

      const proxiedClientIpAddress = "198.51.100.77";

      for (let attempt = 0; attempt < 10; attempt += 1) {
        await request(trustedProxyApp.getHttpServer())
          .post("/api/v1/users")
          .set("x-forwarded-for", proxiedClientIpAddress)
          .send({})
          .expect(400);
      }

      const limitedResponse = await request(trustedProxyApp.getHttpServer())
        .post("/api/v1/users")
        .set("x-forwarded-for", proxiedClientIpAddress)
        .send({})
        .expect(429);

      await request(trustedProxyApp.getHttpServer())
        .post("/api/v1/users")
        .set("x-forwarded-for", "203.0.113.77")
        .send({})
        .expect(400);

      expect(limitedResponse.body).toMatchObject({
        error: {
          code: "rate_limit_exceeded",
        },
        success: false,
      });
    } finally {
      if (originalTrustProxy === undefined) {
        delete process.env.TRUST_PROXY;
      } else {
        process.env.TRUST_PROXY = originalTrustProxy;
      }

      await trustedProxyApp.close();
    }
  });

  it("can ignore forwarded headers when TRUST_PROXY is disabled", async () => {
    const originalTrustProxy = process.env.TRUST_PROXY;

    process.env.TRUST_PROXY = "false";

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaService)
      .overrideProvider(CacheService)
      .useValue(cacheService)
      .compile();

    const untrustedProxyApp =
      moduleRef.createNestApplication<NestExpressApplication>();

    try {
      await configureApp(untrustedProxyApp);
      await untrustedProxyApp.init();

      for (let attempt = 0; attempt < 10; attempt += 1) {
        await request(untrustedProxyApp.getHttpServer())
          .post("/api/v1/users")
          .set("x-forwarded-for", `198.51.100.${attempt}`)
          .send({})
          .expect(400);
      }

      const limitedResponse = await request(untrustedProxyApp.getHttpServer())
        .post("/api/v1/users")
        .set("x-forwarded-for", "203.0.113.77")
        .send({})
        .expect(429);

      expect(limitedResponse.body).toMatchObject({
        error: {
          code: "rate_limit_exceeded",
        },
        success: false,
      });
    } finally {
      if (originalTrustProxy === undefined) {
        delete process.env.TRUST_PROXY;
      } else {
        process.env.TRUST_PROXY = originalTrustProxy;
      }

      await untrustedProxyApp.close();
    }
  });
});
