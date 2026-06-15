#!/bin/sh
set -e

mkdir -p \
  storage/framework/cache \
  storage/framework/sessions \
  storage/framework/views \
  storage/logs \
  storage/app/public \
  bootstrap/cache

ensure_storage_link() {
  link_path="public/storage"
  link_target="../storage/app/public"

  if [ -L "$link_path" ]; then
    current_target="$(readlink "$link_path" || true)"
    if [ "$current_target" = "$link_target" ]; then
      return 0
    fi

    echo "Warning: $link_path points to '$current_target' instead of '$link_target'; leaving it unchanged." >&2
    return 0
  fi

  if [ -e "$link_path" ]; then
    echo "Warning: $link_path exists and is not a symlink; leaving it unchanged." >&2
    return 0
  fi

  if ln -s "$link_target" "$link_path" 2>/dev/null; then
    return 0
  fi

  echo "Warning: unable to create $link_path -> $link_target; continuing without failing container startup." >&2
}

ensure_storage_link

# Do not run migrations automatically. Use:
# docker compose exec backend php artisan migrate
if [ "${LARAVEL_OPTIMIZE:-false}" = "true" ]; then
  php artisan config:cache --no-interaction
  php artisan route:cache --no-interaction
  php artisan view:cache --no-interaction
fi

exec "$@"
