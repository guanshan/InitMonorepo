# Code Reviewer Scripts

Automated pre-screening helpers for this repository.

## Scripts

- `check_file_size.py` - Flags oversized changed source files while skipping generated/localization-heavy files that naturally grow.
- `check_architecture.py` - Detects high-signal DDD/FSD boundary violations and forbidden frontend imports.
- `check_component_patterns.py` - Checks for common UI review issues such as missing dialog titles, missing `alt`, placeholder-only inputs, hardcoded Chinese UI copy, and direct `fetch()` in web code.
- `check_theme_violations.sh` - Detects `dark:` usage, hardcoded color literals, and excessive inline styling outside token sources.
- `quick_review.sh` - Runs all checks plus `pnpm typecheck` and `pnpm lint`.

## Usage

```bash
# Run everything for changed files inferred from git
bash .agents/skills/code-reviewer/scripts/quick_review.sh

# Run everything for explicit files
bash .agents/skills/code-reviewer/scripts/quick_review.sh apps/web/src/pages/admin/AdminPage.tsx

# Run individual checks
python3 .agents/skills/code-reviewer/scripts/check_file_size.py <files...>
python3 .agents/skills/code-reviewer/scripts/check_architecture.py <files...>
python3 .agents/skills/code-reviewer/scripts/check_component_patterns.py <files...>
bash .agents/skills/code-reviewer/scripts/check_theme_violations.sh <files...>
```

These scripts are meant to narrow the review surface, not replace manual reasoning.
