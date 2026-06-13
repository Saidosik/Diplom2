# Production deployment for said-diplom.ru

Production is domain-based. Public traffic must use:

```text
browser -> https://said-diplom.ru -> Nginx reverse-proxy -> Next.js frontend -> Laravel internal API
```

Authentication remains JWT-based through the existing Next.js BFF routes. Do not migrate to Sanctum and do not expose Laravel directly as a public API.

## DNS

Create DNS records before deployment:

- `said-diplom.ru` A-record points to the server IP.
- `www.said-diplom.ru` A-record or CNAME points to the same server/domain.

The server IP is only an infrastructure target for DNS. It is not used as the public site URL.

## Required SSL files

Production Nginx uses existing host certificate files, not Certbot and not `/etc/letsencrypt` paths:

```bash
sudo ls -la /etc/ssl/said-diplom/
sudo openssl x509 -in /etc/ssl/said-diplom/certificate.crt -noout -subject -issuer -dates
```

Required files:

- `/etc/ssl/said-diplom/certificate.crt`
- `/etc/ssl/said-diplom/certificate.key`
- `/etc/ssl/said-diplom/certificate_ca.crt`

## Environment files

Copy the examples and fill secrets:

```bash
cp .env.production.example .env.production
cp backend/.env.production.example backend/.env.production
cp frontend/.env.production.example frontend/.env.production
```

Production URL values should remain domain-based:

```dotenv
SITE_DOMAIN=said-diplom.ru
SITE_URL=https://said-diplom.ru
APP_NAME="Вектор"
APP_URL=https://said-diplom.ru
FRONTEND_URL=https://said-diplom.ru
EMAIL_VERIFICATION_EXPIRE_MINUTES=10
GOOGLE_REDIRECT_URI=https://said-diplom.ru/api/auth/oauth/google/callback
YANDEX_REDIRECT_URI=https://said-diplom.ru/api/auth/oauth/yandex/callback
GITHUB_REDIRECT_URI=https://said-diplom.ru/api/auth/oauth/github/callback
REVERB_ALLOWED_ORIGINS=https://said-diplom.ru,https://www.said-diplom.ru
NEXT_PUBLIC_REVERB_HOST=said-diplom.ru
NEXT_PUBLIC_REVERB_PORT=443
NEXT_PUBLIC_REVERB_FORCE_TLS=true
```


### GitHub OAuth

In GitHub Developer Settings, create an OAuth App for production:

- Homepage URL: `https://said-diplom.ru`
- Authorization callback URL: `https://said-diplom.ru/api/auth/oauth/github/callback`

Set these backend environment variables in production:

```dotenv
GITHUB_CLIENT_ID=CHANGE_ME
GITHUB_CLIENT_SECRET=CHANGE_ME
GITHUB_REDIRECT_URI=https://said-diplom.ru/api/auth/oauth/github/callback
```

GitHub sign-in uses the same JWT OAuth flow as Google and Yandex. Next.js stores the returned JWT only in the httpOnly `access_token` cookie.

Keep internal Docker URLs internal. `backend:8000` is only the private Docker service URL for server-to-server calls and must never appear in browser-facing pages or emails:

```dotenv
LARAVEL_API_URL=http://backend:8000/api
DB_HOST=postgres
REDIS_HOST=redis
REVERB_HOST=reverb
REVERB_PORT=8080
REVERB_SCHEME=http
```

## Deploy

Validate and start production:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production config
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Run Laravel one-time setup commands as needed:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend php artisan migrate --force
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend php artisan storage:link
```

## Redirect checks

Run:

```bash
curl -I http://said-diplom.ru
curl -I https://said-diplom.ru
curl -I http://SERVER_IP
curl -I http://www.said-diplom.ru
curl -Ik https://www.said-diplom.ru
```

Expected redirects:

- `http://said-diplom.ru` -> `301 https://said-diplom.ru`
- `http://www.said-diplom.ru` -> `301 https://said-diplom.ru`
- `http://SERVER_IP` -> `301 https://said-diplom.ru`
- `https://www.said-diplom.ru` -> `301 https://said-diplom.ru`
- Any non-domain Host accepted by Nginx redirects to `https://said-diplom.ru$request_uri` when possible.

For `https://SERVER_IP`, browsers can show a certificate warning before redirect because the certificate is issued for `said-diplom.ru`, not the IP. This is normal unless the certificate also covers the IP.

## Obsolete IP/Certbot flow

Old instructions that replaced a placeholder IP or issued IP certificates with Certbot are obsolete. Do not set public URLs to a server IP, do not use `VPS_PUBLIC_` + `IP` as the site URL, and do not use `/etc/letsencrypt` paths in production Nginx.

## Network exposure

Only Nginx publishes host ports `80` and `443`. Backend `8000`, PostgreSQL, Redis, and Reverb `8080` remain internal Docker services. Reverb websocket traffic is proxied through Nginx on `https://said-diplom.ru/app/` and `https://said-diplom.ru/apps/`.
