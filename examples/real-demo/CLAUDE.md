# Collaboration Notes

- Keep public APIs English-only in this demo.
- Preserve package boundaries: `shared` for contracts, `sdk` for generated or transport-facing code, `ui` for reusable presentation primitives.
- Do not import Prisma models directly into the web app.
- Prefer editing server contracts in `packages/shared` first, then regenerate the SDK.
