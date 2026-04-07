# i18n Guidelines

- Route all app-facing copy through `apps/web/src/locales/en.ts`, even when the demo currently ships only the `en` locale.
- Keep translation keys semantic and feature-scoped, for example `userCreate.form.submit`.
- Shared UI primitives should avoid hardcoded prose defaults when a consuming app may need localized labels.
- Runtime configuration such as app name still flows through i18n interpolation instead of string concatenation in components.
