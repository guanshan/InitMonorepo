#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if docker compose version >/dev/null 2>&1; then
  docker compose -f "${ROOT_DIR}/docker-compose.yml" down
  exit 0
fi

if command -v docker-compose >/dev/null 2>&1; then
  docker-compose -f "${ROOT_DIR}/docker-compose.yml" down
  exit 0
fi

docker rm -f real-demo-mysql real-demo-redis >/dev/null 2>&1 || true
