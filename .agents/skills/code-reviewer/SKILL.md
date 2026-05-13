---
name: code-reviewer
description: Expert code review specialist for this TypeScript monorepo (React 19 + React Router v7 + NestJS 11 + Prisma + MySQL/Redis). Reviews bugs, regressions, architecture boundaries, i18n/accessibility/theme-token compliance, security, and testing gaps. Use immediately after writing or modifying code, when reviewing pull requests, before merge, or when the user asks for a review.
---

# Code Reviewer

> **Skill Directory**: `.agents/skills/code-reviewer/`
> All bundled resource paths below (scripts, references, assets) are relative to this directory.

Review code changes for this monorepo, with findings focused on real regressions and project-rule violations instead of generic style nitpicks.

## What This Skill Optimizes For

- Bugs and behavioral regressions first
- DDD/FSD boundary compliance
- UI consistency with semantic tokens and accessibility rules
- Correct data flow (`@<scope>/sdk` + TanStack Query, not ad hoc fetch/state)
- Security and contract risks
- Missing or insufficient validation/tests

## Review Workflow

### 1. Load project context

Before reviewing, refresh the relevant rules from the repo:

- `docs/frontend-architecture.md`
- `docs/theme-guidelines.md`
- `docs/accessibility-guidelines.md`
- `docs/backend-architecture.md`
- `docs/dependency-boundaries.md`
- `docs/testing-guidelines.md`

### 2. Run automated pre-screening

Use the bundled scripts for fast, project-specific checks:

```bash
# Run all checks for changed files inferred from git
bash .agents/skills/code-reviewer/scripts/quick_review.sh

# Or run against an explicit file list
bash .agents/skills/code-reviewer/scripts/quick_review.sh apps/web/src/pages/admin/AdminPage.tsx
```

Useful individual commands:

```bash
python3 .agents/skills/code-reviewer/scripts/check_file_size.py <files...>
python3 .agents/skills/code-reviewer/scripts/check_architecture.py <files...>
python3 .agents/skills/code-reviewer/scripts/check_component_patterns.py <files...>
bash .agents/skills/code-reviewer/scripts/check_theme_violations.sh <files...>
```

### 3. Run repo validation when appropriate

For medium or large changes, prefer:

```bash
make check
```

If the change is tightly scoped and `make check` would be disproportionate, at least run the most relevant subset (`pnpm lint`, `pnpm typecheck`, focused tests, Storybook build for `packages/ui`, etc.).

### 4. Inspect the diff manually

Review:

```bash
git diff --stat
git diff
```

Focus on:

- what behavior changed
- whether the correct layer owns the change
- whether the implementation matches existing repo patterns
- whether validation and tests cover the risky parts

### 5. Write findings only after triage

Automated scripts are a pre-screen, not the review itself. Treat script output as hints, then confirm issues in context before reporting them.

## High-Signal Review Checklist

### Backend

- `domain/` stays framework-agnostic and free of NestJS/Prisma imports
- `application/` depends on ports/contracts, not concrete infrastructure
- `interfaces/` do not reach into `infrastructure/`
- request validation stays Zod-based
- response shape remains `{ success, data, meta }`
- OpenAPI/SDK-sensitive changes keep stable contracts and tests
- cache access goes through `CachePort`

### Frontend

- FSD boundaries still make sense (`pages`, `widgets`, `features`, `entities`, `shared`)
- `apps/web` only depends on `@<scope>/sdk`, `@<scope>/shared`, `@<scope>/ui`
- no Prisma/server-internal imports in frontend
- server state stays in TanStack Query, not Zustand
- user-facing strings go through `apps/web/src/locales/en.ts` and `zh.ts`
- components consume semantic CSS variables instead of hardcoded colors
- accessibility is preserved: labels, focus states, loading/empty/error readability, dialog titles

### Shared UI / Design

- `packages/ui` changes preserve Storybook and token-based styling
- raw colors belong in token definitions, not business components
- CSS Modules or semantic class styles are preferred over ad hoc inline styling

### Testing

- risky changes have focused tests
- frontend mocking remains MSW-oriented when applicable
- `packages/ui` changes should consider Storybook build/a11y coverage
- contract/cache/env/OpenAPI changes have targeted verification

## Automated Checks Included

### `check_file_size.py`

Flags unusually large changed source files, with exclusions for generated files and locale bundles that naturally grow.

### `check_architecture.py`

Checks:

- backend DDD boundary violations across `domain/application/infrastructure/interfaces`
- frontend forbidden imports such as `@prisma/client` or direct server imports

### `check_component_patterns.py`

Checks common review problems such as:

- dialogs without titles
- images without `alt`
- probable hardcoded Chinese UI copy outside locales
- form controls relying on placeholders without accessible labels
- direct `fetch()` in frontend code

### `check_theme_violations.sh`

Checks for:

- `dark:` utility usage
- hardcoded color literals outside token sources
- excessive inline styling in app code

## Output Format

When you report the review, keep it findings-first:

1. Critical issues
2. Warnings
3. Residual risks / testing gaps

Each finding should include:

- severity
- file path
- line number when practical
- why it matters
- what would fix it

Prefer this style:

```text
CRITICAL - apps/server/src/modules/skills/interfaces/skills.controller.ts:42
Controller imports infrastructure directly, which breaks the interfaces -> application boundary and makes the transport layer depend on Prisma details.
Fix by routing the dependency through the application service or a presenter.
```

## Review Philosophy

- Do not nitpick formatting that linters/formatters already enforce.
- Do not flood the user with speculative warnings.
- Prefer a smaller number of confirmed, project-relevant findings.
- If no findings are discovered, state that clearly and mention remaining unverified risk areas.
