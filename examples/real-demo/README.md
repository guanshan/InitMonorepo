# Real Demo

This directory contains an English-only reference implementation generated to match the `InitMonorepo` prompt direction without mixing localized output into the demo itself.

## Stack

- Monorepo: `pnpm` workspace + Turborepo + TypeScript project references
- Frontend: React + Vite + BrowserRouter + TanStack Query + Zustand + i18next
- Backend: NestJS + Prisma + MySQL + Redis + Pino
- Shared contract: Zod schemas in `packages/shared`
- SDK: OpenAPI export from the server and Orval code generation in `packages/sdk`
- Frontend tests: Vitest + Testing Library + MSW
- Component workbench: Storybook in `packages/ui`

## Structure

```text
.
├── apps
│   ├── server
│   └── web
├── packages
│   ├── config
│   ├── sdk
│   ├── shared
│   └── ui
├── docs
├── .github
├── CLAUDE.md
├── AGENTS.md
├── Makefile
├── docker-compose.yml
└── ...
```

## Getting Started

1. Run `make setup`
2. Start development with `make dev`
3. Open `http://localhost:14000`
4. Visit `http://localhost:13000/api/docs` for Swagger UI when `APP_BASE_PATH=/`, or `http://localhost:13000{APP_BASE_PATH}/api/docs` when deployed under a sub-path
5. Check `http://localhost:13000/health`, `http://localhost:13000/ready`, and `http://localhost:13000/live`; health diagnostics stay at the root even when `APP_BASE_PATH` serves the app from a sub-path
6. Run `pnpm storybook:ui` to inspect shared UI primitives at `http://localhost:16006`

If `docker compose` is unavailable, the helper scripts in `scripts/` fall back to plain `docker run` for MySQL and Redis.

## Database Workflows

- Apply committed migrations for local startup: `make db-migrate` or `pnpm db:migrate`
- `pnpm db:migrate` auto-baselines an already-existing local schema only when it exactly matches the current Prisma schema, which helps older local databases transition onto committed migrations without requiring a reset
- Create a new migration while iterating on the Prisma schema: `pnpm --filter @real-demo/server db:migrate:dev`
- Test / CI style migration application: `pnpm --filter @real-demo/server db:migrate:test`
- Production deployment migrations: `pnpm --filter @real-demo/server db:migrate:deploy`
- Seed remains explicit: `make db-seed` or `pnpm db:seed`

## Runtime Config

- The frontend keeps Vite `base` on `./` by default so the same build can be moved after deployment.
- NestJS serves the built frontend and injects `window.__APP_CONFIG__` at runtime for `APP_RUNTIME_BASE_PATH` and `APP_RUNTIME_API_BASE_URL`.
- In same-origin deployments, `APP_RUNTIME_API_BASE_URL` defaults to the app base path so generated SDK requests resolve to `${APP_BASE_PATH}/api/*`.
- For build-time fixed deployments, set `VITE_BASE_PATH` during the web build so Vite asset paths and the router fallback base stay aligned.
- For local Vite development, `VITE_API_BASE_URL=http://localhost:13000` remains the fallback and `/api` is proxied through Vite.

## Key Flows

- `GET /api/users` reads from MySQL and stores a cached list snapshot in Redis
- `GET /api/users/:id` resolves a single user record and reuses an entity cache snapshot on repeated requests
- `POST /api/users` validates input with Zod, writes through Prisma, invalidates the list cache, and refreshes the detail cache
- The frontend consumes the generated SDK and wraps requests with TanStack Query hooks
- TanStack Query routes request failures through one shared error pipeline for redirects and toast feedback
- Frontend tests mock network calls with MSW instead of hand-rolled fetch stubs
- `pnpm build` refreshes the OpenAPI document and SDK generation before the web package consumes it

## Docker

1. Run `make infra-up`
2. Run `make docker-build`
3. Run `make docker-run`
4. Open `http://localhost:13000`

The Docker image now contains both the NestJS server runtime and the built Vite frontend. `make docker-run` connects back to the locally started MySQL and Redis containers through `host.docker.internal`.

## Verification

- Verified in this workspace: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm knip`, `pnpm build-storybook:ui`
- Re-verified `pnpm test` from a clean copied workspace after removing generated artifacts such as `apps/web/dist`, `apps/server/openapi`, and SDK output
- Docker build / run and long-running local `make dev` flows remain documented but were not re-run as part of this refinement pass

## Optional Follow-Up

- ADRs remain optional
- Richer business examples and deeper observability remain optional

## Notes

- Source code, comments, docs, UI copy, fixtures, and seed data stay English-only in this demo
- The root repository still keeps localized prompt documents outside this demo directory
