SHELL := /bin/bash

.DEFAULT_GOAL := help

.PHONY: help setup infra-up infra-down dev dev-web dev-server build lint typecheck test knip check outdated upgrade openapi generate generate-sdk db-migrate db-seed db-reset db-studio clean docker-build docker-run

help: ## Show available commands
	@awk 'BEGIN {FS = " ## "; printf "\nTargets:\n"} /^[a-zA-Z0-9_:\\.-]+:.*## / { target = $$1; gsub(/\\/, "", target); sub(/:[^:]*$$/, "", target); printf "  %-18s %s\n", target, $$2 }' $(MAKEFILE_LIST)

setup: ## One-time bootstrap: copy .env files, install deps, start infra, migrate & seed
	@server_env_created=0; web_env_created=0; \
	if [ ! -f apps/server/.env ]; then cp apps/server/.env.example apps/server/.env; server_env_created=1; fi; \
	if [ ! -f apps/web/.env ]; then cp apps/web/.env.example apps/web/.env; web_env_created=1; fi; \
	if [ "$$server_env_created" = "1" ]; then \
	  if command -v openssl >/dev/null 2>&1; then \
	    key=$$(openssl rand -base64 32); \
	    if [ -z "$$key" ]; then \
	      echo "  WARNING: openssl rand returned empty — leaving REAL_DEMO_ENCRYPTION_KEY placeholder; server will refuse to boot until you fix it."; \
	    else \
	      esc=$$(printf '%s' "$$key" | sed -e 's/[\/&|]/\\&/g'); \
	      sed -i.bak "s|^REAL_DEMO_ENCRYPTION_KEY=.*|REAL_DEMO_ENCRYPTION_KEY=$$esc|" apps/server/.env && rm -f apps/server/.env.bak; \
	      echo "  Generated a fresh REAL_DEMO_ENCRYPTION_KEY into apps/server/.env."; \
	      echo "  WARNING: back up this key. Losing it makes every encrypted provider API key unrecoverable."; \
	    fi; \
	  else \
	    echo "  WARNING: openssl not found; REAL_DEMO_ENCRYPTION_KEY left as the placeholder. The server will refuse to boot."; \
	    echo "          Install openssl, or set the value manually: REAL_DEMO_ENCRYPTION_KEY=\$$(openssl rand -base64 32)"; \
	  fi; \
	fi; \
	if [ "$$server_env_created" = "1" ] || [ "$$web_env_created" = "1" ]; then \
	  echo ""; \
	  echo "  Created fresh .env file(s) from .env.example."; \
	  echo "  Defaults assume the bundled Docker stack (localhost:13306 / localhost:16379)."; \
	  echo "  To use a remote MySQL/Redis instead, edit:"; \
	  [ "$$server_env_created" = "1" ] && echo "    apps/server/.env  (DATABASE_URL, REDIS_URL)"; \
	  [ "$$web_env_created" = "1" ]    && echo "    apps/web/.env"; \
	  echo "  Local infra is auto-skipped when DATABASE_URL/REDIS_URL point to a remote host."; \
	  if [ -t 0 ]; then \
	    echo ""; \
	    read -r -p "  Press Enter to continue, or Ctrl+C to stop and edit first... " _; \
	  else \
	    echo "  (non-interactive shell -- continuing without pause)"; \
	  fi; \
	fi
	corepack enable
	./scripts/infra-up.sh
	pnpm install
	pnpm generate-sdk
	pnpm build:packages
	pnpm db:migrate
	pnpm db:seed

infra-up: ## Start MySQL and Redis
	./scripts/infra-up.sh

infra-down: ## Stop MySQL and Redis
	./scripts/infra-down.sh

openapi: ## Export the server OpenAPI document
	pnpm openapi

generate: generate-sdk ## Backward-compatible alias for SDK generation

generate-sdk: ## Regenerate the SDK from OpenAPI
	pnpm generate-sdk

dev: ## Start the full stack in development mode (assumes 'make setup' has run)
	@if [ ! -f apps/server/.env ] || [ ! -f apps/web/.env ]; then \
	  echo "Missing .env file. Run 'make setup' first to bootstrap local development."; \
	  exit 1; \
	fi
	pnpm db:migrate
	pnpm dev

dev-web: ## Start only the frontend dev server
	pnpm dev:web

dev-server: ## Start only the backend dev server
	pnpm db:migrate
	pnpm dev:server

build: ## Build all packages and apps
	pnpm build

lint: ## Run ESLint across the monorepo
	pnpm lint

typecheck: ## Run TypeScript checks across the monorepo
	pnpm typecheck

test: ## Run the automated test suite
	pnpm test

knip: ## Check for unused files, exports, and dependencies
	pnpm knip

check: ## Run the full local verification chain
	pnpm check

outdated: ## List outdated dependencies across the workspace
	@pnpm outdated -r; status=$$?; \
	if [ $$status -eq 1 ]; then \
		exit 0; \
	fi; \
	exit $$status

upgrade: ## Safely upgrade all dependencies within current semver ranges (patch + minor)
	pnpm update -r
	@# Rehydrate workspace manifests so a follow-up `make outdated` doesn't trip
	@# pnpm/pnpm#2313 ("Cannot read properties of undefined (reading 'optionalDependencies')").
	pnpm install

db-migrate: ## Apply committed database migrations for local development
	pnpm db:migrate

db-seed: ## Seed the local database
	pnpm db:seed

db-reset: ## Reset and reseed the local database
	pnpm db:reset

db-studio: ## Launch Prisma Studio
	pnpm db:studio

clean: ## Remove generated build artifacts
	pnpm clean

docker-build: ## Build the production Docker image
	pnpm docker-build

docker-run: ## Run the production Docker image locally
	pnpm docker-run
