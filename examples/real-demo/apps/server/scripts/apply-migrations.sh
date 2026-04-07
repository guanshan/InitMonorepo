#!/usr/bin/env bash

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCHEMA_PATH="${APP_DIR}/prisma/schema.prisma"
ENV_FILE="${APP_DIR}/.env"

if [ -f "${ENV_FILE}" ] && [ -z "${DATABASE_URL:-}" ]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Copy apps/server/.env.example to apps/server/.env first." >&2
  exit 1
fi

run_prisma() {
  (
    cd "${APP_DIR}"
    pnpm exec prisma "$@"
  )
}

DEPLOY_LOG="$(mktemp)"

if run_prisma migrate deploy --schema "${SCHEMA_PATH}" >"${DEPLOY_LOG}" 2>&1; then
  cat "${DEPLOY_LOG}"
  rm -f "${DEPLOY_LOG}"
  exit 0
fi

DEPLOY_STATUS=$?
DEPLOY_OUTPUT="$(cat "${DEPLOY_LOG}")"
rm -f "${DEPLOY_LOG}"

if ! printf '%s' "${DEPLOY_OUTPUT}" | grep -q "Error: P3005"; then
  printf '%s\n' "${DEPLOY_OUTPUT}" >&2
  exit "${DEPLOY_STATUS}"
fi

DIFF_LOG="$(mktemp)"
set +e
run_prisma migrate diff --from-url "${DATABASE_URL}" --to-schema-datamodel "${SCHEMA_PATH}" --exit-code >"${DIFF_LOG}" 2>&1
DIFF_STATUS=$?
set -e

if [ "${DIFF_STATUS}" -ne 0 ]; then
  DIFF_OUTPUT="$(cat "${DIFF_LOG}")"
  rm -f "${DIFF_LOG}"
  printf '%s\n' "${DEPLOY_OUTPUT}" >&2
  echo >&2
  echo "The existing database could not be auto-baselined because it does not match prisma/schema.prisma." >&2
  printf '%s\n' "${DIFF_OUTPUT}" >&2
  exit "${DEPLOY_STATUS}"
fi

rm -f "${DIFF_LOG}"

mapfile -t MIGRATIONS < <(find "${APP_DIR}/prisma/migrations" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort)

if [ "${#MIGRATIONS[@]}" -eq 0 ]; then
  printf '%s\n' "${DEPLOY_OUTPUT}" >&2
  echo >&2
  echo "No committed migrations were found to baseline." >&2
  exit "${DEPLOY_STATUS}"
fi

echo "Existing database already matches prisma/schema.prisma but is missing Prisma migration history."
echo "Baselining committed migrations so local development can continue without resetting the database."

for migration in "${MIGRATIONS[@]}"; do
  run_prisma migrate resolve --applied "${migration}" --schema "${SCHEMA_PATH}"
done

run_prisma migrate deploy --schema "${SCHEMA_PATH}"
