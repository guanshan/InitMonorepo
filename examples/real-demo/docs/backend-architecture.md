# Backend Architecture

- `modules/users/domain` defines business-facing types.
- `modules/users/application` owns use cases and repository ports.
- `modules/users/infrastructure` bridges Prisma and Redis.
- `modules/users/interfaces` exposes controllers, Zod/OpenAPI DTOs, and presenters.
- `common` and `infrastructure` provide cross-cutting runtime services.
