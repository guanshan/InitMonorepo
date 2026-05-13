#!/usr/bin/env python3
"""
Check high-signal architecture violations for this monorepo.

Focus on violations that are both important and low-noise:
- backend DDD layer boundaries
- frontend forbidden imports into Prisma/server internals
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Iterable


IMPORT_RE = re.compile(
    r'^\s*import(?:.+?\s+from\s+)?["\']([^"\']+)["\']',
)


def extract_import_targets(content: str) -> list[tuple[int, str]]:
    targets: list[tuple[int, str]] = []
    for line_number, line in enumerate(content.splitlines(), 1):
        match = IMPORT_RE.match(line)
        if match:
            targets.append((line_number, match.group(1)))
    return targets


def has_layer_segment(target: str, layer: str) -> bool:
    patterns = (
        f"/{layer}/",
        f"../{layer}/",
        f"./{layer}/",
        f"/{layer}",
        f"../{layer}",
        f"./{layer}",
    )
    return any(pattern in target for pattern in patterns)


def issue(
    file_path: Path,
    line_number: int,
    severity: str,
    message: str,
    code: str,
) -> dict[str, object]:
    return {
        "file": str(file_path),
        "line": line_number,
        "severity": severity,
        "category": "Architecture",
        "message": message,
        "code": code.strip(),
    }


def check_server_domain(file_path: Path, imports: Iterable[tuple[int, str]], lines: list[str]) -> list[dict[str, object]]:
    issues: list[dict[str, object]] = []
    for line_number, target in imports:
        if target.startswith("@nestjs") or "nestjs-zod" in target:
            issues.append(
                issue(
                    file_path,
                    line_number,
                    "CRITICAL",
                    "Domain layer must stay framework-agnostic and should not import NestJS/nestjs-zod.",
                    lines[line_number - 1],
                )
            )
        if "@prisma/client" in target or "prisma.service" in target:
            issues.append(
                issue(
                    file_path,
                    line_number,
                    "CRITICAL",
                    "Domain layer must not depend on Prisma.",
                    lines[line_number - 1],
                )
            )
        if any(has_layer_segment(target, layer) for layer in ("application", "infrastructure", "interfaces")):
            issues.append(
                issue(
                    file_path,
                    line_number,
                    "CRITICAL",
                    "Domain layer must not import application/infrastructure/interfaces code.",
                    lines[line_number - 1],
                )
            )
    return issues


def check_server_application(file_path: Path, imports: Iterable[tuple[int, str]], lines: list[str]) -> list[dict[str, object]]:
    issues: list[dict[str, object]] = []
    for line_number, target in imports:
        if any(has_layer_segment(target, layer) for layer in ("infrastructure", "interfaces")):
            issues.append(
                issue(
                    file_path,
                    line_number,
                    "CRITICAL",
                    "Application layer should depend on ports/contracts, not infrastructure or interfaces.",
                    lines[line_number - 1],
                )
            )
        if "@prisma/client" in target or "prisma.service" in target:
            issues.append(
                issue(
                    file_path,
                    line_number,
                    "CRITICAL",
                    "Application layer should not import Prisma or PrismaService directly.",
                    lines[line_number - 1],
                )
            )
    return issues


def check_server_infrastructure(file_path: Path, imports: Iterable[tuple[int, str]], lines: list[str]) -> list[dict[str, object]]:
    issues: list[dict[str, object]] = []
    for line_number, target in imports:
        if has_layer_segment(target, "interfaces"):
            issues.append(
                issue(
                    file_path,
                    line_number,
                    "CRITICAL",
                    "Infrastructure layer must not depend on interfaces/transport code.",
                    lines[line_number - 1],
                )
            )
    return issues


def check_server_interfaces(file_path: Path, imports: Iterable[tuple[int, str]], lines: list[str]) -> list[dict[str, object]]:
    issues: list[dict[str, object]] = []
    for line_number, target in imports:
        if has_layer_segment(target, "infrastructure") or "prisma.service" in target:
            issues.append(
                issue(
                    file_path,
                    line_number,
                    "CRITICAL",
                    "Interfaces layer should call application services/use cases, not infrastructure directly.",
                    lines[line_number - 1],
                )
            )
    return issues


def check_frontend_boundaries(file_path: Path, imports: Iterable[tuple[int, str]], lines: list[str]) -> list[dict[str, object]]:
    issues: list[dict[str, object]] = []
    for line_number, target in imports:
        if "@prisma/client" in target:
            issues.append(
                issue(
                    file_path,
                    line_number,
                    "CRITICAL",
                    "Frontend code must not import Prisma types or clients.",
                    lines[line_number - 1],
                )
            )
        if "apps/server" in target or target.startswith("@<scope>/server"):
            issues.append(
                issue(
                    file_path,
                    line_number,
                    "CRITICAL",
                    "Frontend code must not import server internals.",
                    lines[line_number - 1],
                )
            )
    return issues


def analyze_file(file_path: Path) -> list[dict[str, object]]:
    try:
        content = file_path.read_text(encoding="utf-8")
    except Exception as exc:  # pragma: no cover - defensive
        print(f"Error reading {file_path}: {exc}", file=sys.stderr)
        return []

    path_str = str(file_path).replace("\\", "/")
    lines = content.splitlines()
    imports = extract_import_targets(content)
    issues: list[dict[str, object]] = []

    if "/apps/server/src/modules/" in f"/{path_str}/":
        if "/domain/" in path_str:
            issues.extend(check_server_domain(file_path, imports, lines))
        elif "/application/" in path_str:
            issues.extend(check_server_application(file_path, imports, lines))
        elif "/infrastructure/" in path_str:
            issues.extend(check_server_infrastructure(file_path, imports, lines))
        elif "/interfaces/" in path_str:
            issues.extend(check_server_interfaces(file_path, imports, lines))

    if path_str.startswith("apps/web/"):
        issues.extend(check_frontend_boundaries(file_path, imports, lines))

    return issues


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: check_architecture.py <file1> [file2] ...", file=sys.stderr)
        sys.exit(1)

    all_issues: list[dict[str, object]] = []
    for file_arg in sys.argv[1:]:
        path = Path(file_arg)
        if path.exists() and path.is_file():
            all_issues.extend(analyze_file(path))

    if not all_issues:
        print("✅ No architecture boundary violations found")
        sys.exit(0)

    critical = [item for item in all_issues if item["severity"] == "CRITICAL"]
    warnings = [item for item in all_issues if item["severity"] == "WARNING"]

    if critical:
        print(f"❌ Found {len(critical)} CRITICAL architecture violation(s):\n")
        for item in critical:
            print(f"[CRITICAL] {item['file']}:{item['line']}")
            print(f"  Issue: {item['message']}")
            print(f"  Code: {item['code']}\n")

    if warnings:
        print(f"⚠️  Found {len(warnings)} architecture warning(s):\n")
        for item in warnings:
            print(f"[WARNING] {item['file']}:{item['line']}")
            print(f"  Issue: {item['message']}")
            print(f"  Code: {item['code']}\n")

    sys.exit(1 if critical else 0)


if __name__ == "__main__":
    main()
