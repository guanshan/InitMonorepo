# Dependency Boundaries

- `apps/web` can depend on `@real-demo/sdk`, `@real-demo/shared`, and `@real-demo/ui`.
- `apps/server` can depend on `@real-demo/shared` but not on `@real-demo/sdk` or `@real-demo/ui`.
- Server `domain` files must stay free of NestJS, Prisma, and interface/infrastructure imports.
- Server `application` files must depend on ports and domain contracts instead of concrete infrastructure.
- Server `interfaces` files call use cases and should not reach into infrastructure directly.
- `packages/sdk` can depend on `@real-demo/shared`.
- `packages/shared` must stay framework-agnostic.
