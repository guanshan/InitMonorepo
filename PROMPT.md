# TypeScript Monorepo Initialization Prompt

[English](PROMPT.md) | [中文](PROMPT.zh-CN.md) | [日本語](PROMPT.ja.md) | [한국어](PROMPT.ko.md)

Please initialize a runnable, maintainable, extensible, and production-realistic full-stack TypeScript Monorepo. Do not just output explanatory text or empty shell templates.

## 1. Execution Rules

- Directly adopt best practices; do not give me multiple options.
- If any of my original requirements do not follow best practices, correct them and adopt a better approach directly.
- Generated output must prioritize runnability, clear boundaries, and long-term maintainability.
- Do not generate a large amount of non-runnable, unverifiable, boundary-less boilerplate code just to "look complete."
- If the context window or tokens are insufficient, prioritize fully delivering `Must`, then handle `Should`, and finally `Nice-to-have`.
- If you skip any `Should` or `Nice-to-have` items, do not pretend they are done; explicitly state what has been deferred.
- Use English for source code, identifiers, comments, config keys, environment variable names, fixtures, and seed data. The initial delivery language policy for user-facing copy and localized docs depends on the prompt variant: this English prompt stays English-first, while localized prompt variants should deliver `English + that locale`.

## 2. Delivery Priorities

### 2.1 Must

The following must be completed first:

- Monorepo base skeleton is runnable
- Both frontend and backend can locally develop, build, lint, typecheck, and test
- Frontend React Router Framework Mode + Vite + base path strategy is correct
- Backend NestJS + Prisma + MySQL + Redis base chain is runnable
- Frontend FSD boundaries are clear
- Backend core business modules use DDD layering
- Zod strategy is consistent throughout; no mixing of alternative HTTP validation styles
- OpenAPI export and Orval SDK generation chain is usable
- User Management example business is fully connected end-to-end
- Basic pages, theming, i18n, error boundaries, loading states, and key UX capabilities are usable
- API response format, log fields, cache boundaries, environment variable governance, and other core constraints are implemented
- Makefile, environment variables, Docker, basic README are usable

### 2.2 Should

After `Must` is complete, prioritize the following:

- GitHub Actions
- `CLAUDE.md` and `AGENTS.md`
- Key convention documents
- More complete test examples
- Storybook

### 2.3 Nice-to-have

If there is still sufficient context, time, or tokens, add the following:

- More docs
- ADR documents
- skills directory
- Richer example business logic
- Enhanced observability

## 3. Fixed Tech Stack

Do not provide alternatives; directly adopt the following.

### 3.1 Runtime & Monorepo

- Node.js 24 LTS
- If Node.js 24 is no longer the active LTS at execution time, switch to the current active LTS and explain why
- pnpm workspace
- Turborepo
- TypeScript 5.x
- TypeScript Project References (`composite`)

### 3.2 Frontend

- React
- React Router v7 Framework Mode (default to SPA Mode in this split frontend/backend architecture)
- Vite
- TanStack Query
- Zustand
- i18next
- Zod
- CSS Modules
- Radix UI Primitives
- MSW
- Design Tokens + CSS Variables
- Storybook as `Should`

### 3.3 Backend

- NestJS
- Prisma
- MySQL
- Redis
- Zod
- `nestjs-zod`
- Swagger / OpenAPI
- Pino

### 3.4 Engineering Tooling

- ESLint
- Prettier
- EditorConfig
- Husky
- lint-staged
- commitlint
- Knip
- Vitest
- Playwright for real browser E2E only (if implemented)
- GitHub Actions
- Orval

## 4. Versioning & Lock Strategy

When initializing the project, do not emphasize "use the latest"; instead emphasize "stable, compatible, and version-locked."

Must include:

- Root `package.json` declares `packageManager`
- Use Corepack to pin the pnpm version
- Root directory provides `.nvmrc`
- Root directory provides `.node-version`
- Root directory provides `.npmrc`
- Root directory provides `pnpm-lock.yaml`
- Root `package.json` declares `engines`

Recommended additions:

- Dependabot or Renovate configuration

## 5. Monorepo Structure

Must include at least the following structure:

```text
.
├── apps
│   ├── web
│   └── server
├── packages
│   ├── shared
│   ├── ui
│   ├── config
│   ├── sdk
│   └── tooling                       # Optional: helper scripts and tools
├── docs
├── .agents
│   └── skills
├── .claude
│   └── skills -> ../.agents/skills
├── .codex
│   └── skills -> ../.agents/skills
├── CLAUDE.md
├── AGENTS.md -> CLAUDE.md
├── README.md
├── Makefile
├── Dockerfile
├── docker-compose.yml
├── .editorconfig
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── .gitignore
├── .npmrc
├── .nvmrc
├── .node-version
└── ...
```

Requirements:

- All packages must declare clear `exports`
- Cross-package deep imports are forbidden
- `shared` must not become a junk drawer
- Auto-generated code and hand-written code must be in separate directories
- New packages must declare clear `name`, `type`, `exports`, `files`
- New packages must integrate with TypeScript project references
- `packages/tooling` is for helper scripts and tools, such as OpenAPI spec export scripts, codegen configs, etc.; if there is no clear content during initialization, it can be skipped

### 5.1 Internal Package Build Strategy

- Internal packages default to pre-compilation with `tsup`, outputting ESM and type declarations
- Apps consume compiled package artifacts by default, not raw `.ts` source files across packages
- TypeScript project references are for IDE navigation, type checking, and incremental build acceleration; they do not replace actual package build artifacts

### 5.2 tsconfig Inheritance Strategy

- `packages/config` provides shared `tsconfig.base.json`
- Frontend app additionally inherits `tsconfig.web.json` with JSX / DOM related configs
- Backend app additionally inherits `tsconfig.node.json` with Node.js runtime related configs
- Each package and app's `tsconfig.json` should inherit from shared configs rather than duplicating configurations

### 5.3 Shared Package Responsibilities

- `packages/shared` for cross-frontend-backend shared types, schemas, constants, general utilities
- `packages/ui` for frontend shared UI components, tokens, theme utilities
- `packages/config` for shared engineering configurations
- `packages/sdk` for API contracts, generated code, and frontend-specific hooks with layered exports
- `packages/tooling` for engineering scripts and codegen tools

## 6. Architecture Principles

### 6.1 General Principles

- Initialize as a production project skeleton by default
- High cohesion, low coupling
- Prioritize runnability, readability, testability, extensibility
- Directory structure and naming must be unified, consistent, and predictable
- Boundaries must be enforced through engineering rules, not just documentation

### 6.2 Prohibited Practices

- Do not use Prisma models directly as domain models
- Do not pile all business logic into a single service
- Do not scatter request logic and business rules across business pages
- Do not put server state into Zustand
- Do not hardcode colors, border-radius, shadows, spacing, or font sizes in components
- Do not hardcode user-visible text in components
- Do not read `process.env` directly everywhere
- Do not hand-write large amounts of API client code that duplicates OpenAPI
- Do not manually modify auto-generated SDK code

### 6.3 Boundary Enforcement Tools

Must be clearly defined and actually enforced:

- Use `eslint-plugin-boundaries` or equivalent to restrict cross-layer imports
- Optionally supplement with `dependency-cruiser` for dependency topology checks
- Enforce boundaries through package `exports`, path aliases, and generated directory isolation

## 7. Frontend Requirements

### 7.1 Frontend Architecture

Frontend uses FSD; do not rigidly apply backend DDD patterns.

Recommended structure:

```text
apps/web/src
├── app
├── pages
├── widgets
├── features
├── entities
├── shared
├── styles
├── locales
└── ...
```

Requirements:

- Do not use a `processes` layer
- `pages` handles page assembly; does not contain complex business rules
- `widgets` handles page-level composition; does not directly couple with low-level API details
- `features` handles user actions and business capabilities
- `entities` handles frontend domain object representation, adapters, query hooks, view models
- `shared` only contains purely generic capabilities; no business-semantic code
- `apps/web/src/shared` is the FSD-level internal generic layer for the frontend; do not confuse it with `packages/shared`; they have different responsibilities and must not substitute for each other

### 7.2 Frontend State Boundaries

- Server state is managed entirely by TanStack Query
- Zustand is used only for UI global state, such as theme, language, sidebar collapse, dialog visibility
- DTOs must not directly pollute the UI model; they must go through adapter / mapper
- TanStack Query should configure global `QueryCache` / `MutationCache` `onError` callbacks for unified handling of 401 redirects, network error toasts, etc., avoiding duplicate handling in every query

### 7.3 Styling & Components

- Styling approach is fixed as `CSS Modules` + Design Tokens + CSS Variables
- Do not introduce runtime CSS-in-JS
- Complex interactive components should be built on `Radix UI Primitives` first
- Radix Primitives only provide behavior and accessibility; styling is applied via CSS Modules and design tokens
- Do not introduce `Radix Themes` or other pre-styled packages
- Base components must include at least:
  - `Button`
  - `Input`
  - `Card`
  - `Modal`
  - `Table`
  - `Tag`
  - `Spinner`
  - `EmptyState`

### 7.4 Frontend Minimum Viable Capabilities

Must provide at least:

- App Layout skeleton
- Home page
- 404 page
- Theme toggle component
- Language switcher component when the initial delivery includes more than one locale
- Global error boundary
- `Loading / Empty / Error` tri-state components
- User list page
- User detail page
- User creation page / form page

### 7.5 Theming & i18n

Must support:

- Dark / Light theme
- Theme persistence
- System theme as default behavior
- English user-visible text must go through i18n
- The initial delivery may keep only an `en` locale, but the i18n structure must be ready for later locale expansion
- All design values must use tokens
- Tokens must cover at least `color`, `spacing`, `radius`, `shadow`, `typography`, `z-index`
- Color names must be semantic, e.g., `--color-bg-default`, `--color-text-primary`
- Hardcoding hex/rgb/hsl, fixed spacing, fixed border-radius, fixed shadows, or fixed font sizes in business components is forbidden

### 7.6 Accessibility & Route Performance

- Form controls must have associated labels
- Keyboard navigable
- Dialogs support focus management
- Color must not be the sole information carrier
- Prefer React Router route-module level code splitting and provide `HydrateFallback` or equivalent pending UI

## 8. Routing & Base Path

### 8.1 Routing Strategy

- Use React Router Framework Mode
- Configure React Router `basename` in `react-router.config.ts`
- Use Vite `base`
- Frontend must not assume deployment at root path `/`

### 8.2 Must Support

- `https://domain.com/path/`
- `https://domain.com/path/users`
- `https://domain.com/path/users/123`

### 8.3 Base Path Normalization Rules

Clearly implement and document the following rules:

- Base path must be normalized to `/` or a non-root path starting with `/`
- Except for root path `/`, trailing `/` is not allowed
- Abnormal inputs like `""`, `"/"`, `"//"` must be normalized at the config layer
- React Router `basename`, Vite `base`, NestJS static hosting path, and Swagger path must all follow the same normalization rules

### 8.4 Vite `base` vs React Router Framework `basename` Boundary

Default to build-time fixed base path mode:

- React Router `basename` in `react-router.config.ts` and Vite `base` must both read from the same normalized `VITE_BASE_PATH`
- When `VITE_BASE_PATH` is unset, both must resolve to root `/`
- Static asset prefixes and router basename are build-time fixed; do not try to mutate them after deployment
- If deploy-time frontend config is still needed, reserve runtime injection for values such as API origin or feature flags, not for route basename or asset prefix

### 8.5 Deployment Configuration

- Page refresh must not result in 404
- Non-API requests uniformly fallback to `index.html`
- API routes and SPA routes are clearly separated
- Recommended API prefix: `${APP_BASE_PATH}/api/v1`
- Swagger UI path: `${APP_BASE_PATH}/api/docs`
- For deploy-time frontend config that may still vary, provide a runtime injection mechanism, e.g., `window.__APP_CONFIG__`, but keep base path build-time fixed
- During local development, provide a clear and documented API access strategy
- Prefer configuring the React Router dev server (backed by Vite) to proxy `/api` or an equivalent API prefix to the backend port to reduce CORS complexity
- If direct split-port access is intentionally used instead, allow an explicit `VITE_API_BASE_URL` (or equivalent) and keep CORS, environment variables, and SDK base URL resolution consistent

## 9. Backend Requirements

### 9.1 DDD Scope

- Backend core business modules use DDD layering
- Infrastructure and glue modules avoid over-abstraction
- Modules like `health`, `config`, `swagger`, `static hosting` should not be forced into a full DDD shell

### 9.2 Core Business Module Layering

Core business modules must be split into at least:

- Domain
- Application
- Infrastructure
- Interfaces

Requirements:

- Domain does not depend on Prisma, HTTP, or NestJS details
- Application handles use case orchestration, transaction boundaries, cache coordination
- Infrastructure contains Prisma, Redis, Mapper, external dependency adapters
- Interfaces contains Controller, DTO, Presenter, exception mapping, Swagger decorators and documentation exposure

### 9.3 Backend Base Capabilities

Must implement at least:

- `/health`
- `/ready`
- `/live`
- MySQL connection
- Redis connection
- Configuration loading and validation
- Global exception filter
- Unified response format
- Request-level logging
- Swagger / OpenAPI
- migration
- seed

### 9.4 API Response & Error Conventions

Must be unified:

- Success response structure
- Paginated response structure
- Error response structure

Recommended fields should include at least:

- `success`
- `data`
- `message`
- `code`
- `requestId`
- `timestamp`

Requirements:

- Controllers must not return bare objects arbitrarily
- Distinguish between business exceptions and system exceptions
- Serialize error responses uniformly through the global exception filter

## 10. Zod, OpenAPI & SDK

### 10.1 Unified Zod Strategy

- Zod is the single source of truth for schemas
- Do not mix in `class-validator` / `class-transformer`
- Frontend forms, shared schemas, and environment variable validation are all based on Zod
- NestJS request validation is unified through `nestjs-zod` or equivalent `ZodValidationPipe`

### 10.2 NestJS & OpenAPI Integration

Must be clearly defined:

- NestJS side handles request validation through `nestjs-zod`
- Response serialization must also be unified through the Zod approach
- OpenAPI documentation must use a bridging approach consistent with Zod
- If using `@nestjs/swagger`, properly handle the post-processing pipeline for Zod-generated documentation

### 10.3 SDK Generation

- Auto-generate SDK based on backend OpenAPI
- Use Orval
- Output to `packages/sdk`
- Frontend should primarily consume the auto-generated SDK
- Hand-written request layer only retains transport config and interceptors
- Prefer Orval's TanStack Query output mode to directly generate typed `useQuery` / `useMutation` hooks, rather than only generating a basic HTTP client
- `packages/sdk` exports should be split by subpath:
  - `packages/sdk/types`: Pure types, schemas, base client — no React dependency
  - `packages/sdk/react`: TanStack Query hooks — frontend consumption only
- Package `exports` must expose these entries separately to avoid polluting non-frontend consumers with React dependencies

### 10.4 Generation Sequence

Must clearly define the topological relationship:

- Backend provides a script that can export the OpenAPI spec without starting the HTTP server
- For example, export to `apps/server/openapi/openapi.json`
- Can use a standalone CLI script: call `NestFactory.create()` to create the application, but do not call `app.listen()`; only execute `SwaggerModule.createDocument()` and write JSON to a file
- `sdk:generate` must depend on `server:openapi`
- `web:build` must depend on `sdk:generate`
- `turbo.json` must reflect this task dependency chain

## 11. Data Access, Caching & Configuration

### 11.1 Prisma

- Use Prisma + MySQL
- Prisma schema belongs to Infrastructure only
- Prisma client ultimately consumes the normalized `DATABASE_URL`
- If local development still uses separate `MYSQL_*` variables, they may only be assembled in the config module

### 11.2 Migration & Seed Safety Strategy

- Production startup must not implicitly execute destructive migrations
- Migration commands must be separated for dev, test, and production environments
- Seed is only explicitly triggered in dev / test environments
- README and docs must explain database initialization, migration, reset, and seed boundaries

### 11.3 Redis

- Provide a unified cache wrapper
- Redis client ultimately consumes the normalized `REDIS_URL`
- Define clear cache key naming conventions
- Provide at least one real caching example
- Distinguish at least: query cache, id-based entity cache, future auth/session extension, future rate limit extension
- Business code must not arbitrarily concatenate cache keys

### 11.4 Environment Variables

Must provide:

- `.env.example`
- `.env.development`
- `.env.test`
- `.env.production`

Frontend build-time variables:

- `VITE_API_BASE_URL` (optional; mainly for local development or explicit cross-origin API targets)
- `VITE_APP_NAME`
- `VITE_DEFAULT_LOCALE`
- `VITE_DEFAULT_THEME`
- `VITE_BASE_PATH`

Frontend runtime injection variables:

- `APP_RUNTIME_API_BASE_URL`

Notes:

- `VITE_API_BASE_URL` is a frontend build-time fallback and should stay aligned with the chosen local-development or cross-origin API strategy
- `APP_RUNTIME_API_BASE_URL` is not a frontend build-time environment variable
- `APP_RUNTIME_API_BASE_URL` is injected by NestJS into `window.__APP_CONFIG__` when serving `index.html`
- `APP_RUNTIME_API_BASE_URL` does not need to be written into frontend `.env` files
- The corresponding server-side config sources should be declared and mapped centrally in the backend config layer

Backend variables:

- `PORT`
- `APP_BASE_PATH`
- `DATABASE_URL`
- `REDIS_URL`
- `CORS_ORIGIN`
- `LOG_LEVEL`
- `SWAGGER_ENABLED`

Requirements:

- Use Zod to validate environment variables
- Fail fast on startup
- Business code only depends on typed config objects
- Frontend can only directly read `VITE_` variables at build time
- Frontend config that needs to change after deployment is provided via runtime injection
- `.env.production` only stores non-sensitive default values
- Real production secrets and connection strings must be injected by the deployment environment; never committed to the repository
- When deploying same-origin by default, the frontend should use relative API prefixes directly, e.g., `/api/v1`
- `APP_RUNTIME_API_BASE_URL` is only used when API and frontend are deployed on different origins
- When same-origin, `CORS_ORIGIN` typically does not need to be enabled; only explicitly configure it when frontend and backend are deployed cross-origin

## 12. Example Business Module

Do not just generate an empty shell project.

Use `User Management` as the complete example business module, including at least:

- User list page
- User detail page
- User creation page / form page
- User domain model
- User repository interface
- User repository implementation
- User use cases
- User controller
- migration
- seed
- Redis caching example

Must connect at least one complete chain end-to-end:

- Frontend page
- SDK call
- Backend Controller
- Application Use Case
- Repository
- MySQL
- Redis Cache

## 13. Testing Strategy

### 13.1 Must Complete

- Frontend unit tests
- Frontend component tests
- MSW-based frontend mocking
- Backend unit tests
- Backend e2e tests
- `packages/shared` tests

### 13.2 Test Tool Selection

- Default to Vitest for unit tests, integration tests, and backend e2e tests
- If including real browser end-to-end tests, supplement with Playwright
- Current NestJS versions provide official Vitest configuration paths; prefer Vitest; do not default to Jest
- Only allow a minimal Jest exception for `apps/server` e2e if there is a confirmed, explicit compatibility blocker with the current dependency versions, and the reason must be stated

### 13.3 Minimum Test Coverage Examples

Must demonstrate at least:

- One frontend component test
- One frontend page or feature test
- One backend use case unit test
- One backend e2e test
- One shared schema / utility test

## 14. Makefile, Docker & CI

### 14.1 Makefile

Must include at least:

- `make help`
- `make setup`
- `make dev`
- `make dev-web`
- `make dev-server`
- `make lint`
- `make typecheck`
- `make knip`
- `make test`
- `make build`
- `make check`
- `make generate-sdk`
- `make db-migrate`
- `make db-seed`
- `make db-reset`
- `make db-studio`
- `make clean`
- `make docker-build`
- `make docker-run`

Requirements:

- `make help` automatically reads comments to output help information
- `make setup` handles installing dependencies, initializing env files, installing hooks, creating symlinks
- `make dev` concurrently starts frontend and backend via `turbo dev`, `concurrently`, or equivalent
- `make dev` must ensure `mysql` and `redis` are available before running; can automatically execute `docker compose up -d mysql redis`, or give a clear prompt when missing
- `make check` chains at least `lint`, `knip`, `typecheck`, `test`, `build`
- Provide `make db-studio` for launching Prisma Studio during development

### 14.2 Turbo Configuration

- `turbo.json` must declare correct `outputs` for tasks like `build`, `test`, `generate-sdk`, `openapi`
- Turbo's task dependencies and caching configuration are general engineering requirements; do not only consider them in CI

### 14.3 Docker

Requirements:

- Frontend and backend are ultimately packaged into a single image
- Frontend build artifacts are served by the backend
- Use `turbo prune`
- Run `turbo prune` separately for `server` and `web` to get minimized workspace subsets
- Build `server` and `web` in separate build stages
- Final runner image only contains `server` runtime artifacts and `web` static artifacts
- Final runtime image should use a non-root user where possible
- `docker-compose.yml` must include at least `mysql`, `redis`
- Include `liveness`, `readiness`, and `mysql / redis` availability checks

### 14.4 CI

As `Should`, must include at least:

- Install dependencies
- Cache pnpm / turbo
- lint
- typecheck
- test
- build
- Verify auto-generated SDK is not stale

## 15. Logging & Security Baseline

### 15.1 Logging

- Backend defaults to `pino` for structured JSON log output
- Log fields must include at least `timestamp`, `level`, `service`, `module`, `action`, `requestId`, `message`
- Error logs include `error`, `stack` when needed
- Do not output passwords, tokens, connection strings, or other sensitive information in logs

### 15.2 Security Baseline

- CORS controlled via environment variables
- Reasonable HTTP security headers enabled by default
- Reserve extension points for future authentication, rate limiting, and auditing

## 16. Documentation & Collaboration Artifacts

### 16.1 Must

Generate at least:

- `README.md` (English)
- `docs/frontend-architecture.md`
- `docs/backend-architecture.md`
- `docs/api-guidelines.md`
- `docs/deployment-guidelines.md`
- `docs/theme-guidelines.md`
- `docs/dependency-boundaries.md`
- `docs/logging-guidelines.md`

### 16.2 Should

If capacity remains, generate:

- `CLAUDE.md`
- `AGENTS.md -> CLAUDE.md`
- `docs/testing-guidelines.md`
- `docs/i18n-guidelines.md`
- `docs/env-guidelines.md`
- `docs/accessibility-guidelines.md`
- `docs/security-guidelines.md`
- `docs/error-handling-guidelines.md`
- `docs/cache-guidelines.md`
- `docs/package-guidelines.md`
- Storybook

### 16.3 Nice-to-have

If capacity still remains, generate:

- `docs/adr/*`
- `.agents/skills/*`
- `.claude/skills -> .agents/skills`
- `.codex/skills -> .agents/skills`
- More convention documents

## 17. Output Checklist

Output at least:

- Complete directory structure
- Root-level configuration files
- Frontend and backend code under `apps`
- Shared package code under `packages`
- `Makefile`
- `Dockerfile`
- `docker-compose.yml`
- `.editorconfig`
- `.gitignore`
- `.npmrc`
- `.nvmrc`
- `.node-version`
- `README.md`
- Complete example business chain

## 18. Acceptance & Verification

Do not just generate files and declare completion. You must attempt to execute, or at least explicitly design, the following acceptance items:

### 18.1 Basic Acceptance

Verify at least the following command chain:

```bash
corepack enable
pnpm install
make setup
make lint
make typecheck
make test
make generate-sdk
make build
make check
```

### 18.2 Local Run Acceptance

Ensure at least the following chains work:

- `make dev` can start both frontend and backend simultaneously
- Frontend pages are accessible
- Backend API is accessible
- Swagger documentation is accessible
- User list example chain is functional

### 18.3 Docker Acceptance

At least design and document the following acceptance process:

```bash
make docker-build
make docker-run
```

### 18.4 Failure Handling

If you cannot complete real verification in the current environment:

- Clearly state which steps have been verified
- Clearly state which steps have not been verified
- Do not describe unverified content as "completed and runnable"

## 19. Final Output Style

- Deliver directly; do not offer multiple alternatives
- Prioritize a complete, runnable, maintainable project
- Explain key design decisions, but do not let the output become a pure theory document
- Example code must revolve around the same business scenario
- If `Should` / `Nice-to-have` items are not complete, explicitly mark them as deferred

Please begin initializing the entire project.
