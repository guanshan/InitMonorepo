#!/usr/bin/env bash
set -euo pipefail

# One-click scanner for untranslated strings or suspicious i18n usage in apps/web.
# Usage: ./scan-untranslated.sh [path]  # default: apps/web/src

ROOT=${1:-"apps/web/src"}

echo "[i18n scan] root=${ROOT}" >&2

filter_common() {
  rg --pcre2 "$@" "$ROOT" \
    --glob '!**/i18n/locales/**' \
    --glob '!**/*.test.*' \
    --glob '!**/*.spec.*' \
    --glob '!**/__tests__/**' \
    --glob '!**/node_modules/**' \
    --glob '!**/.workspace/**'
}

echo "\n[1/4] Chinese (Han) characters outside locales" >&2
filter_common "\p{Han}" || true

echo "\n[2/4] Visible i18n keys possibly rendered as plain text (missing t())" >&2
# Heuristic: intent./fulfillment./dashboard./common. literals not preceded by t(
filter_common "(?<!t\\()(?<!\\w)(intent\\.|fulfillment\\.|dashboard\\.|common\\.)[A-Za-z0-9_.]+" || true

echo "\n[3/4] TODO/FIXME i18n markers" >&2
filter_common "TODO i18n|FIXME i18n|// i18n" || true

echo "\n[4/4] Handlebars placeholders in text (check args vs docs)" >&2
filter_common "{{[^}]+}}" || true

echo "\n[i18n scan] done" >&2
