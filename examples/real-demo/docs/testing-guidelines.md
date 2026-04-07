# Testing Guidelines

- Keep Vitest as the default runner for frontend, backend, shared package, and e2e coverage.
- Use MSW for frontend request mocking so UI tests stay SDK-oriented instead of stubbing `fetch` directly.
- Prefer fake adapters for backend e2e tests when the goal is response-contract coverage rather than infrastructure smoke tests.
- Add focused tests when touching cache keys, environment normalization, or OpenAPI generation because those breakages are easy to miss in manual review.
- Build Storybook when changing `packages/ui` primitives to catch regressions in shared styling and interaction states.
