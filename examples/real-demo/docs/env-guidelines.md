# Environment Guidelines

- Validate backend environment variables through Zod in `apps/server/src/common/config/env.ts` and fail fast on invalid startup input.
- Treat `VITE_*` variables as build-time only.
- Leave `VITE_API_BASE_URL` empty by default so local development uses same-origin `/api` requests through the React Router dev server proxy.
- Set `VITE_API_BASE_URL` explicitly only for intentional cross-origin API targets.
- Treat `APP_RUNTIME_API_BASE_URL` as deploy-time runtime config injected into `window.__APP_CONFIG__`.
- `TRUST_PROXY` defaults to `false`. Configure it explicitly to match your real proxy chain so request IPs, logging, and rate limiting behave correctly in production.
- Keep `.env.production` free of secrets; real production connection strings must come from the deployment environment.
- Normalize `APP_BASE_PATH` once in the config layer and reuse that normalized value everywhere else.
