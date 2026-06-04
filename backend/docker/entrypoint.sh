#!/bin/sh
set -e

mkdir -p \
  storage/framework/cache \
  storage/framework/sessions \
  storage/framework/views \
  storage/logs \
  bootstrap/cache

# Do not run migrations automatically. Use:
# docker compose exec backend php artisan migrate
if [ "${LARAVEL_OPTIMIZE:-false}" = "true" ]; then
  php artisan config:cache --no-interaction
  php artisan route:cache --no-interaction
  php artisan view:cache --no-interaction
fi

exec "$@"
