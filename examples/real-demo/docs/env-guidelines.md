# Environment Guidelines

- Validate backend environment variables through Zod in `apps/server/src/common/config/env.ts` and fail fast on invalid startup input.
- Treat `VITE_*` variables as build-time only.
- Treat `APP_RUNTIME_BASE_PATH` and `APP_RUNTIME_API_BASE_URL` as deploy-time runtime config injected into `window.__APP_CONFIG__`.
- Keep `.env.production` free of secrets; real production connection strings must come from the deployment environment.
- Normalize `APP_BASE_PATH` once in the config layer and reuse that normalized value everywhere else.
