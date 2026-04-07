SHELL := /bin/bash

.DEFAULT_GOAL := help

.PHONY: help setup infra-up infra-down dev dev-web dev-server build lint typecheck test knip check openapi generate generate-sdk db-migrate db-seed db-reset db-studio db\:migrate db\:seed db\:reset db\:studio clean docker-build docker-run

help: ## Show available commands
	@awk 'BEGIN {FS = " ## "; printf "\nTargets:\n"} /^[a-zA-Z0-9_:\\.-]+:.*## / { target = $$1; gsub(/\\/, "", target); sub(/:[^:]*$$/, "", target); printf "  %-18s %s\n", target, $$2 }' $(MAKEFILE_LIST)

setup: ## Install dependencies and bootstrap local development
	@if [ ! -f apps/server/.env ]; then cp apps/server/.env.example apps/server/.env; fi
	@if [ ! -f apps/web/.env ]; then cp apps/web/.env.example apps/web/.env; fi
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

dev: ## Start the full stack in development mode
	@if [ ! -f apps/server/.env ]; then cp apps/server/.env.example apps/server/.env; fi
	@if [ ! -f apps/web/.env ]; then cp apps/web/.env.example apps/web/.env; fi
	./scripts/infra-up.sh
	pnpm generate-sdk
	pnpm build:packages
	pnpm db:migrate
	pnpm dev

dev-web: ## Start only the frontend dev server
	pnpm dev:web

dev-server: ## Start only the backend dev server
	./scripts/infra-up.sh
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

db-migrate: ## Apply committed database migrations for local development
	pnpm db:migrate

db-seed: ## Seed the local database
	pnpm db:seed

db-reset: ## Reset and reseed the local database
	pnpm db:reset

db-studio: ## Launch Prisma Studio
	pnpm db:studio

db\:migrate:
	pnpm db:migrate

db\:seed:
	pnpm db:seed

db\:reset:
	pnpm db:reset

db\:studio:
	pnpm db:studio

clean: ## Remove generated build artifacts
	pnpm clean

docker-build: ## Build the production Docker image
	pnpm docker-build

docker-run: ## Run the production Docker image locally
	pnpm docker-run
