# Package Guidelines

- `packages/shared` stays framework-agnostic and carries contracts, schemas, and low-level utilities only.
- `packages/ui` owns shared design tokens and reusable presentation primitives.
- `packages/sdk` separates generated transport/types from React Query hooks through subpath exports.
- New packages must define `name`, `type`, `exports`, `files`, and TypeScript project-reference participation from the start.
