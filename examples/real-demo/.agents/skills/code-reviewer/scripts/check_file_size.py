#!/usr/bin/env python3
"""
Check changed source files against pragmatic size limits for this monorepo.

The goal is not to force arbitrary purity, but to warn when a file becomes
hard to review or likely owns too many responsibilities.
"""

from __future__ import annotations

import sys
from pathlib import Path


SOURCE_SUFFIXES = {".ts", ".tsx", ".js", ".jsx"}
EXCLUDED_PATH_PARTS = {
    "dist",
    ".react-router",
    "storybook-static",
}
EXCLUDED_EXACT_SUFFIXES = (
    ".d.ts",
    ".stories.tsx",
    ".stories.ts",
)
EXCLUDED_PATH_PREFIXES = (
    "apps/web/src/locales/",
    "packages/sdk/src/generated/",
)


def is_excluded(path: Path) -> bool:
    path_str = str(path).replace("\\", "/")
    if any(part in EXCLUDED_PATH_PARTS for part in path.parts):
        return True
    if path_str.startswith(EXCLUDED_PATH_PREFIXES):
        return True
    if path_str.endswith(EXCLUDED_EXACT_SUFFIXES):
        return True
    return False


def limits_for(path: Path) -> tuple[int, int]:
    path_str = str(path).replace("\\", "/")

    if path_str.startswith(("apps/web/", "packages/ui/")):
        return (400, 650)
    if path_str.startswith(("apps/server/", "packages/shared/", "packages/sdk/")):
        return (500, 900)
    return (450, 800)


def check_file_sizes(files: list[str]) -> list[dict[str, object]]:
    issues: list[dict[str, object]] = []

    for file_path in files:
        path = Path(file_path)
        if not path.exists() or not path.is_file():
            continue
        if path.suffix not in SOURCE_SUFFIXES:
            continue
        if is_excluded(path):
            continue

        try:
            with path.open("r", encoding="utf-8") as handle:
                lines = sum(1 for _ in handle)
        except Exception as exc:  # pragma: no cover - defensive
            print(f"Error reading {file_path}: {exc}", file=sys.stderr)
            continue

        soft_limit, hard_limit = limits_for(path)
        if lines > hard_limit:
            issues.append(
                {
                    "file": str(path),
                    "lines": lines,
                    "limit": hard_limit,
                    "severity": "CRITICAL",
                    "message": f"Exceeds hard limit ({hard_limit} lines)",
                }
            )
        elif lines > soft_limit:
            issues.append(
                {
                    "file": str(path),
                    "lines": lines,
                    "limit": soft_limit,
                    "severity": "WARNING",
                    "message": f"Exceeds soft limit ({soft_limit} lines)",
                }
            )

    return issues


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: check_file_size.py <file1> [file2] ...", file=sys.stderr)
        sys.exit(1)

    issues = check_file_sizes(sys.argv[1:])
    if not issues:
        print("✅ All checked files are within size limits")
        sys.exit(0)

    print(f"Found {len(issues)} file size issue(s):\n")
    for issue in issues:
        severity = issue["severity"]
        marker = "❌" if severity == "CRITICAL" else "⚠️"
        print(f"{marker} [{severity}] {issue['file']}")
        print(f"   Lines: {issue['lines']} (limit: {issue['limit']})")
        print(f"   {issue['message']}\n")

    sys.exit(1 if any(issue["severity"] == "CRITICAL" for issue in issues) else 0)


if __name__ == "__main__":
    main()
