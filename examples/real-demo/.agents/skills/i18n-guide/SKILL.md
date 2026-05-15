---
name: i18n-guide
description: >
  Frontend i18n implementation and troubleshooting guide for this monorepo. Use when adding/updating translations,
  fixing missing keys, or auditing pages for untranslated strings. Covers naming, directory layout, namespace usage,
  en/zh sync, and quick scans for gaps.
---

# i18n Guide

> **Skill Directory**: `.agents/skills/i18n-guide/`
> All bundled resource paths below (scripts, references, assets) are relative to this directory.

## 1) When to Use

- New/updated UI copy that needs i18n
- Raw keys rendered in UI (e.g., `admin.users.title`) or hardcoded zh/en text
- Missing translations for toast/headers/placeholders/buttons/empty states/pagination
- en/zh divergence or mismatched placeholders
- Need a quick audit for untranslated pages/components

## 2) Locations

- Locales: `apps/web/src/locales/en.ts` 和 `apps/web/src/locales/zh.ts`（单文件，扁平点分 key，例如 `"auth.error.title": "..."`）
- 两份文件的 key 必须完全对齐，新增 key 时同步维护两份
- Real namespaces in this repo: `app.*`、`auth.*`、`admin.*`、`common.*`、`errors.*`、`home.*`、`login.*`、`modelProvider.*`、`modelStatus.*`、`nav.*`、`notFound.*`、`playground.*`、`roles.*`、`settings.*`、`sidebar.*`、`theme.*`、`userMenu.*`、`validation.*` 等

## 3) Naming Rules

1. Namespace prefix = module/page (e.g., `auth.*`, `admin.*`, `playground.*`)
2. Typical groups: `table` / `form` / `toast` / `dialog` / `filter` / `pagination` / `tooltip` / `stats` / `status` / `action` / `placeholder`
3. Placeholders use `{{var}}` (counts prefer `{{count}}`); keep en/zh keys and params aligned
4. No hardcoded copy in components; always use semantic keys with `t()`

## 4) Namespace Usage (react-i18next)

- Resources are wired in `apps/web/src/locales/resources.ts` as `{ en: { translation: en }, zh: { translation: zh } }`; the default namespace is `translation`, and keys are flat dotted strings (e.g., `"auth.error.title"`).
- Preferred patterns:
  - `useTranslation('translation', { keyPrefix: 'auth' })` + `t('error.title')`
  - or `useTranslation()` + fully qualified `t('auth.error.title')`
- Locale files: `apps/web/src/locales/en.ts` 和 `apps/web/src/locales/zh.ts`，两份 key 必须完全对齐。
- When migrating, change the hook instead of rewriting every key to keep consistency.

## 5) Workflow (Short Checklist)

1. Check for existing uncommitted work before editing
2. Ensure every `t('namespace.path')` has en/zh entries
3. Add/update both en & zh; update `apps/web/src/shared/lib/i18n.ts` only if the i18n bootstrap wiring changes
4. Validate placeholders: `{{var}}` matches `t` params; remove unused placeholders
5. Self-test pages to ensure no raw keys/hardcoded text
6. Run `make fmt && make check` when necessary

## 6) Quick Detection

- Search hardcoded zh/en strings in JSX (outside locales)
- Search raw keys (`auth.`/`admin.`/`playground.`/`settings.`) rendered in UI
- Search `TODO i18n` / `FIXME i18n` / `// i18n`
- Check headers/buttons/placeholders/toasts not wrapped with `t()`
- Check placeholder mismatches (`{{...}}` in copy vs params passed to `t`)

## 7) Common Pitfalls

- Missing namespace prefix: `t('error.title')` should be `t('auth.error.title')`
- I18n bootstrap wiring in `apps/web/src/shared/lib/i18n.ts` not aligned with the current resource shape (`resources` is composed in `apps/web/src/locales/resources.ts`)
- en/zh missing or placeholder name mismatches (`{{count}}` vs `{{total}}`)
- Plurals/counts: at least provide `{{count}}`; add plural handling as needed

## 8) Commands

- Checks: `make check`
- Format + check: `make fmt && make check`
- Note: single-file eslint from subfolders fails on ESLint v9; run at repo root (or use `make check`).

## 9) Helper Script

- `.agents/skills/i18n-guide/scripts/scan-untranslated.sh`
  - Usage: `cd .agents/skills/i18n-guide/scripts && ./scan-untranslated.sh [path]` (default `apps/web/src`)
  - Excludes locales/tests/node_modules; checks:
    1. zh characters outside locales
    2. Heuristic raw i18n keys in UI (may false-positive)
    3. `TODO i18n` / `FIXME i18n` / `// i18n`
    4. Copy containing `{{...}}` (verify params/naming)

## 10) Recent Field Notes

- After adding i18n versions of toolbars/sections, delete legacy hardcoded blocks to avoid duplicate UI (e.g., IntentLibrary toolbar).
- If raw keys render, first verify hook namespace/keyPrefix matches the resource layout.
