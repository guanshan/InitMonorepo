# API Guidelines

- Use a consistent `{ success, data, meta }` envelope for successful responses.
- Validate write payloads with Zod-backed pipes.
- Keep OpenAPI operation ids stable because the SDK generation depends on them.
