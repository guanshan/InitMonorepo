---
name: ui-ux-pro-max
description: "UI/UX design intelligence for this monorepo. Searchable guidance for styles, colors, typography, charts, landing patterns, accessibility, and implementation stacks. Includes a repo-specific (`local`) stack for React 19 + React Router v7 + CSS Modules + semantic tokens. Use when designing or reviewing pages/components, choosing a visual direction, generating a design system, or checking UI code against product-quality UX standards."
---

# UI/UX Pro Max

> **Skill Directory**: `.agents/skills/ui-ux-pro-max/`
> All bundled resource paths below (scripts, references, assets) are relative to this directory.

Design-system search and UI/UX decision support for this monorepo. This skill is useful both for:

- exploring aesthetic directions
- reviewing UI quality
- grounding implementation choices in a repeatable system

## Important Repo Context

Before using the search tools for this repository, read:

- `references/local-ui.md`

That reference explains the local rules that always override generic design suggestions:

- React 19 + React Router v7
- CSS Modules and semantic CSS variables
- `@<scope>/ui` primitives and `packages/ui/src/tokens.css`
- i18n in `apps/web/src/locales/en.ts` and `zh.ts`
- TanStack Query for server state
- accessibility and Storybook expectations

If a search result conflicts with `references/local-ui.md`, the local reference wins.

## When to Apply

Use this skill when:

- designing a new page, workflow, or visual direction
- reviewing UI/UX quality for an existing screen
- choosing color, typography, layout, or interaction patterns
- generating a design system before implementation
- checking whether a UI idea fits the local frontend stack

## Default Workflow For This Repo

### 1. Start with the local stack

For repo-specific implementation guidance, default to the `local` stack:

```bash
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "admin dashboard permissions" --stack local
```

### 2. Generate a design system

Use the design-system mode to get a cohesive direction:

```bash
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "workspace admin dashboard" --design-system -p "<project-name>"
```

If you want to persist working notes locally, prefer `.workspace/`:

```bash
python3 .agents/skills/ui-ux-pro-max/scripts/search.py \
  "workspace admin dashboard" \
  --design-system \
  --persist \
  --output-dir .workspace/drafts/design-system \
  -p "<project-name>"
```

### 3. Add domain-specific searches as needed

Examples:

```bash
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "trustworthy enterprise admin" --domain style
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "dense dashboard charts" --domain chart
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "focus states form labels dialog accessibility" --domain ux
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "editorial enterprise but warm" --domain typography
```

### 4. Cross-check the result against local constraints

Before implementing, verify:

- color and spacing choices map to semantic tokens
- patterns fit CSS Modules / existing primitives
- copy supports i18n
- interactions preserve accessibility and focus behavior

## Search Reference

### Domains

| Domain       | Use For                                |
| ------------ | -------------------------------------- |
| `product`    | Product-type recommendations           |
| `style`      | Visual direction and effects           |
| `color`      | Color palette selection                |
| `chart`      | Data visualization choices             |
| `landing`    | Page structure and CTA strategy        |
| `ux`         | Accessibility and interaction guidance |
| `typography` | Font pairing and text rhythm           |
| `icons`      | Icon choices                           |
| `react`      | React performance patterns             |
| `web`        | General web-interface guidelines       |

### Stacks

For this repo, the most useful stacks are:

- `local` - Local stack constraints and implementation guidance
- `react` - Generic React patterns

Other stacks remain available for inspiration or comparison, but they are not the default baseline for this repo.

## Practical Guidance

- Use this skill to inform design, not to bypass repo architecture.
- Prefer existing `@<scope>/ui` primitives before inventing new ones.
- Treat search results as ingredients; combine them with local constraints from `references/local-ui.md`.
- When reviewing an existing UI, use `--stack local` first, then `--domain ux` or `--domain style`.
