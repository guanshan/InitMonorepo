# Theme Guidelines

- Theme values ship from `packages/ui/src/tokens.css` and are consumed through CSS custom properties.
- Business components should consume semantic tokens instead of raw color values.
- Zustand stores only UI theme preference.
- System theme changes are observed at runtime when the stored preference is `system`.
- `VITE_DEFAULT_THEME` controls the first-run preference before persisted state takes over.
