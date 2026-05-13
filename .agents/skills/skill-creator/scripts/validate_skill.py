#!/usr/bin/env python3
"""
Skill Validator - Validates a skill folder meets all requirements

Usage:
    python scripts/validate_skill.py <path/to/skill-folder>

Example:
    python scripts/validate_skill.py .agents/skills/my-skill
"""

import sys
from pathlib import Path
from quick_validate import validate_skill as quick_validate


def validate(skill_path):
    """
    Validate a skill folder.

    Args:
        skill_path: Path to the skill folder

    Returns:
        True if valid, False otherwise
    """
    skill_path = Path(skill_path).resolve()

    # Validate skill folder exists
    if not skill_path.exists():
        print(f"❌ Error: Skill folder not found: {skill_path}")
        return False

    if not skill_path.is_dir():
        print(f"❌ Error: Path is not a directory: {skill_path}")
        return False

    # Validate SKILL.md exists
    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        print(f"❌ Error: SKILL.md not found in {skill_path}")
        return False

    # Run validation
    valid, message = quick_validate(skill_path)
    if not valid:
        print(f"❌ Validation failed: {message}")
        return False

    print(f"✅ {message}")
    return True


def main():
    if len(sys.argv) != 2:
        print("Usage: python scripts/validate_skill.py <path/to/skill-folder>")
        print("\nExample:")
        print("  python scripts/validate_skill.py .agents/skills/my-skill")
        sys.exit(1)

    skill_path = sys.argv[1]
    print(f"🔍 Validating skill: {skill_path}\n")

    if validate(skill_path):
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
