#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE=(docker compose -f docker-compose.prod.yml -f docker-compose.debug.yml --env-file .env.dev)

bash scripts/make-debug-env.sh

"${COMPOSE[@]}" up -d --build

"${COMPOSE[@]}" exec backend php artisan telescope:install || true
"${COMPOSE[@]}" exec backend php artisan migrate --force
"${COMPOSE[@]}" exec -u root backend sh -lc 'mkdir -p storage/app/public public && rm -rf public/storage && ln -s ../storage/app/public public/storage && chown -h laravel:laravel public/storage && chown -R laravel:laravel storage bootstrap/cache'
"${COMPOSE[@]}" exec backend php artisan optimize:clear

"${COMPOSE[@]}" restart backend queue scheduler reverb reverse-proxy frontend

echo "Telescope: https://said-diplom.ru/telescope"
