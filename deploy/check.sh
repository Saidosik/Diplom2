#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ENV_FILE="${ROOT_DIR}/.env.production"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing .env.production. For static example validation use .env.production.example manually." >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

: "${VPS_PUBLIC_IP:?Set VPS_PUBLIC_IP in .env.production}"

cd "$ROOT_DIR"

tmp_json=$(mktemp)
trap 'rm -f "$tmp_json"' EXIT

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" config --format json > "$tmp_json"

python3 - "$tmp_json" <<'PY'
import json
import sys

with open(sys.argv[1], 'r', encoding='utf-8') as fh:
    data = json.load(fh)

services = data.get('services', {})
allowed = {'reverse-proxy': {'80', '443'}}
violations = []
for name, service in services.items():
    ports = service.get('ports') or []
    published = {str(port.get('published')) for port in ports if port.get('published') is not None}
    if name in allowed:
        if published != allowed[name]:
            violations.append(f'{name} publishes {sorted(published)} instead of {sorted(allowed[name])}')
    elif published:
        violations.append(f'{name} unexpectedly publishes host ports {sorted(published)}')

if violations:
    print('\n'.join(violations), file=sys.stderr)
    sys.exit(1)

print('Port check passed: only reverse-proxy publishes 80/443.')
PY

cert_path="/etc/letsencrypt/live/${VPS_PUBLIC_IP}/fullchain.pem"
if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q reverse-proxy >/dev/null 2>&1 \
  && [ -n "$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q reverse-proxy)" ]; then
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T reverse-proxy test -f "$cert_path"
  curl -fsS "https://${VPS_PUBLIC_IP}" >/dev/null
  echo "HTTPS check passed for https://${VPS_PUBLIC_IP}."
else
  echo "reverse-proxy is not running; skipped in-container certificate and HTTPS checks."
fi
