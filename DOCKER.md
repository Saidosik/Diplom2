# Docker notes

## Production domain

Production is configured for product `Вектор` at `https://said-diplom.ru`. Set `APP_NAME="Вектор"`, `APP_URL=https://said-diplom.ru`, `FRONTEND_URL=https://said-diplom.ru`, and `EMAIL_VERIFICATION_EXPIRE_MINUTES=10`. The reverse proxy publishes only `80:80` and `443:443`; backend, PostgreSQL, Redis, and Reverb are not exposed directly.

Public flow:

```text
Browser -> Nginx https://said-diplom.ru -> Next.js frontend -> Laravel via http://backend:8000/api
Verification links use https://said-diplom.ru/api/email/verify/... and only that narrow path is proxied directly to Laravel so signed query strings stay intact.
```

`LARAVEL_API_URL` must stay `http://backend:8000/api` because the frontend uses BFF routes. This internal Docker URL must never appear in verification emails; emails must use `https://said-diplom.ru`. Browser requests to `/api/*` go to Next.js, not directly to Laravel.


## GitHub OAuth

For production, create a GitHub OAuth App in GitHub Developer Settings:

- Homepage URL: `https://said-diplom.ru`
- Authorization callback URL: `https://said-diplom.ru/api/auth/oauth/github/callback`

Configure Laravel with:

```dotenv
GITHUB_CLIENT_ID=CHANGE_ME
GITHUB_CLIENT_SECRET=CHANGE_ME
GITHUB_REDIRECT_URI=https://said-diplom.ru/api/auth/oauth/github/callback
```

The frontend keeps using BFF routes (`/api/auth/oauth/github/redirect` and `/api/auth/oauth/github/callback`), so `LARAVEL_API_URL` remains the internal Docker URL and JWTs are stored only in the httpOnly `access_token` cookie.

## SSL certificates

Nginx mounts existing host certificates:

- `/etc/ssl/said-diplom/certificate.crt`
- `/etc/ssl/said-diplom/certificate.key`
- `/etc/ssl/said-diplom/certificate_ca.crt`

Verify them on the server:

```bash
sudo ls -la /etc/ssl/said-diplom/
sudo openssl x509 -in /etc/ssl/said-diplom/certificate.crt -noout -subject -issuer -dates
```

Certbot and `/etc/letsencrypt` are not used by the production compose file.

## Commands

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production config
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
curl -I http://said-diplom.ru
curl -I https://said-diplom.ru
curl -I http://SERVER_IP
```

Expected redirects:

- `http://said-diplom.ru` -> `301 https://said-diplom.ru`
- `http://SERVER_IP` -> `301 https://said-diplom.ru`
- `https://www.said-diplom.ru` -> `301 https://said-diplom.ru`

Seeder media URLs look like `/storage/demo-media/...` (or an absolute URL based on `APP_URL`) because Laravel's public disk exposes files through the `public/storage` symlink. In production, the reverse proxy forwards `/storage/*` to the backend container so Next.js does not return a 404 for avatars and publication previews.

## Debug mode with public Laravel Telescope

> Warning: debug mode sets `APP_ENV=local`, `APP_DEBUG=true`, and exposes Laravel Telescope publicly at `https://said-diplom.ru/telescope`. Use it only for short учебные отладочные сессии and always return the server to production mode afterwards.

### Enable debug/Telescope

Run from the repository root on the server:

```bash
bash scripts/debug-up.sh
```

The script first calls `scripts/make-debug-env.sh`. It copies the current production env files to debug env files without asking you to refill secrets manually:

- `.env.production` -> `.env.dev`
- `backend/.env.production` -> `backend/.env.dev`
- `frontend/.env.production` -> `frontend/.env.dev`

Only debug-related values are changed or added: `APP_ENV=local`, `APP_DEBUG=true`, `LOG_LEVEL=debug`, `TELESCOPE_ENABLED=true`, `TELESCOPE_PATH=telescope`, `LARAVEL_OPTIMIZE=false`, and `SESSION_SECURE_COOKIE=true`. The frontend keeps `NODE_ENV=production`, so the production Next.js runtime is preserved.

`docker-compose.debug.yml` is applied on top of `docker-compose.prod.yml`. In this mode the Laravel images are rebuilt without `--no-dev`, so Composer installs `require-dev` packages and `laravel/telescope` is available. The reverse proxy also switches to `deploy/nginx/default.debug.conf.template`, which proxies `/telescope`, `/telescope/*`, and `/vendor/telescope/*` to `http://backend:8000`.

After containers start, the script installs/publishes Telescope assets if needed, runs migrations, recreates `public/storage -> ../storage/app/public` as root to avoid `symlink(): Permission denied`, clears Laravel caches, and restarts the app services.

Open Telescope here:

```text
https://said-diplom.ru/telescope
```

Useful checks:

```bash
bash -n scripts/make-debug-env.sh
bash -n scripts/debug-up.sh
bash -n scripts/prod-up.sh
docker compose -f docker-compose.prod.yml -f docker-compose.debug.yml --env-file .env.dev config
docker compose -f docker-compose.prod.yml -f docker-compose.debug.yml --env-file .env.dev exec backend php artisan route:list | grep telescope
```

### Return to production

Run from the repository root:

```bash
bash scripts/prod-up.sh
```

This starts `docker-compose.prod.yml` without the debug override, uses `.env.production`, clears Laravel optimization caches, and restarts `backend`, `queue`, `scheduler`, `reverb`, `reverse-proxy`, and `frontend`.
