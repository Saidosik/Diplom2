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
