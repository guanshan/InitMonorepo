# =============================================================================
# Stage 1: Base image with pnpm
# =============================================================================
FROM node:24-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"

RUN corepack enable

WORKDIR /app

# =============================================================================
# Stage 2: Prune workspace for server
# =============================================================================
FROM base AS prune-server

COPY . .
RUN pnpm dlx turbo prune @real-demo/server --docker

# =============================================================================
# Stage 3: Prune workspace for web
# =============================================================================
FROM base AS prune-web

COPY . .
RUN pnpm dlx turbo prune @real-demo/web --docker

# =============================================================================
# Stage 4: Install dependencies and build server
# =============================================================================
FROM base AS build-server

COPY --from=prune-server /app/out/json/ .
RUN pnpm install --frozen-lockfile

COPY --from=prune-server /app/out/full/ .
RUN pnpm --filter @real-demo/server prisma:generate
RUN pnpm turbo build --filter=@real-demo/server

# =============================================================================
# Stage 5: Install dependencies and build web
# =============================================================================
FROM base AS build-web

ARG VITE_BASE_PATH
ENV VITE_BASE_PATH="${VITE_BASE_PATH}"

COPY --from=prune-web /app/out/json/ .
RUN pnpm install --frozen-lockfile

COPY --from=prune-web /app/out/full/ .
RUN pnpm turbo build --filter=@real-demo/web

# =============================================================================
# Stage 6: Produce a runtime-only server bundle
# =============================================================================
FROM build-server AS deploy-server

RUN pnpm --filter @real-demo/server deploy --prod --legacy /out/server \
  && source_prisma_runtime_dir="$(find node_modules/.pnpm -path '*/node_modules/.prisma' -type d | head -n 1)" \
  && target_prisma_client_dir="$(find /out/server/node_modules/.pnpm -path '*/node_modules/@prisma/client' -type d | head -n 1)" \
  && if [ -n "${source_prisma_runtime_dir}" ] && [ -n "${target_prisma_client_dir}" ]; then \
    target_prisma_runtime_dir="$(dirname "$(dirname "${target_prisma_client_dir}")")/.prisma"; \
    mkdir -p "${target_prisma_runtime_dir}"; \
    cp -R "${source_prisma_runtime_dir}"/. "${target_prisma_runtime_dir}"/; \
  fi

# =============================================================================
# Stage 7: Production runner — minimal image
# =============================================================================
FROM node:24-bookworm-slim AS runner

ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
ENV NODE_ENV="production"

RUN corepack enable
RUN groupadd --system app && useradd --system --gid app --create-home app

WORKDIR /app

# Copy server runtime artifacts
COPY --from=deploy-server /out/server ./apps/server

# Copy frontend static build artifacts for the server to host
COPY --from=build-web /app/apps/web/dist ./apps/web/dist

EXPOSE 13000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:13000/live').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1))"

USER app

CMD ["node", "apps/server/dist/main.js"]
