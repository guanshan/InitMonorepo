# InitMonorepo

**English** | [中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

A battle-tested LLM prompt that lets AI initialize a **production-grade full-stack TypeScript Monorepo** in one shot.

## What It Generates

Feed [PROMPT.md](PROMPT.md) to an LLM and get a fully runnable project including:

- **Monorepo Skeleton** — pnpm workspace + Turborepo + TypeScript Project References
- **Frontend** — React + Vite + BrowserRouter + FSD Architecture + TanStack Query + Zustand + i18n + Light/Dark Theme
- **Backend** — NestJS + Prisma + MySQL + Redis + DDD Layering + Pino Structured Logging
- **API Contract** — Zod unified schema → OpenAPI → Orval auto-generated typed SDK
- **Example Business Module** — Full User Management flow (Frontend Page → SDK → Controller → Use Case → Repository → MySQL/Redis)
- **Engineering Tooling** — ESLint + Prettier + Husky + commitlint + Knip + Vitest + Makefile + Docker + CI
- **Documentation** — English + localized README pair, architecture docs, conventions, CLAUDE.md / AGENTS.md

## How to Use

1. Copy the entire content of [PROMPT.md](PROMPT.md)
2. In an **empty directory**, send it as a prompt to an LLM (Claude / ChatGPT / Gemini, etc.)
3. Wait for the model to generate the complete project
4. Follow the generated README and run `make setup && make dev` to verify

## Prompt Design Highlights

- **Layered Priorities** (Must / Should / Nice-to-have) — Prevents half-baked, non-runnable output when the model runs low on tokens
- **Acceptance Criteria** — Requires the model to actually verify the command chain, not just generate files and declare success
- **Boundary Constraints** — Enforces architectural boundaries via engineering rules (ESLint boundaries, package exports, path aliases)
- **Base Path Normalization** — Supports non-root-path deployment with both runtime injection and build-time fixed modes
- **State Boundaries** — TanStack Query for server state, Zustand only for UI global state
- **Scoped DDD** — Core business modules follow DDD; infrastructure modules avoid over-abstraction

## File Reference

| File | Description |
|---|---|
| [PROMPT.md](PROMPT.md) | The complete prompt to feed to the LLM (English) |
| [PROMPT.zh-CN.md](PROMPT.zh-CN.md) | The complete prompt (Chinese original) |
| [PROMPT.ja.md](PROMPT.ja.md) | The complete prompt (Japanese translation) |
| [PROMPT.ko.md](PROMPT.ko.md) | The complete prompt (Korean translation) |
| [README.md](README.md) | This file — project introduction (English default) |
| [README.zh-CN.md](README.zh-CN.md) | Project introduction (Chinese) |
| [README.ja.md](README.ja.md) | Project introduction (Japanese) |
| [README.ko.md](README.ko.md) | Project introduction (Korean) |

## Iteration & Contributing

To adjust the prompt content, edit [PROMPT.md](PROMPT.md) (or the Chinese original [PROMPT.zh-CN.md](PROMPT.zh-CN.md)) directly.

## License

MIT
