#!/usr/bin/env python3
"""
Check Prisma migration chain integrity for this repository.

Usage:
    python3 scripts/check_prisma_chain.py /path/to/repo

The script reports:
- migration folders without a migration.sql
- duplicate NNNN_ numeric prefixes
- migration folders whose name breaks the repo's NNNN_name convention
- missing or suspicious migration_lock.toml
- uncommitted prisma/ changes

Unlike Drizzle, Prisma has no _journal.json or prevId chain; order comes from
the sorted migration folder names and the _prisma_migrations table in the DB.
"""

from __future__ import annotations

import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

MIGRATION_NAME_RE = re.compile(r"^(\d{4,})_[a-z0-9][a-z0-9_]*$")


def run(cmd: list[str], cwd: Path) -> str:
    result = subprocess.run(cmd, cwd=cwd, check=False, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or "command failed")
    return result.stdout


def main() -> int:
    repo = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd().resolve()
    prisma_dir = repo / "apps/server/prisma"
    migrations_dir = prisma_dir / "migrations"
    schema_path = prisma_dir / "schema.prisma"
    lock_path = prisma_dir / "migration_lock.toml"

    if not prisma_dir.exists() or not migrations_dir.exists() or not schema_path.exists():
        print("ERROR: prisma directory, migrations directory, or schema.prisma not found")
        return 2

    migration_dirs = sorted(
        [p for p in migrations_dir.iterdir() if p.is_dir()],
        key=lambda p: p.name,
    )

    problems: list[str] = []

    prefix_to_dirs: dict[str, list[str]] = defaultdict(list)
    for d in migration_dirs:
        name = d.name
        match = MIGRATION_NAME_RE.match(name)
        if not match:
            problems.append(
                f"migration folder {name} does not match NNNN_name convention"
            )
            continue
        prefix = match.group(1)
        prefix_to_dirs[prefix].append(name)

        sql_path = d / "migration.sql"
        if not sql_path.exists():
            problems.append(f"migration folder {name} missing migration.sql")
        elif sql_path.stat().st_size == 0:
            problems.append(f"migration folder {name} has empty migration.sql")

        # Any stray file in a migration folder other than migration.sql is suspicious.
        # Prisma only writes migration.sql per folder.
        for entry in d.iterdir():
            if entry.is_file() and entry.name != "migration.sql":
                problems.append(
                    f"unexpected file {entry.name} inside migration folder {name}"
                )
            if entry.is_dir():
                problems.append(
                    f"unexpected subdirectory {entry.name} inside migration folder {name}"
                )

    for prefix, names in sorted(prefix_to_dirs.items()):
        if len(names) > 1:
            problems.append(
                f"duplicate migration prefix {prefix}: {', '.join(names)}"
            )

    if not lock_path.exists():
        problems.append("migration_lock.toml is missing")
    else:
        provider_line = None
        for line in lock_path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if stripped.startswith("provider"):
                provider_line = stripped
                break
        if provider_line is None:
            problems.append("migration_lock.toml has no provider line")

    try:
        status = run(
            ["git", "status", "--short", "apps/server/prisma"],
            repo,
        ).strip()
    except Exception as exc:
        status = f"(git status unavailable: {exc})"

    sorted_prefixes = sorted(prefix_to_dirs.keys(), key=lambda s: int(s))

    print("Prisma chain summary")
    print(f"- repo: {repo}")
    print(f"- migration folders: {len(migration_dirs)}")
    if sorted_prefixes:
        first = sorted_prefixes[0]
        last = sorted_prefixes[-1]
        first_name = prefix_to_dirs[first][0]
        last_name = prefix_to_dirs[last][0]
        print(f"- first migration: {first_name}")
        print(f"- latest migration: {last_name}")
    if lock_path.exists():
        print(f"- lock file: {lock_path.relative_to(repo)}")

    print("\nLocal prisma/ status")
    print(status or "(clean)")

    if problems:
        print("\nProblems")
        for item in problems:
            print(f"- {item}")
        return 1

    print("\nNo chain problems detected.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
