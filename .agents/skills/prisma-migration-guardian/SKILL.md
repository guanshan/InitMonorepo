---
name: prisma-migration-guardian
description: Guard the Prisma migration chain for this repo. Use when local Prisma migration artifacts already exist, when working with apps/server/prisma, schema.prisma, migration.sql, migration_lock.toml, db:migrate, db:migrate:dev, or db:reset, when checking whether local migrations still connect cleanly to the current branch's upstream, or when deciding whether to keep, delete, regenerate, or recreate local Prisma migration folders after syncing remote changes.
---

# Prisma Migration Guardian

> **Skill Directory**: `.agents/skills/prisma-migration-guardian/`
> All bundled resource paths below (scripts, references, assets) are relative to this directory.

Protect the Prisma migration history in this repository from stale local generation, orphan migration folders, drift between `schema.prisma` and shipped SQL, and unsafe reuse of migration artifacts after syncing the current branch.

## User-visible outcome

- Local Prisma artifacts are classified as safe, stale, or broken
- The current branch is compared against its upstream, not hard-coded to `main`
- Stale local migration folders are deleted and regenerated from the latest branch state
- Custom/data migrations are preserved intentionally instead of being silently lost
- Broken states such as "migration folder without `migration.sql`" or "shipped migration edited after apply" are detected before commit

## Core rules

1. Treat `apps/server/prisma/schema.prisma`, every `apps/server/prisma/migrations/<NNNN_name>/migration.sql`, and `apps/server/prisma/migration_lock.toml` as one atomic unit. Sort order of the migration directory names is the apply order — renaming or re-prefixing a committed migration breaks teammates' databases.
2. Never trust `git stash` / `git pull` / `git stash pop` to keep Prisma artifacts semantically valid. They only preserve files, not the schema baseline that produced them.
3. If the current branch's upstream changed `schema.prisma` or anything under `prisma/migrations/**` while local uncommitted migration artifacts exist, treat those local artifacts as stale candidates.
4. Never hand-edit the SQL inside a migration that is already shared in history. Prisma trusts folder name + checksum; silently rewriting an applied migration desynchronises every other developer's `_prisma_migrations` table and bricks `prisma migrate deploy`.
5. Use `prisma migrate dev --create-only --name <name>` for pure data migrations or mixed migrations that require controlled SQL order, then hand-edit the generated `migration.sql` before applying.
6. Stop any running dev server that holds the local database open before `make db-reset` or `make db-migrate`.
7. If a shared migration is incomplete or wrong, repair it with a forward-only follow-up migration unless the user explicitly wants history rewritten.

## Workflow

### 1. Inspect local Prisma state

Run:

```bash
git status --short apps/server/prisma
python3 .agents/skills/prisma-migration-guardian/scripts/check_prisma_chain.py .
```

Focus on:

- uncommitted migration directories
- uncommitted `schema.prisma` changes
- `migration_lock.toml` changes (provider switch is a red flag)
- migration folders without a `migration.sql`
- duplicate numeric prefixes
- migration directory names that break the sequential `NNNN_name` convention used by this repo

### 2. Inspect the current branch and upstream

Run:

```bash
git branch --show-current
git rev-parse --abbrev-ref --symbolic-full-name @{upstream}
git fetch --prune
git diff --name-only HEAD..@{upstream} -- apps/server/prisma
```

If the branch has no upstream, stop and ask the user how they want to compare remote state.

### 3. Decide whether local artifacts are still trustworthy

Treat local Prisma artifacts as stale if **any** of these are true:

- upstream added, renamed, or modified any directory under `apps/server/prisma/migrations/`
- upstream changed `apps/server/prisma/schema.prisma`
- upstream changed `apps/server/prisma/migration_lock.toml`
- the local chain checker reports a migration folder without `migration.sql`
- the local chain checker reports duplicate numeric prefixes
- the locally generated migration folder's numeric prefix collides with a prefix that landed upstream
- the local `schema.prisma` no longer matches the schema baseline that the locally generated SQL was diffed against

If local artifacts are stale:

1. sync the current branch with upstream
2. delete only the **local uncommitted** migration directories
3. re-apply the intended schema edits to `schema.prisma`
4. regenerate from the updated branch state

### 4. Handle migration type correctly

#### Schema migration

If the migration is purely a schema diff:

```bash
pnpm --filter @<scope>/server db:migrate:dev --name <migration_name>
```

This creates the next `NNNN_<migration_name>/migration.sql` folder, applies it to the local database, and updates `_prisma_migrations`.

#### Custom/data migration

If the migration is data-only or order-sensitive, do **not** let Prisma auto-apply it. Instead:

```bash
pnpm --filter @<scope>/server exec prisma migrate dev --create-only \
  --schema prisma/schema.prisma --name <migration_name>
```

1. Prisma writes an empty `migration.sql` shell under a new prefix
2. Author the required SQL (inserts, updates, controlled DDL order) inside that file
3. Then apply:

```bash
pnpm --filter @<scope>/server db:migrate:dev
```

#### Mixed migration

If the migration mixes schema and data backfill:

1. First edit `schema.prisma` to the desired state and run `prisma migrate dev --create-only` so the schema diff SQL is generated correctly
2. Then hand-edit the generated `migration.sql` to interleave or reorder backfill statements safely (e.g. backfill before `NOT NULL`, drop after copy)
3. Do **not** split the single migration into a schema-only migration and a "just data" migration that would be reorderable with it — keep them in one atomic folder

See `references/checklist.md` for decision details.

### 5. Regenerate safely

After syncing the current branch and removing stale local artifacts:

1. apply the intended schema state in `apps/server/prisma/schema.prisma`
2. generate the next migration (schema or `--create-only` per above)
3. verify the chain again with the checker
4. only then run:

```bash
make db-migrate
```

If you need a destructive local reset for verification:

```bash
make db-reset
```

But only after stopping running dev processes, and never against a shared database.

### 6. Final validation before commit

Run:

```bash
python3 .agents/skills/prisma-migration-guardian/scripts/check_prisma_chain.py .
git status --short apps/server/prisma
```

Optionally verify the migration history still matches the database and the current `schema.prisma` baseline:

```bash
pnpm --filter @<scope>/server exec prisma migrate status --schema prisma/schema.prisma
```

or, if a clean database check is needed:

```bash
make db-reset
```

Do not proceed to commit if:

- a migration folder exists without a `migration.sql`
- two migration folders share the same `NNNN_` numeric prefix
- `migration_lock.toml` changed provider without a conscious cross-database migration plan
- `schema.prisma` has uncommitted changes but no new migration folder was generated
- the branch is behind upstream and local generated artifacts have not been regenerated on top of the new upstream baseline
- a committed migration's `migration.sql` was edited in place (shared history must be forward-only)

## Special cases

### Current branch matters

Always compare against the **current checked-out branch's upstream**. Do not assume `main`.

### Shared-history emergency rollback

If a migration already in shared history was used as a temporary rollback:

1. do not edit it in place
2. add a forward-only follow-up migration that restores the intended final model
3. keep `schema.prisma` aligned with that intended final model

### Runtime code still depends on a dropped table or column

If application code still references a table/column that a migration deleted:

1. do not restore it by editing the shipped `migration.sql`
2. first determine whether the intended architecture wants it gone
3. if it should stay deleted, migrate code to the new storage model
4. if a temporary restore migration already landed in shared history, add a forward-only cleanup migration afterwards

### `prisma db push` drift

`prisma db push` skips migrations and writes directly to the database. If someone ran it locally, the DB will pass startup checks but the migration history will be silently wrong. If you suspect this, run `prisma migrate status` before generating a new migration; otherwise the next `migrate dev` will try to "fix" a state that teammates never saw.

## Resources

- `scripts/check_prisma_chain.py` — local chain integrity checker for migration folders, `migration.sql` presence, prefix uniqueness, and lock file consistency
- `references/checklist.md` — project-specific decision matrix for stale artifacts, custom migrations, and forward-only repair
