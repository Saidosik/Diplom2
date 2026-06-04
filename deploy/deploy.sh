#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ENV_FILE="${ROOT_DIR}/.env.production"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
RUN_MIGRATIONS=false

for arg in "$@"; do
  case "$arg" in
    --migrate) RUN_MIGRATIONS=true ;;
    *) echo "Usage: $0 [--migrate]" >&2; exit 2 ;;
  esac
done

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing .env.production. Copy .env.production.example and fill it first." >&2
  exit 1
fi

cd "$ROOT_DIR"

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

if [ "$RUN_MIGRATIONS" = true ]; then
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec backend php artisan migrate --force
else
  echo "Migrations were not run. Use: $0 --migrate"
fi
