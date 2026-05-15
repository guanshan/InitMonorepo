# Local UI Constraints

Use this reference before applying generic UI/UX Pro Max recommendations to this codebase.

## Stack Baseline

- Frontend: React 19 + React Router v7 + Vite
- Data: `@real-demo/sdk` + TanStack Query
- Local UI state: Zustand only for UI preference/state, not server data
- Shared UI: `@real-demo/ui`
- Styling: CSS Modules + semantic CSS custom properties
- Theme tokens: `packages/ui/src/tokens.css`
- Accessibility: Radix dialog focus handling, visible focus, readable feedback states

## Implementation Rules

### Styling

- Prefer CSS Modules and semantic CSS variables.
- Do not assume Tailwind or shadcn/ui is available.
- Raw colors belong in token sources, not business components.
- Reuse existing `@real-demo/ui` primitives when possible.

### Architecture

- `pages` assemble screens.
- `features` own user-triggered workflows and mutations.
- `entities` wrap data access and view-oriented adapters.
- `shared` stays generic and non-business-specific.

### Data Flow

- Frontend requests should go through `@real-demo/sdk`.
- Server state belongs in TanStack Query.
- Do not introduce Prisma or server-internal types into `apps/web`.

### Content

- All user-facing copy must be added to both:
  - `apps/web/src/locales/en.ts`
  - `apps/web/src/locales/zh.ts`

### Quality Checks

- Labels must remain attached to form controls.
- Dialogs need accessible titles/descriptions.
- Loading, empty, and error states should be explicit.
- If `packages/ui` changes, Storybook build/a11y matters.

## How To Use Search Results

When a search result suggests a pattern:

1. Translate the idea into CSS Modules and semantic tokens.
2. Map repeated UI into `@real-demo/ui` or local shared primitives.
3. Check whether the pattern belongs in `pages`, `features`, `entities`, or `shared`.
4. Add i18n and accessibility before considering the design "done".
