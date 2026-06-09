# Docker setup

This setup keeps the existing BFF architecture:

```text
browser -> Next.js frontend -> Laravel API
```

The `frontend` service publishes `3000:3000`, and the local `backend` service publishes `8000:8000` for direct Laravel debugging. PostgreSQL, Redis, queue workers, scheduler, and Reverb stay on the internal Compose network.

## Services

- `frontend`: Next.js production server on `0.0.0.0:3000`.
- `backend`: Laravel API on the internal Docker DNS name `backend:8000` and on the host at `http://localhost:8000`.
- `queue`: Laravel queue worker using Redis.
- `scheduler`: Laravel scheduler loop.
- `reverb`: Laravel Reverb server on the internal Docker DNS name `reverb:8080`.
- `postgres`: PostgreSQL, internal only.
- `redis`: Redis, internal only.

## URLs and ports

- Public host port: `http://localhost:3000` -> `frontend:3000`.
- Local Laravel debug port: `http://localhost:8000` -> `backend:8000`.
- Internal Laravel API URL for Next.js BFF: `LARAVEL_API_URL=http://backend:8000/api`.
- PostgreSQL, Redis, queue, scheduler, and Reverb do not publish host ports in the local Compose file.

## Environment files

Example files are provided at:

- `frontend/.env.docker.example`
- `backend/.env.docker.example`

Before using this outside a local throwaway environment, inject real secrets through your deployment secret manager or Compose overrides. Do not commit real secrets.

Required secrets/values to set for a functional app:

- `backend`: `APP_KEY`
- `backend`: `JWT_SECRET`
- `backend`: OAuth provider secrets, if OAuth is enabled
- `backend`: `OPENROUTER_API_KEY` or other AI provider key, if AI/RAG is enabled
- `frontend`: public site URL for the deployment origin

Generate a JWT secret without writing it to the repository:

```bash
docker compose exec backend php artisan jwt:secret --show
```

Run migrations explicitly; they are not executed automatically on container startup:

```bash
docker compose exec backend php artisan migrate
```

## Commands

```bash
docker compose up --build
docker compose down
docker compose exec backend php artisan migrate
docker compose exec backend php artisan test
docker compose exec frontend npm run typecheck
docker compose exec frontend npm run lint
```

Equivalent Make targets are available:

```bash
make docker-up
make docker-down
make docker-migrate
make docker-test
make frontend-typecheck
make frontend-lint
```

## Reverb and browser websockets

The Compose file intentionally does **not** publish Reverb directly. If browser websocket access is required, route websocket traffic through the same public reverse proxy/origin that serves Next.js, and proxy only the required websocket path to `reverb:8080`. Avoid publishing Reverb as a separate public host port unless you have explicit origin, TLS, and authentication controls.

## Code playground / Docker runner risk

The Laravel code playground currently expects a Docker-based runner in application code. This Compose setup does **not** mount `/var/run/docker.sock` into the backend or queue containers by default because that effectively grants root-level host control to the container.

For production, use a separate isolated runner architecture, for example:

- a dedicated worker pool with strict resource limits;
- no shared Docker socket in the web/API containers;
- per-user rate limits and quotas;
- network isolation and read-only filesystems;
- monitoring and job timeouts.

Until that isolated runner is added, playground execution jobs may need a separate, explicitly reviewed runner deployment.

## Demo media seeding

The demo media seeder is intentionally **manual** and is not called from `DatabaseSeeder`, so it will not run in production unless you explicitly execute it.

Place avatar and preview files in Laravel's seed-assets directory. The seeder searches by basename and accepts `.jpg`, `.jpeg`, `.png`, and `.webp`, so the exact extension can vary:

```text
database/seed-assets/
  avatars/
    avatar (1).jpg
    avatar (2).jpg
    ...
    avatar (8).jpg
  photos/
    prew (1).jpg
    prew (2).png
    ...
    prew (9).jpg
```

A flat layout also works; the seeder searches `database/seed-assets` recursively, so files may be directly in `seed-assets/` or grouped under folders such as `avatars/` and `photos/`.

For Docker, keep the assets on the host next to `docker-compose.yml` / `docker-compose.prod.yml`. The Compose files mount that host directory into the Laravel container path that the seeder reads:

```text
/root/Diplom2/seed-assets -> /var/www/html/database/seed-assets:ro
```

Do **not** move the folder to `/root/Diplom2/backend/database/seed-assets` when running through Docker Compose: that path is inside the source tree on the host, but the backend container reads the bind mount from `./seed-assets`. If you already moved it there, copy the files back to the Compose-level folder:

```bash
cd /root/Diplom2
mkdir -p seed-assets
cp -a backend/database/seed-assets/. seed-assets/
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend sh -lc 'find database/seed-assets -maxdepth 2 -type f | sort | head'
```

Do not commit real image assets to the repository. Copy them to `./seed-assets` on the host/VPS before running the seeder.

The seeder creates or updates these test accounts:

| Role | Email | Password |
| --- | --- | --- |
| user | `Piskunova@gmail.com` | `Parol2345!` |
| admin | `AdminPisk@gmail.com` | `Parol2345!` |
| moderator | `ModeratorPisk@gmail.com` | `Parol2345!` |

It stores avatars in the existing `users.avatar` field and uses publication `cover_image_path`, image blocks, `user_files`, and `content_attachments` for demo preview photos. If `database/seed-assets` or individual files are missing inside the container, the seeder prints a warning, still creates/updates the users, and skips unavailable media. Because the search is recursive, the current VPS layout `seed-assets/avatars/avatar (1).jpg` and `seed-assets/photos/prew (1).jpg` is valid.

Local run from the repository root:

```bash
cd backend
php artisan storage:link
php artisan db:seed --class=DemoUsersAndMediaSeeder --force
```

VPS run with the production Compose file:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend php artisan storage:link
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend php artisan db:seed --class=DemoUsersAndMediaSeeder --force
```

The seeder is idempotent: repeat runs update the same three users and stable demo publication slugs, overwrite only files under `demo-media/` in the public storage disk, and remove/recreate only its own demo media attachments for those demo publications.

### Public storage URLs in production

Seeder media URLs look like `/storage/demo-media/...` (or an absolute URL based on `APP_URL`) because Laravel's public disk exposes files through the `public/storage` symlink. In production, the reverse proxy forwards `/storage/*` to the backend container so Next.js does not return a 404 for avatars and publication previews.

After pulling changes that affect `deploy/nginx/default.conf.template` or `backend/docker/entrypoint.sh`, recreate the affected containers so the proxy rule and storage symlink are active:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build backend reverse-proxy
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend php artisan storage:link
```
