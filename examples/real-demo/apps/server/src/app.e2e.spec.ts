import "reflect-metadata";

import type { NestExpressApplication } from "@nestjs/platform-express";

import { access, mkdir, rm, writeFile } from "node:fs/promises";
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

const frontendDistDirectory = resolve(__dirname, "..", "..", "web", "dist");
const frontendIndexHtmlPath = resolve(frontendDistDirectory, "index.html");
const frontendIndexHtmlFixture = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Real Demo Test Fixture</title>
    <script>
      window.__APP_CONFIG__ = {
        APP_RUNTIME_API_BASE_URL: "__APP_RUNTIME_API_BASE_URL__",
        APP_RUNTIME_BASE_PATH: "__APP_RUNTIME_BASE_PATH__"
      };
    </script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

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
    findMany: async () =>
      [...this.users].sort(
        (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
      ),
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.users.find((user) => user.id === where.id) ?? null,
  };

  async isReady() {
    return true;
  }

  reset() {
    this.users = createSeedUsers();
  }
}

class FakeCacheService {
  private store = new Map<string, unknown>();

  async delete(key: string) {
    this.store.delete(key);
  }

  async get<TValue>(key: string) {
    const value = this.store.get(key);
    return value === undefined ? null : (structuredClone(value) as TValue);
  }

  async isReady() {
    return true;
  }

  reset() {
    this.store.clear();
  }

  async set<TValue>(key: string, value: TValue) {
    this.store.set(key, structuredClone(value));
  }
}

describe("App (e2e)", () => {
  let app: NestExpressApplication;
  let createdFrontendDistDirectory = false;
  let createdFrontendIndexHtml = false;

  const prismaService = new FakePrismaService();
  const cacheService = new FakeCacheService();

  const ensureFrontendFixture = async () => {
    try {
      await access(frontendDistDirectory);
    } catch {
      await mkdir(frontendDistDirectory, { recursive: true });
      createdFrontendDistDirectory = true;
    }

    try {
      await access(frontendIndexHtmlPath);
    } catch {
      await writeFile(frontendIndexHtmlPath, frontendIndexHtmlFixture, "utf8");
      createdFrontendIndexHtml = true;
    }
  };

  beforeAll(async () => {
    await ensureFrontendFixture();

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

    if (createdFrontendIndexHtml) {
      await rm(frontendIndexHtmlPath, { force: true });
    }

    if (createdFrontendDistDirectory) {
      await rm(frontendDistDirectory, { force: true, recursive: true });
    }
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

    process.env.APP_BASE_PATH = "/real-demo";
    process.env.SWAGGER_ENABLED = "false";

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

      await basePathApp.close();
    }
  });

  it("keeps the OpenAPI server base path aligned with APP_BASE_PATH", async () => {
    const originalAppBasePath = process.env.APP_BASE_PATH;
    const originalSwaggerEnabled = process.env.SWAGGER_ENABLED;

    process.env.APP_BASE_PATH = "/real-demo";
    process.env.SWAGGER_ENABLED = "true";

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
          "/api/users": expect.any(Object),
          "/api/users/{id}": expect.any(Object),
        }),
      );
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

      await basePathApp.close();
    }
  });

  it("serves the frontend shell for unknown non-api routes", async () => {
    const response = await request(app.getHttpServer())
      .get("/missing")
      .expect(200);

    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.text).toContain("__APP_CONFIG__");
  });

  it("lists users and reuses the cached snapshot on repeated requests", async () => {
    const firstResponse = await request(app.getHttpServer())
      .get("/api/users")
      .expect(200);
    const secondResponse = await request(app.getHttpServer())
      .get("/api/users")
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
      meta: {
        cached: false,
      },
      success: true,
    });
    expect(secondResponse.body.meta.cached).toBe(true);
    expect(secondResponse.body.data).toEqual(firstResponse.body.data);
  });

  it("allows common local loopback origins for browser development", async () => {
    for (const origin of [
      "http://localhost:14000",
      "http://127.0.0.1:14000",
      "http://[::1]:14000",
    ]) {
      const response = await request(app.getHttpServer())
        .get("/api/users")
        .set("Origin", origin)
        .expect(200);

      expect(response.headers["access-control-allow-origin"]).toBe(origin);
    }
  });

  it("creates a user, invalidates the cached list, and exposes the detail route", async () => {
    await request(app.getHttpServer()).get("/api/users").expect(200);
    await request(app.getHttpServer()).get("/api/users").expect(200);

    const createResponse = await request(app.getHttpServer())
      .post("/api/users")
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
      .get("/api/users")
      .expect(200);
    const detailResponse = await request(app.getHttpServer())
      .get("/api/users/user_3")
      .expect(200);
    const detailResponseFromCache = await request(app.getHttpServer())
      .get("/api/users/user_3")
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

  it("returns unified business errors for duplicate emails and missing users", async () => {
    const duplicateResponse = await request(app.getHttpServer())
      .post("/api/users")
      .send({
        email: "ada@example.com",
        name: "Ada Lovelace",
        role: "ADMIN",
      })
      .expect(409);

    const missingUserResponse = await request(app.getHttpServer())
      .get("/api/users/user_missing")
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
});
