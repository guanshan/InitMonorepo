---
name: api-design-principles
description: >
  REST API design rules for this monorepo's NestJS 11 + Prisma + nestjs-zod stack.
  Covers the shared-schema contract pipeline, the `{ success, data, meta }` envelope, stable
  OpenAPI operationIds for SDK generation, ZodValidationPipe usage, pagination, and failure shapes.
  Use when designing new endpoints, reviewing controllers, or changing anything under
  `packages/shared/src/{schemas,contracts}/`, `apps/server/src/modules/*/interfaces/`, or `packages/sdk/`.
---

# API Design Principles

> **Skill Directory**: `.agents/skills/api-design-principles/`

Opinionated API rules tied to the real building blocks in this repo:

- `packages/shared/src/contracts/api-envelope.ts` — envelope schemas
- `packages/shared/src/schemas/*.ts` — request/response Zod schemas
- `apps/server/src/common/http/success-response.ts` — `successResponse` / `paginatedResponse` helpers
- `apps/server/src/common/validation/zod-validation.pipe.ts` — `ZodValidationPipe`
- `apps/server/src/modules/*/interfaces/*.controller.ts` — controllers with `@ApiOperation({ operationId })` + `@ZodResponse`
- `packages/sdk/` — Orval-generated client (do not hand-edit)

This skill exists alongside [`docs/api-guidelines.md`](../../../docs/api-guidelines.md) — the doc is the one-paragraph rule, this skill is the working playbook.

## When to Use

- Adding a new controller, route, or query parameter
- Changing request/response shape, or renaming a field
- Reviewing whether an endpoint follows the envelope and validation rules
- Diagnosing SDK generation drift after editing `packages/shared`
- Deciding REST verb / status / idempotency for a new operation

---

## Stack Baseline

- **Framework**: NestJS 11 controllers and modules
- **Validation**: `nestjs-zod` — `createZodDto`, `ZodValidationPipe`, `@ZodResponse`
- **Contracts**: Zod schemas in `packages/shared` shared between server and web
- **Persistence**: Prisma — but Prisma rows never leak through controllers; map them to the response Zod type
- **Docs / Client**: Swagger / OpenAPI → Orval generates `packages/sdk` (web consumes only the SDK)
- **No GraphQL**, no REST versioning prefix yet — keep URLs unversioned and evolve via additive changes

If you find yourself wanting to add GraphQL, a different validator, or a hand-written API client, **stop and discuss** before deviating.

---

## Contract Pipeline (Single Source of Truth)

```
packages/shared/src/schemas/<thing>.ts        ← define Zod schema once
        │
        ├─ apps/server/src/modules/<m>/interfaces/<m>.swagger.ts  (createZodDto → DTOs)
        │       │
        │       └─ apps/server/src/modules/<m>/interfaces/<m>.controller.ts
        │             (ZodValidationPipe + @ZodResponse + envelope helpers)
        │
        └─ apps/web/...        ← consumes via @real-demo/sdk only (never imports shared schemas + does its own fetch)
```

### Rules

1. Every request body, query, response, and pagination shape **starts as a Zod schema in `packages/shared`** and is re-exported through `packages/shared/src/index.ts`.
2. The controller's DTO is always `createZodDto(<SharedSchema>)` in the module's `*.swagger.ts`, not a hand-written class.
3. Validation always goes through `new ZodValidationPipe(<SharedSchema>)` on `@Body` / `@Query` / `@Param`. Never use `class-validator`.
4. Responses are wrapped with `successResponse(...)` or `paginatedResponse(...)` from `apps/server/src/common/http/success-response.ts`. Never return bare entities.
5. After touching `packages/shared` or any controller signature, run `pnpm generate-sdk` and commit the regenerated `packages/sdk/src/generated/**`.

---

## The Envelope (Non-Negotiable)

Defined in [`packages/shared/src/contracts/api-envelope.ts`](../../../packages/shared/src/contracts/api-envelope.ts):

### Success (single resource)

```jsonc
{
  "success": true,
  "data": { /* resource */ },
  "meta": { "requestId": "...", "timestamp": "2026-05-15T...Z", "cached": false /* optional */ }
}
```

### Success (paginated list)

```jsonc
{
  "success": true,
  "data": [ /* resources */ ],
  "pagination": { "page": 1, "pageSize": 20, "totalItems": 137, "totalPages": 7 },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

### Failure

```jsonc
{
  "success": false,
  "error": { "code": "users.email_in_use", "message": "..." },
  "issues": [ /* optional: zod issues for validation failures */ ],
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

### Helpers (use these, do not roll your own)

```typescript
import {
  successResponse,
  paginatedResponse,
} from "../../../common/http/success-response";
import { getOrCreateRequestId } from "../../../common/http/request-id";

return successResponse(serialize(entity), {
  requestId: getOrCreateRequestId(request),
});

return paginatedResponse(items.map(serialize), {
  page: query.page,
  pageSize: query.pageSize,
  totalItems,
}, { requestId: getOrCreateRequestId(request) });
```

The matching response schemas in `packages/shared` use `createApiSuccessSchema(...)` and `createApiPaginatedSchema(...)` so OpenAPI shows the wrapper.

---

## REST Verb & Status Conventions

| Operation                | Verb     | Success status                   | Notes                                                   |
| ------------------------ | -------- | -------------------------------- | ------------------------------------------------------- |
| List (with pagination)   | `GET`    | `200`                            | Always `paginatedResponse`; expose `page` + `pageSize`. |
| Read single              | `GET`    | `200`                            | `404` on missing.                                       |
| Create                   | `POST`   | `201` (use `@HttpCode(201)`)     | Return the created resource.                            |
| Full replace             | `PUT`    | `200`                            | Idempotent; rarely needed — prefer `PATCH`.             |
| Partial update           | `PATCH`  | `200`                            | Validate optional fields with `.partial()`.             |
| Delete                   | `DELETE` | `200` or `204`                   | Soft-delete returns the resource; hard-delete `204`.    |
| Domain action            | `POST`   | `200` / `201`                    | Use a nested resource, not a verb: `POST .../password`. |

Avoid verbs in URLs (`/createUser` is wrong). The one exception is sub-resource actions that genuinely create a new artifact: `POST /users/:userId/password` is fine because it issues a new password.

---

## OperationIds & SDK Stability

`packages/sdk` is regenerated from the server's OpenAPI document. **The SDK key for every hook comes from `operationId`** — so:

1. Every controller method MUST have `@ApiOperation({ operationId: '<verb><Resource>' })`.
2. Naming style: `camelCase`, verb-first, singular for single-resource actions: `listUsers`, `createUser`, `getUser`, `updateUser`, `deleteUser`, `resetUserPassword`.
3. **Never rename a shipped operationId casually** — the SDK consumer code in `apps/web` will break and any external API consumers will silently drift. If you have to rename, treat it as a breaking change and update web call sites in the same PR.
4. Never hand-edit `packages/sdk/src/generated/**`. If the generated output is wrong, fix the schema or controller upstream and re-run `pnpm generate-sdk`.

---

## Validation Rules

```typescript
import { ZodResponse } from "nestjs-zod";
import { ZodValidationPipe } from "../../../common/validation/zod-validation.pipe";
import {
  CreateAdminUserDto,
  CreateAdminUserInputSchema,
  AdminUserResponseDto,
} from "./users.swagger";

@Post()
@HttpCode(HttpStatus.CREATED)
@ApiOperation({ operationId: "createUser", summary: "Create a new user" })
@ApiBody({ type: CreateAdminUserDto })
@ZodResponse({ status: 201, type: AdminUserResponseDto })
async create(
  @Body(new ZodValidationPipe(CreateAdminUserInputSchema)) body: CreateAdminUserDto,
  @Req() request: Request & RequestWithRequestId,
) {
  const created = await this.usersService.create(body);
  return successResponse(serializeAdminUser(created), {
    requestId: getOrCreateRequestId(request),
  });
}
```

Key points:

- The **schema** comes from `@real-demo/shared`; the DTO is a thin `createZodDto` wrapper.
- `ZodValidationPipe(<Schema>)` is the single validation entry point — no decorators on DTO fields.
- Validation messages should be **i18n keys** (e.g., `"validation.email.invalid"`); the web layer resolves them through `t()`.
- `@ZodResponse` advertises the response schema in OpenAPI so the SDK generator knows the envelope shape.

---

## Pagination

- Always accept `page` (>= 1) and `pageSize` (>= 1, capped — usually 100). Schema lives in `packages/shared`.
- Always return `paginatedResponse(...)` so `pagination.totalItems` / `totalPages` come back.
- Filter/search inputs (`search`, `status`, `role`, etc.) go alongside `page`/`pageSize` in the same query Zod schema.
- Do **not** invent cursor pagination unless there's a specific scale reason — keep the SDK consistent.

---

## Idempotency & Caching

- `GET` is always safe and idempotent — no side effects, no writes, no token consumption.
- `PUT` and `DELETE` must be idempotent — repeated calls reach the same final state.
- `POST` is **not** idempotent unless you explicitly design for it (idempotency key header).
- Cached responses should set `meta.cached = true` via `successResponse(data, { cached: true, requestId })`. Always route cache reads/writes through `CachePort` and key them in `cache-keys.ts` — never `process.env`-driven, ad-hoc keys.

---

## Failure Responses

- Always wrap with the failure envelope (Nest's exception filter / global pipe already does this — don't bypass it).
- `error.code` is a machine-readable dotted string scoped to the module: `users.email_in_use`, `auth.invalid_credentials`, `models.provider_not_found`.
- `error.message` is **English** (this demo's APIs are English-only — see `CLAUDE.md`); UI translation happens client-side via the `code`.
- Choose the right HTTP status:
  - `400` malformed request that isn't field-validation
  - `401` not authenticated
  - `403` authenticated but not allowed
  - `404` resource not found
  - `409` conflict (duplicate email, version mismatch)
  - `422` is acceptable for validation but this stack uses `400` from `ZodValidationPipe` — stay consistent
  - `500` only for unexpected server errors

---

## Breaking-Change Strategy

This repo has **no URL versioning** today. Rules:

- **Additive changes** (new optional field, new endpoint, new optional query param) — fine, no SDK consumer breaks.
- **Renames / removed fields / required-→-optional flips / type changes** — breaking. Either:
  1. Add the new field alongside the old one, ship, update consumers, then remove the old field in a later PR; or
  2. Treat it as a coordinated breaking change in the same PR (update controller, schemas, SDK, and all `apps/web` call sites together).
- Never silently mutate the meaning of an existing field — that's worse than a rename.

If a versioned URL is ever needed, introduce it as a prefix on the `Controller('v2/...')` and keep the operationIds prefixed too (`listUsersV2`). Don't sprinkle versions into individual route paths.

---

## Quick Sanity Checks

```bash
# 1) All public endpoints have a stable operationId
rg "@ApiOperation\(\{" apps/server/src --type ts -A 1 | grep -A 1 'ApiOperation' | rg -v 'operationId' | head

# 2) No controller bypasses the envelope (returns bare data)
rg "return\s+(this\.|await\s+)" apps/server/src/modules/*/interfaces --type ts | grep -v 'successResponse\|paginatedResponse'

# 3) No controller imports class-validator
rg "from ['\"]class-validator['\"]" apps/server/src --type ts

# 4) Generated SDK is in sync with current schemas
pnpm generate-sdk
git diff --stat packages/sdk/src/generated

# 5) Prisma types not leaking into responses
rg "@prisma/client" apps/server/src/modules/*/interfaces --type ts
```

---

## New Endpoint Checklist

- [ ] Request/response Zod schema lives in `packages/shared/src/schemas/<area>.ts` and is re-exported from the package root
- [ ] Response schema is composed with `createApiSuccessSchema` or `createApiPaginatedSchema`
- [ ] Module's `*.swagger.ts` creates DTOs with `createZodDto(<schema>)`
- [ ] Controller method has `@ApiOperation({ operationId: '<verbResource>' })`
- [ ] Input validated by `new ZodValidationPipe(<schema>)` on `@Body` / `@Query` / `@Param`
- [ ] Response goes through `successResponse(...)` or `paginatedResponse(...)` with `requestId`
- [ ] HTTP status matches the verb conventions table above (`@HttpCode(201)` for `POST` creates)
- [ ] `@ApiBadRequestResponse` / `@ApiNotFoundResponse` / `@ApiConflictResponse` etc. point at the module's `*ApiFailureDto`
- [ ] Prisma rows are mapped to the schema type — `@prisma/client` types never appear in the response
- [ ] Validation error keys are i18n-compatible (`"validation.<field>.<rule>"`)
- [ ] `pnpm generate-sdk` regenerated and committed
- [ ] Web consumers updated to the new operation/SDK key in the same PR (no orphan generated hooks)

---

## Anti-Patterns to Reject in Review

| Anti-pattern                                              | Why it breaks the stack                                                       |
| --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Controller returns Prisma row directly                    | Leaks DB shape, drops the envelope, breaks SDK typings                        |
| Hand-written DTO class with `@IsString()` decorators      | Bypasses the shared Zod contract, schema and runtime drift                    |
| Missing `operationId`                                     | Orval auto-generates one based on path; subsequent renames break SDK consumers|
| `return { data: ... }` without `meta`                     | Web parsers expect `meta.requestId`; debugging tools rely on it               |
| URL like `/api/createUser` or `/users/list`               | Verb in path; use the right HTTP verb on a noun resource                      |
| Editing `packages/sdk/src/generated/**` by hand           | The file will be overwritten on next `pnpm generate-sdk` and CI will diverge  |
| Inventing a versioned URL for one endpoint only           | Causes inconsistent client surface; bump the whole module or none             |
| Throwing raw `new Error(...)` from a controller           | Skips the failure envelope; use Nest's typed exceptions                       |
