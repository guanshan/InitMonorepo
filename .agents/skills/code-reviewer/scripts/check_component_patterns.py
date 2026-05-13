#!/usr/bin/env python3
"""
Check common frontend review issues for this monorepo.

This script intentionally uses a small set of heuristics that are useful during
review without trying to fully lint the codebase.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path


IMG_RE = re.compile(r"<img\b", re.IGNORECASE)
INPUT_RE = re.compile(r"<(input|textarea)\b", re.IGNORECASE)
FETCH_RE = re.compile(r"\bfetch\s*\(")
CJK_RE = re.compile(r"[\u4e00-\u9fff]")
JSX_TEXT_CJK_RE = re.compile(r">[^<>\n]*[\u4e00-\u9fff][^<>\n]*<")
QUOTED_CJK_RE = re.compile(r"""(['"`])[^'"`\n]*[\u4e00-\u9fff][^'"`\n]*\1""")


def issue(file_path: Path, line_number: int, severity: str, message: str, code: str) -> dict[str, object]:
    return {
        "file": str(file_path),
        "line": line_number,
        "severity": severity,
        "category": "Component Pattern",
        "message": message,
        "code": code.strip(),
    }


def check_modal_titles(file_path: Path, content: str) -> list[dict[str, object]]:
    issues: list[dict[str, object]] = []
    lines = content.splitlines()

    if "Dialog.Content" in content and "Dialog.Title" not in content:
        for i, line in enumerate(lines, 1):
            if "Dialog.Content" in line:
                issues.append(
                    issue(
                        file_path,
                        i,
                        "WARNING",
                        "Dialog.Content appears without a Dialog.Title in the same file.",
                        line,
                    )
                )
                break

    if "@<scope>/ui" in content and "<Modal" in content:
        for i, line in enumerate(lines, 1):
            if "<Modal" not in line:
                continue
            snippet = "\n".join(lines[i - 1 : min(len(lines), i + 5)])
            if "title=" not in snippet:
                issues.append(
                    issue(
                        file_path,
                        i,
                        "WARNING",
                        "Modal from @<scope>/ui should provide a title prop for accessibility.",
                        line,
                    )
                )

    return issues


def check_images(file_path: Path, content: str) -> list[dict[str, object]]:
    issues: list[dict[str, object]] = []
    for i, line in enumerate(content.splitlines(), 1):
        if IMG_RE.search(line) and "alt=" not in line:
            issues.append(
                issue(
                    file_path,
                    i,
                    "CRITICAL",
                    "Image tag is missing alt text.",
                    line,
                )
            )
    return issues


def check_placeholder_only_inputs(file_path: Path, content: str) -> list[dict[str, object]]:
    issues: list[dict[str, object]] = []
    lines = content.splitlines()

    for i, line in enumerate(lines, 1):
        if not INPUT_RE.search(line):
            continue
        snippet = "\n".join(lines[max(0, i - 8) : min(len(lines), i + 8)])
        has_placeholder = "placeholder=" in snippet
        has_accessible_name = any(
            token in snippet
            for token in ("<label", "aria-label=", "aria-labelledby=", "<Label", "title=")
        )
        if has_placeholder and not has_accessible_name:
            issues.append(
                issue(
                    file_path,
                    i,
                    "WARNING",
                    "Form control appears to rely on placeholder text without an explicit label/aria-label.",
                    line,
                )
            )
    return issues


def check_hardcoded_cjk(file_path: Path, content: str) -> list[dict[str, object]]:
    issues: list[dict[str, object]] = []
    path_str = str(file_path).replace("\\", "/")
    if "/locales/" in path_str or path_str.endswith(".test.tsx") or path_str.endswith(".spec.tsx"):
        return issues

    for i, line in enumerate(content.splitlines(), 1):
        stripped = line.strip()
        if (
            not stripped
            or stripped.startswith("//")
            or stripped.startswith("/*")
            or stripped.startswith("*")
            or stripped.startswith("*/")
        ):
            continue
        if CJK_RE.search(line):
            if any(token in line for token in ('t("', "t('", "locales/", "description:")):
                continue
            if not (JSX_TEXT_CJK_RE.search(line) or QUOTED_CJK_RE.search(line)):
                continue
            issues.append(
                issue(
                    file_path,
                    i,
                    "WARNING",
                    "Possible hardcoded Chinese UI copy outside locale files.",
                    line,
                )
            )
    return issues


def check_frontend_fetch(file_path: Path, content: str) -> list[dict[str, object]]:
    issues: list[dict[str, object]] = []
    for i, line in enumerate(content.splitlines(), 1):
        if FETCH_RE.search(line):
            issues.append(
                issue(
                    file_path,
                    i,
                    "WARNING",
                    "Direct fetch() detected in frontend code. Prefer @<scope>/sdk or shared request utilities.",
                    line,
                )
            )
    return issues


def analyze_file(file_path: Path) -> list[dict[str, object]]:
    path_str = str(file_path).replace("\\", "/")
    if not path_str.startswith("apps/web/src/"):
        return []
    if file_path.suffix not in {".ts", ".tsx"}:
        return []

    try:
        content = file_path.read_text(encoding="utf-8")
    except Exception as exc:  # pragma: no cover - defensive
        print(f"Error reading {file_path}: {exc}", file=sys.stderr)
        return []

    issues: list[dict[str, object]] = []
    issues.extend(check_modal_titles(file_path, content))
    issues.extend(check_images(file_path, content))
    issues.extend(check_placeholder_only_inputs(file_path, content))
    issues.extend(check_hardcoded_cjk(file_path, content))
    issues.extend(check_frontend_fetch(file_path, content))
    return issues


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: check_component_patterns.py <file1> [file2] ...", file=sys.stderr)
        sys.exit(1)

    all_issues: list[dict[str, object]] = []
    for file_arg in sys.argv[1:]:
        path = Path(file_arg)
        if path.exists() and path.is_file():
            all_issues.extend(analyze_file(path))

    if not all_issues:
        print("✅ No component pattern issues found")
        sys.exit(0)

    critical = [item for item in all_issues if item["severity"] == "CRITICAL"]
    warnings = [item for item in all_issues if item["severity"] == "WARNING"]

    if critical:
        print(f"❌ Found {len(critical)} CRITICAL component pattern issue(s):\n")
        for item in critical:
            print(f"[CRITICAL] {item['file']}:{item['line']}")
            print(f"  Issue: {item['message']}")
            print(f"  Code: {item['code']}\n")

    if warnings:
        print(f"⚠️  Found {len(warnings)} component pattern warning(s):\n")
        for item in warnings:
            print(f"[WARNING] {item['file']}:{item['line']}")
            print(f"  Issue: {item['message']}")
            print(f"  Code: {item['code']}\n")

    sys.exit(1 if critical else 0)


if __name__ == "__main__":
    main()
