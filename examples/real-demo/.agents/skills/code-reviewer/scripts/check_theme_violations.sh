#!/bin/bash
# Check theme/style violations for this monorepo's frontend code.

set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

error_count=0
warning_count=0

summarize_matches() {
  local file="$1"
  local severity="$2"
  local count=0
  while IFS=: read -r line_num line_content; do
    [ -n "$line_num" ] || continue
    echo "   Line $line_num: ${line_content:0:120}"
    count=$((count + 1))
    if [ $count -ge 8 ]; then
      echo "   ..."
      break
    fi
  done
}

is_ignorable_color_line() {
  local line="$1"
  echo "$line" | grep -q 'box-shadow:' && return 0
  echo "$line" | grep -q 'text-shadow:' && return 0
  echo "$line" | grep -q 'color-mix(' && return 0
  echo "$line" | grep -qE 'var\([^)]*, *#[0-9A-Fa-f]{3,8}' && return 0
  echo "$line" | grep -qE 'background: *rgba?\(0, *0, *0,' && return 0
  return 1
}

is_layout_only_inline_style() {
  local line="$1"
  local stripped="$line"
  if [[ "$stripped" =~ backgroundColor|color:|borderColor|boxShadow|outline|fill:|stroke: ]]; then
    return 1
  fi
  if [[ "$stripped" =~ style=\{\{ ]]; then
    return 0
  fi
  return 1
}

collect_files() {
  if [ "$#" -gt 0 ]; then
    printf '%s\n' "$@"
    return
  fi

  if git rev-parse --git-dir > /dev/null 2>&1; then
    {
      git diff --name-only --diff-filter=AM
      git diff --cached --name-only --diff-filter=AM
    } | sort -u
  fi
}

files=$(
  collect_files "$@" | \
    grep -E '^(apps/web/src|packages/ui/src)/.*\.(ts|tsx|css)$' | \
    grep -v 'packages/ui/src/tokens.css$' | \
    grep -v '\.stories\.tsx$' || true
)

if [ -z "$files" ]; then
  echo -e "${GREEN}✅ No frontend/style files to check${NC}"
  exit 0
fi

echo "🎨 Checking theme violations..."
echo

echo "Checking for dark:* modifiers..."
while IFS= read -r file; do
  [ -f "$file" ] || continue
  matches=$(grep -n 'dark:' "$file" 2>/dev/null || true)
  if [ -n "$matches" ]; then
    echo -e "${RED}❌ [CRITICAL] Found dark:* modifier in: $file${NC}"
    echo "$matches" | while IFS=: read -r line_num line_content; do
      echo "   Line $line_num: ${line_content:0:100}"
    done
    echo
    error_count=$((error_count + 1))
  fi
done <<< "$files"

echo "Checking for hardcoded color literals..."
while IFS= read -r file; do
  [ -f "$file" ] || continue
  matches=$(grep -nE '#[0-9A-Fa-f]{3,8}\b|rgba?\(|hsla?\(' "$file" 2>/dev/null || true)
  if [ -z "$matches" ]; then
    continue
  fi

  actionable_matches=""
  while IFS=: read -r line_num line_content; do
    if is_ignorable_color_line "$line_content"; then
      continue
    fi
    actionable_matches+="${line_num}:${line_content}"$'\n'
  done <<< "$matches"

  if [ -n "$actionable_matches" ]; then
    echo -e "${YELLOW}⚠️  [WARNING] Hardcoded color literal in: $file${NC}"
    summarize_matches "$file" "WARNING" <<< "$actionable_matches"
    echo
    warning_count=$((warning_count + 1))
  fi
done <<< "$files"

echo "Checking for inline styles in app code..."
while IFS= read -r file; do
  [ -f "$file" ] || continue
  case "$file" in
    packages/ui/src/*) continue ;;
  esac
  matches=$(grep -n 'style={{' "$file" 2>/dev/null || true)
  if [ -n "$matches" ]; then
    actionable_matches=""
    while IFS=: read -r line_num line_content; do
      if is_layout_only_inline_style "$line_content"; then
        continue
      fi
      actionable_matches+="${line_num}:${line_content}"$'\n'
    done <<< "$matches"
    if [ -n "$actionable_matches" ]; then
      echo -e "${YELLOW}⚠️  [WARNING] Inline style usage in: $file${NC}"
      summarize_matches "$file" "WARNING" <<< "$actionable_matches"
      echo "   Prefer CSS Modules or semantic CSS variables unless inline style is truly dynamic."
      echo
      warning_count=$((warning_count + 1))
    fi
  fi
done <<< "$files"

echo "================================================"
if [ $error_count -eq 0 ] && [ $warning_count -eq 0 ]; then
  echo -e "${GREEN}✅ No theme violations found${NC}"
  exit 0
elif [ $error_count -eq 0 ]; then
  echo -e "${YELLOW}⚠️  Found $warning_count warning(s)${NC}"
  exit 0
else
  echo -e "${RED}❌ Found $error_count critical issue(s)${NC}"
  [ $warning_count -gt 0 ] && echo -e "${YELLOW}   Also found $warning_count warning(s)${NC}"
  exit 1
fi
