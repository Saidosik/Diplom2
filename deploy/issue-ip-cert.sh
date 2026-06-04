#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ENV_FILE="${ROOT_DIR}/.env.production"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
MODE="staging"

for arg in "$@"; do
  case "$arg" in
    --production) MODE="production" ;;
    --staging) MODE="staging" ;;
    *) echo "Usage: $0 [--staging|--production]" >&2; exit 2 ;;
  esac
done

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing .env.production. Copy .env.production.example first." >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

: "${COMPOSE_PROJECT_NAME:=vector}"
: "${VPS_PUBLIC_IP:?Set VPS_PUBLIC_IP in .env.production}"
: "${LETSENCRYPT_EMAIL:?Set LETSENCRYPT_EMAIL in .env.production}"

CERTBOT_FLAGS=""
if [ "$MODE" = "staging" ]; then
  CERTBOT_FLAGS="--staging"
  echo "Issuing STAGING Let's Encrypt IP certificate for ${VPS_PUBLIC_IP}."
else
  echo "Issuing PRODUCTION Let's Encrypt IP certificate for ${VPS_PUBLIC_IP}."
fi

BOOTSTRAP_NAME="${COMPOSE_PROJECT_NAME}-cert-bootstrap"
WEBROOT_VOLUME="${COMPOSE_PROJECT_NAME}_certbot-webroot"
CERT_VOLUME="${COMPOSE_PROJECT_NAME}_certbot-etc"
LOG_VOLUME="${COMPOSE_PROJECT_NAME}_certbot-logs"

cd "$ROOT_DIR"

docker volume create "$WEBROOT_VOLUME" >/dev/null
docker volume create "$CERT_VOLUME" >/dev/null
docker volume create "$LOG_VOLUME" >/dev/null

docker rm -f "$BOOTSTRAP_NAME" >/dev/null 2>&1 || true

docker run -d --name "$BOOTSTRAP_NAME" \
  -p 80:80 \
  -e "VPS_PUBLIC_IP=${VPS_PUBLIC_IP}" \
  -v "${WEBROOT_VOLUME}:/var/www/certbot" \
  -v "${ROOT_DIR}/deploy/nginx/bootstrap-http.conf.template:/etc/nginx/templates/default.conf.template:ro" \
  nginx:1.27-alpine >/dev/null

cleanup() {
  docker rm -f "$BOOTSTRAP_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

sleep 2

docker run --rm \
  -v "${CERT_VOLUME}:/etc/letsencrypt" \
  -v "${WEBROOT_VOLUME}:/var/www/certbot" \
  -v "${LOG_VOLUME}:/var/log/letsencrypt" \
  certbot/certbot:latest certonly \
    --non-interactive \
    --agree-tos \
    --email "$LETSENCRYPT_EMAIL" \
    --preferred-profile shortlived \
    --webroot \
    --webroot-path /var/www/certbot \
    --ip-address "$VPS_PUBLIC_IP" \
    $CERTBOT_FLAGS

cleanup
trap - EXIT INT TERM

echo "Certificate request finished for ${VPS_PUBLIC_IP}."
echo "Next: docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE} up -d reverse-proxy"
