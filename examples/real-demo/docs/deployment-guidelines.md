# Deployment Guidelines

- Run MySQL and Redis before starting the server.
- Generate Prisma client and SDK artifacts during CI or image build.
- Configure `APP_BASE_PATH` when the app is served from a sub-path such as `/real-demo`.
- Keep Vite on the default `base: "./"` mode unless you explicitly choose a build-time fixed deployment.
- For build-time fixed deployments, set `VITE_BASE_PATH` during the web build to the same normalized path as `APP_BASE_PATH`.
- NestJS serves the built frontend and injects `window.__APP_CONFIG__` into `index.html` at runtime.
- In same-origin deployments, leave `APP_RUNTIME_API_BASE_URL` empty so the server injects the app base path and SDK calls resolve to `${APP_BASE_PATH}/api/*`.
- In cross-origin deployments, set `APP_RUNTIME_API_BASE_URL` to the external API origin, for example `https://api.example.com`.
- Health diagnostics remain outside the API prefix and always resolve from `/health`, `/ready`, and `/live`.
- For non-root deployments, redirect `${APP_BASE_PATH}` to `${APP_BASE_PATH}/` so relative asset URLs continue to resolve correctly.
- `docker build -t real-demo .` produces a single image containing both server runtime artifacts and frontend static assets.
