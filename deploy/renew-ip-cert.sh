#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ENV_FILE="${ROOT_DIR}/.env.production"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing .env.production." >&2
  exit 1
fi

cd "$ROOT_DIR"

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm --entrypoint certbot certbot renew \
  --webroot \
  --webroot-path /var/www/certbot \
  --quiet

if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q reverse-proxy >/dev/null 2>&1; then
  if [ -n "$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q reverse-proxy)" ]; then
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T reverse-proxy nginx -s reload
  fi
fi
