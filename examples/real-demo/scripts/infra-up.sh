#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/apps/server/.env"

# Extract the host portion of a URL value defined in the server .env file.
# Returns empty string if the file or key is missing.
env_url_host() {
  local key="$1"
  [ -f "${ENV_FILE}" ] || return 0

  local line
  line="$(grep -E "^${key}=" "${ENV_FILE}" | tail -n 1 || true)"
  [ -n "${line}" ] || return 0

  local value="${line#*=}"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"

  # Strip scheme
  local rest="${value#*://}"
  # Strip credentials if present
  rest="${rest##*@}"
  # Strip path / query
  rest="${rest%%/*}"
  rest="${rest%%\?*}"
  # Strip port
  local host="${rest%%:*}"
  # Strip IPv6 brackets
  host="${host#[}"
  host="${host%]}"

  printf '%s' "${host}"
}

host_is_local() {
  local host="$1"
  [ -z "${host}" ] && return 0
  case "${host}" in
    localhost|127.0.0.1|0.0.0.0|::1) return 0 ;;
    *) return 1 ;;
  esac
}

DB_HOST="$(env_url_host DATABASE_URL)"
REDIS_HOST="$(env_url_host REDIS_URL)"

if ! host_is_local "${DB_HOST}" || ! host_is_local "${REDIS_HOST}"; then
  echo "Skipping local infra: apps/server/.env points to remote services"
  [ -n "${DB_HOST}" ]    && echo "  DATABASE_URL host: ${DB_HOST}"
  [ -n "${REDIS_HOST}" ] && echo "  REDIS_URL    host: ${REDIS_HOST}"
  echo "  (set both to localhost to use the bundled Docker stack)"
  exit 0
fi

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
