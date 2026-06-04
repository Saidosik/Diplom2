#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ENV_FILE="${ROOT_DIR}/.env.production"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
BACKUP_DIR="${ROOT_DIR}/backups"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing .env.production." >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

: "${POSTGRES_DB:=vector}"
: "${POSTGRES_USER:=vector}"

mkdir -p "$BACKUP_DIR"
file="${BACKUP_DIR}/vector-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"

cd "$ROOT_DIR"

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip -9 > "$file"

chmod 600 "$file"
echo "Database backup written to ${file}"
