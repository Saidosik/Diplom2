#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE=(docker compose -f docker-compose.prod.yml --env-file .env.production)

"${COMPOSE[@]}" up -d --build
"${COMPOSE[@]}" exec backend php artisan optimize:clear
"${COMPOSE[@]}" restart backend queue scheduler reverb reverse-proxy frontend

echo "Production mode is running: https://said-diplom.ru"
