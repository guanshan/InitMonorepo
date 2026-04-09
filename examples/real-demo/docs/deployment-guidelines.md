# Deployment Guidelines

- Run MySQL and Redis before starting the server.
- Generate Prisma client and SDK artifacts during CI or image build.
- Configure `APP_BASE_PATH` when the app is served from a sub-path such as `/real-demo`.
- Set `VITE_BASE_PATH` during the web build to the same normalized path as `APP_BASE_PATH`.
- When building the Docker image for a non-root deployment, pass `--build-arg VITE_BASE_PATH=/real-demo` so the SPA basename and emitted asset paths match the deployed URL prefix.
- When running the provided Docker helper locally for a non-root deployment, set `APP_BASE_PATH=/real-demo` so the NestJS server and frontend asset paths stay aligned.
- NestJS serves the built frontend from `apps/web/dist/client` and injects `window.__APP_CONFIG__` into `index.html` at runtime.
- In same-origin deployments, leave `APP_RUNTIME_API_BASE_URL` empty so the server injects the app base path and SDK calls resolve to `${APP_BASE_PATH}/api/v1/*`.
- In cross-origin deployments, set `APP_RUNTIME_API_BASE_URL` to the external API origin, for example `https://api.example.com`.
- If the built frontend is missing or targets a different base path than `APP_BASE_PATH`, production startup should fail fast; non-production startup should warn and skip static frontend hosting until the web app is rebuilt.
- During local development, leave `VITE_API_BASE_URL` empty unless you intentionally want the frontend to call a cross-origin API directly instead of using the `/api` proxy.
- `TRUST_PROXY` defaults to `false`. Set it explicitly to match your reverse-proxy chain (e.g. `loopback` for a local proxy, or a hop count for cloud load balancers). Leaving it as `false` is the safest option when clients connect directly.
- Health diagnostics remain outside the API prefix and always resolve from `/health`, `/ready`, and `/live`.
- Keep router basename and static asset prefixes build-time fixed; do not try to mutate them after deployment.
- `docker build -t real-demo .` produces a single image containing both server runtime artifacts and frontend static assets.
