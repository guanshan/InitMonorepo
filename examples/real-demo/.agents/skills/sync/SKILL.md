---
name: sync
description: Safely sync local changes with the remote branch. Use when the user asks to sync, pull latest, update from remote, or run /sync.
---

# Sync

> **Skill Directory**: `.agents/skills/sync/`
> All bundled resource paths below are relative to this directory.

Safely sync the current branch with its upstream without losing local work.

## User-visible outcome

- Local staged, unstaged, and untracked work is preserved
- Latest remote changes are pulled onto the current branch
- Local work is restored after pull
- Mechanical success/failure is summarized clearly

## Workflow

### 1. Inspect current state

Before making changes, check:

```bash
git status --short --branch
git remote -v
git stash list | head -20
```

If the current branch has no upstream tracking branch, stop and explain the issue.

### 2. Stash local work

Stash local work manually:

```bash
STAMP=$(date +%Y%m%d-%H%M%S)
git stash push -u -m "sync-before-pull-$STAMP"
```

- Use `-u` so untracked files are also protected
- This matches the repository's preference for explicit, recoverable sync steps

### 3. Pull latest code

Use rebase by default to keep history linear:

```bash
git pull --rebase
```

- Prefer `--rebase` for cleaner history
- If pull fails before local work is restored, report the failure and confirm the stash is still available

### 4. Restore local work

If a stash was created, restore it:

```bash
git stash pop
```

If `git stash pop` conflicts:

1. Run `git status`
2. Resolve only mechanical conflicts automatically
3. Stop and ask the user about semantic or business-logic conflicts

### 5. Present the result

Always summarize:

- current branch
- upstream branch
- whether anything was stashed
- whether pull succeeded
- whether local work was restored cleanly
- whether any conflicts need attention

## Stop and ask the user when

- the branch has no upstream
- pull/rebase creates semantic conflicts
- stash restore creates semantic conflicts
- authentication or remote permissions block the sync

## Resources

- This repository prefers `git pull --rebase` over merge-based sync
