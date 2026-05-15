#!/usr/bin/env python3
"""
Initialize a new skill with a minimal standard-compliant scaffold.

Examples:
  init_skill.py pdf-analyzer --path skills
  init_skill.py sql-review --path .agents/skills --with-references --with-evals
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

SKILL_TEMPLATE = """---
name: {skill_name}
description: Describe what this skill does and when to use it. Use when the user asks for {trigger_hint}.
---

# {skill_title}

## Overview

Describe the capability this skill adds and what project-specific knowledge or workflow it captures.

## When to use

- Replace this with 2-3 concrete user requests or task contexts that should trigger the skill.

## Workflow

1. Replace this draft with the shortest reliable workflow for the task.
2. Add scripts only if determinism or repeated logic materially improves results.
3. Move long supporting detail into references/ instead of bloating SKILL.md.
"""

EVALS_TEMPLATE = """{
  "skill_name": "{skill_name}",
  "evals": [
    {
      "id": 1,
      "prompt": "Replace with a realistic user prompt",
      "expected_output": "Describe what a good result looks like",
      "files": [],
      "expectations": []
    }
  ]
}
"""


def title_case_skill_name(skill_name: str) -> str:
    return " ".join(word.capitalize() for word in skill_name.split("-"))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Initialize a minimal skill scaffold")
    parser.add_argument("skill_name", help="Hyphen-case skill identifier")
    parser.add_argument("--path", required=True, help="Parent directory where the skill directory will be created")
    parser.add_argument("--with-scripts", action="store_true", help="Create an empty scripts/ directory")
    parser.add_argument("--with-references", action="store_true", help="Create an empty references/ directory")
    parser.add_argument("--with-assets", action="store_true", help="Create an empty assets/ directory")
    parser.add_argument("--with-evals", action="store_true", help="Create evals/evals.json")
    return parser.parse_args()


def validate_skill_name(skill_name: str) -> None:
    if not skill_name:
        raise ValueError("Skill name cannot be empty")
    if len(skill_name) > 64:
        raise ValueError("Skill name must be 64 characters or fewer")
    if not all(char.islower() or char.isdigit() or char == "-" for char in skill_name):
        raise ValueError("Skill name must use lowercase letters, digits, and hyphens only")
    if skill_name.startswith("-") or skill_name.endswith("-") or "--" in skill_name:
        raise ValueError("Skill name cannot start/end with hyphen or contain consecutive hyphens")


def init_skill(args: argparse.Namespace) -> Path:
    validate_skill_name(args.skill_name)
    skill_dir = Path(args.path).resolve() / args.skill_name

    if skill_dir.exists():
        raise FileExistsError(f"Skill directory already exists: {skill_dir}")

    skill_dir.mkdir(parents=True)
    skill_title = title_case_skill_name(args.skill_name)
    trigger_hint = args.skill_name.replace("-", " ")

    (skill_dir / "SKILL.md").write_text(
        SKILL_TEMPLATE.format(
            skill_name=args.skill_name,
            skill_title=skill_title,
            trigger_hint=trigger_hint,
        ),
        encoding="utf-8",
    )

    if args.with_scripts:
        (skill_dir / "scripts").mkdir()
    if args.with_references:
        (skill_dir / "references").mkdir()
    if args.with_assets:
        (skill_dir / "assets").mkdir()
    if args.with_evals:
        evals_dir = skill_dir / "evals"
        evals_dir.mkdir()
        (evals_dir / "evals.json").write_text(
            EVALS_TEMPLATE.format(skill_name=args.skill_name),
            encoding="utf-8",
        )

    return skill_dir


def main() -> None:
    args = parse_args()

    try:
        skill_dir = init_skill(args)
    except Exception as error:
        print(f"❌ {error}")
        sys.exit(1)

    print(f"✅ Created skill scaffold: {skill_dir}")
    print("Next steps:")
    print("1. Replace the placeholder frontmatter description with a precise trigger description")
    print("2. Rewrite the draft workflow with concrete, high-signal instructions")
    print("3. Add scripts/, references/, assets/, or evals/ only if they materially improve the skill")
    print(f"4. Run: python {Path(__file__).name.replace('init', 'validate')} {skill_dir}")


if __name__ == "__main__":
    main()
