#!/bin/bash
# Quick review runner for this monorepo.
# Usage: bash .agents/skills/code-reviewer/scripts/quick_review.sh [files...]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

cd "$PROJECT_ROOT"

echo "🔍 Running Code Review Checks"
echo "=============================="
echo

collect_files() {
  if [ "$#" -gt 0 ]; then
    printf '%s\n' "$@"
    return
  fi

  if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Error: no explicit files provided and not in a git repository" >&2
    exit 1
  fi

  {
    git diff --name-only --diff-filter=AM
    git diff --cached --name-only --diff-filter=AM
  } | sort -u | grep -v '^$' || true
}

files="$(collect_files "$@")"
if [ -z "$files" ]; then
  echo "✅ No files to review"
  exit 0
fi

echo "Files to review:"
echo "$files" | sed 's/^/  - /'
echo

exit_code=0
source_files=$(echo "$files" | grep -E '\.(ts|tsx|js|jsx|css)$' || true)
ts_files=$(echo "$files" | grep -E '\.(ts|tsx|js|jsx)$' || true)
frontend_files=$(echo "$files" | grep -E '^(apps/web/src|packages/ui/src)/.*\.(ts|tsx|css)$' || true)
frontend_ts_files=$(echo "$files" | grep -E '^apps/web/src/.*\.(ts|tsx)$' || true)

echo "📏 Checking file sizes..."
echo "----------------------------------------"
if [ -n "$ts_files" ]; then
  if ! python3 "$SCRIPT_DIR/check_file_size.py" $ts_files; then
    exit_code=1
  fi
else
  echo "No source files to check"
fi
echo

echo "🎨 Checking theme violations..."
echo "----------------------------------------"
if [ -n "$frontend_files" ]; then
  if ! bash "$SCRIPT_DIR/check_theme_violations.sh" $frontend_files; then
    exit_code=1
  fi
else
  echo "No frontend/style files to check"
fi
echo

echo "🏗️  Checking architecture compliance..."
echo "----------------------------------------"
if [ -n "$ts_files" ]; then
  if ! python3 "$SCRIPT_DIR/check_architecture.py" $ts_files; then
    exit_code=1
  fi
else
  echo "No TypeScript/JavaScript files to check"
fi
echo

echo "🧩 Checking component patterns..."
echo "----------------------------------------"
if [ -n "$frontend_ts_files" ]; then
  if ! python3 "$SCRIPT_DIR/check_component_patterns.py" $frontend_ts_files; then
    exit_code=1
  fi
else
  echo "No frontend TS/TSX files to check"
fi
echo

if [ -n "$ts_files" ]; then
  echo "📝 Running typecheck..."
  echo "----------------------------------------"
  if ! pnpm typecheck; then
    exit_code=1
  fi
  echo

  echo "🔧 Running lint..."
  echo "----------------------------------------"
  if ! pnpm lint; then
    exit_code=1
  fi
  echo
fi

echo "=============================="
if [ $exit_code -eq 0 ]; then
  echo "✅ All automated checks passed"
  echo
  echo "Still review manually for:"
  echo "  - business logic correctness"
  echo "  - security issues"
  echo "  - tests and edge cases"
  echo "  - UX/accessibility regressions"
else
  echo "❌ Some automated checks failed"
fi
echo

exit $exit_code
