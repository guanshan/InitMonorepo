# Prisma Migration Checklist

## Scope

Apply this checklist only to:

- `apps/server/prisma/schema.prisma`
- `apps/server/prisma/migrations/<NNNN_name>/migration.sql`
- `apps/server/prisma/migration_lock.toml`

## Decision matrix

### Case 1: local schema changed, no local migration folder yet

Action:

1. fetch current branch upstream
2. confirm upstream did not change `prisma/**` unexpectedly
3. run `pnpm --filter @<scope>/server db:migrate:dev --name <name>`

### Case 2: local migration folder exists, upstream unchanged in `prisma/**`

Action:

1. run `python3 .agents/skills/prisma-migration-guardian/scripts/check_prisma_chain.py .`
2. if the chain is clean, keep working
3. if the chain is broken (missing `migration.sql`, duplicate prefix, bad name), delete the local generated folder and regenerate

### Case 3: local migration folder exists, upstream changed `prisma/**`

Action:

1. treat the local generated folder as stale
2. preserve custom SQL intent if needed (copy the hand-written body somewhere outside `prisma/`)
3. sync current branch with upstream
4. delete the local uncommitted migration folder
5. reconcile `schema.prisma` with upstream then regenerate from the new baseline

### Case 4: custom/data migration

Use:

```bash
pnpm --filter @<scope>/server exec prisma migrate dev --create-only \
  --schema prisma/schema.prisma --name <name>
```

Then hand-author the SQL body inside the generated `migration.sql`.

Never copy SQL from an older migration and rename the folder to fake the node — Prisma checksums the SQL, and teammates who already applied the older folder will not re-apply the copy.

### Case 5: migration folder exists without `migration.sql`

This is an invalid node.

Preferred repair:

1. if the folder is unshared (uncommitted), delete it and recreate properly
2. if the folder was already shared, stop and ask the user — the only correct path is usually a forward-only follow-up that makes the intended schema state match reality, because every teammate's `_prisma_migrations` table may already carry the empty node's checksum

### Case 6: shared history contains temporary rollback migration

Example pattern:

1. migration A drops obsolete table
2. migration B temporarily restores it for compatibility
3. code is migrated to the new model
4. migration C drops the temporary rollback table again

This is acceptable only if:

- B is a complete, atomic folder (`migration.sql` committed, applies cleanly)
- C exists to return to the intended final architecture
- Neither A nor B is rewritten in place after being applied anywhere

## Project-specific red flags

- a committed `migration.sql` changed content (Prisma checksum mismatch on teammates' DBs)
- two migration folders share the same `NNNN_` prefix
- a migration folder was renamed after being committed
- `_prisma_migrations` advanced locally (via `db push` or an aborted `migrate dev`) but no matching folder got committed
- code migrated to a new storage model but a later commit silently reintroduced old table dependencies
- running `make dev` while resetting the same local database causes runtime tasks to read half-migrated schema
- `migration_lock.toml` provider changed (e.g. `mysql` → `postgresql`) without an explicit cross-database plan

## Required stop conditions

Stop and ask the user before proceeding if:

- the current branch has no upstream
- the remote branch was force-pushed and local migration history no longer has a safe base
- a migration already used by teammates would need to be renamed, reordered, or rewritten
- you cannot distinguish whether a migration is schema-only or custom/data-sensitive
- `prisma migrate status` reports drift you did not introduce

## Recommended commands

```bash
git branch --show-current
git rev-parse --abbrev-ref --symbolic-full-name @{upstream}
git fetch --prune
git diff --name-only HEAD..@{upstream} -- apps/server/prisma
git status --short apps/server/prisma
python3 .agents/skills/prisma-migration-guardian/scripts/check_prisma_chain.py .
pnpm --filter @<scope>/server db:migrate:dev --name <name>
pnpm --filter @<scope>/server exec prisma migrate dev --create-only \
  --schema prisma/schema.prisma --name <name>
pnpm --filter @<scope>/server exec prisma migrate status --schema prisma/schema.prisma
make db-migrate
make db-reset
```
