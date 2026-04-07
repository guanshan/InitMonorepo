# Cache Guidelines

- All cache access should flow through `CachePort`; application code should not depend directly on Redis clients.
- Use namespace-specific cache keys from `apps/server/src/common/cache/cache-keys.ts`.
- Current namespaces cover query cache (`query:*`), entity cache (`entity:*`), auth/session expansion (`auth:*`), and future rate limiting (`rate-limit:*`).
- The user list uses a query cache entry and user detail uses an entity cache entry to demonstrate both patterns.
- Mutations must invalidate or refresh affected keys explicitly instead of concatenating ad-hoc strings inline.
