#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

copy_env() {
  local src="$1"
  local dst="$2"

  if [[ ! -f "$src" ]]; then
    echo "Error: production env file not found: $src" >&2
    exit 1
  fi

  cp "$src" "$dst"
  echo "Created $dst from $src"
}

set_env_value() {
  local file="$1"
  local key="$2"
  local value="$3"
  local escaped_value

  escaped_value="$(printf '%s' "$value" | sed 's/[&\\]/\\&/g')"

  if grep -qE "^[[:space:]]*${key}=" "$file"; then
    sed -i -E "s|^[[:space:]]*${key}=.*|${key}=${escaped_value}|" "$file"
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$file"
  fi
}

ROOT_PROD_ENV="$ROOT_DIR/.env.production"
ROOT_DEV_ENV="$ROOT_DIR/.env.dev"
BACKEND_PROD_ENV="$ROOT_DIR/backend/.env.production"
BACKEND_DEV_ENV="$ROOT_DIR/backend/.env.dev"
FRONTEND_PROD_ENV="$ROOT_DIR/frontend/.env.production"
FRONTEND_DEV_ENV="$ROOT_DIR/frontend/.env.dev"

copy_env "$ROOT_PROD_ENV" "$ROOT_DEV_ENV"
copy_env "$BACKEND_PROD_ENV" "$BACKEND_DEV_ENV"
copy_env "$FRONTEND_PROD_ENV" "$FRONTEND_DEV_ENV"

for env_file in "$ROOT_DEV_ENV" "$BACKEND_DEV_ENV"; do
  set_env_value "$env_file" APP_ENV local
  set_env_value "$env_file" APP_DEBUG true
  set_env_value "$env_file" LOG_LEVEL debug
  set_env_value "$env_file" TELESCOPE_ENABLED true
  set_env_value "$env_file" TELESCOPE_PATH telescope
  set_env_value "$env_file" LARAVEL_OPTIMIZE false
  set_env_value "$env_file" SESSION_SECURE_COOKIE true
done

set_env_value "$FRONTEND_DEV_ENV" NODE_ENV production

echo "Debug env files are ready. Existing production values were preserved except explicit debug overrides."
