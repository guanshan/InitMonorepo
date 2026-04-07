#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

wait_for_mysql() {
  local attempts=60

  until docker exec real-demo-mysql mysql -h 127.0.0.1 -uapp -papp -e "SELECT 1" real_demo >/dev/null 2>&1; do
    if ! docker ps --format '{{.Names}}' | grep -qx real-demo-mysql; then
      echo "real-demo-mysql is not running" >&2
      docker logs real-demo-mysql --tail 50 >&2 || true
      return 1
    fi

    attempts=$((attempts - 1))
    if [ "${attempts}" -le 0 ]; then
      echo "Timed out waiting for real-demo-mysql to accept connections" >&2
      docker logs real-demo-mysql --tail 50 >&2 || true
      return 1
    fi

    sleep 1
  done
}

wait_for_redis() {
  local attempts=30

  until docker exec real-demo-redis redis-cli ping >/dev/null 2>&1; do
    if ! docker ps --format '{{.Names}}' | grep -qx real-demo-redis; then
      echo "real-demo-redis is not running" >&2
      docker logs real-demo-redis --tail 50 >&2 || true
      return 1
    fi

    attempts=$((attempts - 1))
    if [ "${attempts}" -le 0 ]; then
      echo "Timed out waiting for real-demo-redis to accept connections" >&2
      docker logs real-demo-redis --tail 50 >&2 || true
      return 1
    fi

    sleep 1
  done
}

if docker compose version >/dev/null 2>&1; then
  docker compose -f "${ROOT_DIR}/docker-compose.yml" up -d mysql redis
elif command -v docker-compose >/dev/null 2>&1; then
  docker-compose -f "${ROOT_DIR}/docker-compose.yml" up -d mysql redis
else
  ensure_container() {
    local name="$1"
    shift

    if docker ps --format '{{.Names}}' | grep -qx "${name}"; then
      return
    fi

    if docker ps -a --format '{{.Names}}' | grep -qx "${name}"; then
      docker start "${name}" >/dev/null
      return
    fi

    docker run -d --name "${name}" "$@" >/dev/null
  }

  ensure_container \
    real-demo-mysql \
    -e MYSQL_DATABASE=real_demo \
    -e MYSQL_ROOT_PASSWORD=root \
    -e MYSQL_USER=app \
    -e MYSQL_PASSWORD=app \
    -p 13306:3306 \
    mysql:8.4

  ensure_container \
    real-demo-redis \
    -p 16379:6379 \
    redis:7.4
fi

if docker ps --format '{{.Names}}' | grep -qx real-demo-mysql; then
  wait_for_mysql
fi

if docker ps --format '{{.Names}}' | grep -qx real-demo-redis; then
  wait_for_redis
fi
