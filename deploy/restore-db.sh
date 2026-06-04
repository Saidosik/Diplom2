#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ENV_FILE="${ROOT_DIR}/.env.production"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
YES=false
BACKUP=""

for arg in "$@"; do
  case "$arg" in
    --yes) YES=true ;;
    *) BACKUP="$arg" ;;
  esac
done

if [ -z "$BACKUP" ]; then
  echo "Usage: $0 backups/FILE.sql.gz [--yes]" >&2
  exit 2
fi

if [ ! -f "$BACKUP" ]; then
  echo "Backup not found: $BACKUP" >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing .env.production." >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

: "${POSTGRES_DB:=vector}"
: "${POSTGRES_USER:=vector}"

if [ "$YES" != true ]; then
  echo "WARNING: this will drop and recreate database '${POSTGRES_DB}'."
  printf "Type 'restore %s' to continue: " "$POSTGRES_DB"
  read answer
  if [ "$answer" != "restore ${POSTGRES_DB}" ]; then
    echo "Restore cancelled."
    exit 1
  fi
fi

cd "$ROOT_DIR"

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  dropdb --if-exists -U "$POSTGRES_USER" "$POSTGRES_DB"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  createdb -U "$POSTGRES_USER" "$POSTGRES_DB"
gunzip -c "$BACKUP" | docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "Database restored from ${BACKUP}."
