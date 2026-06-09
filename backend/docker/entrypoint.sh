#!/bin/sh
set -e

mkdir -p \
  storage/framework/cache \
  storage/framework/sessions \
  storage/framework/views \
  storage/logs \
  storage/app/public \
  bootstrap/cache

if [ ! -e public/storage ]; then
  php artisan storage:link --no-interaction || true
fi

# Do not run migrations automatically. Use:
# docker compose exec backend php artisan migrate
if [ "${LARAVEL_OPTIMIZE:-false}" = "true" ]; then
  php artisan config:cache --no-interaction
  php artisan route:cache --no-interaction
  php artisan view:cache --no-interaction
fi

exec "$@"
