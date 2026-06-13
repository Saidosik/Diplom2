#!/usr/bin/env sh
set -eu

COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.prod.yml}
ENV_FILE=${ENV_FILE:-.env.production}
SITE_DOMAIN=${SITE_DOMAIN:-said-diplom.ru}
SITE_URL=${SITE_URL:-https://said-diplom.ru}

printf 'Validating production compose for %s...\n' "$SITE_URL"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" config >/dev/null

printf 'Checking required host SSL files...\n'
for file in \
  /etc/ssl/said-diplom/certificate.crt \
  /etc/ssl/said-diplom/certificate.key \
  /etc/ssl/said-diplom/certificate_ca.crt
 do
  [ -f "$file" ] || { echo "Missing $file" >&2; exit 1; }
done

printf 'Checking HTTPS endpoint...\n'
curl -fsSI "$SITE_URL" >/dev/null
printf 'Production check passed for %s.\n' "$SITE_URL"
