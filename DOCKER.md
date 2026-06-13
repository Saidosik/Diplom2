# Docker notes

## Production domain

Production is configured for `https://said-diplom.ru`. The reverse proxy publishes only `80:80` and `443:443`; backend, PostgreSQL, Redis, and Reverb are not exposed directly.

Public flow:

```text
Browser -> Nginx https://said-diplom.ru -> Next.js frontend -> Laravel via http://backend:8000/api
```

`LARAVEL_API_URL` must stay `http://backend:8000/api` because the frontend uses BFF routes. Browser requests to `/api/*` go to Next.js, not directly to Laravel.

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
