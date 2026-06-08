# VPS deploy по прямому IP с HTTPS Let's Encrypt

Этот deployment-профиль предназначен для учебного запуска без домена:

```text
browser -> https://VPS_PUBLIC_IP -> Nginx reverse-proxy -> Next.js frontend -> Laravel API
```

Laravel API, PostgreSQL, Redis, Reverb, queue и scheduler не публикуют host-порты. Next.js обращается к Laravel только внутри Docker network по `LARAVEL_API_URL=http://backend:8000/api`.

## A. Требования

- Ubuntu 22.04/24.04 или аналогичный Linux VPS.
- Docker Engine.
- Docker Compose plugin.
- Firewall ports:
  - `22/tcp` для SSH;
  - `80/tcp` для ACME HTTP-01 challenge и redirect;
  - `443/tcp` для HTTPS.
- Не открывайте backend/db/redis/reverb наружу.

## B. Подготовка сервера

Пример для Ubuntu:

```bash
sudo adduser deploy
sudo usermod -aG sudo deploy
sudo usermod -aG docker deploy

sudo apt-get update
sudo apt-get install -y ca-certificates curl git ufw
# Установите Docker по официальной инструкции Docker для вашей версии Ubuntu.

sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

git clone <YOUR_REPOSITORY_URL> /home/deploy/vector
cd /home/deploy/vector
```

После добавления пользователя в группу `docker` перелогиньтесь.

## C. Настройка env

Скопируйте examples в реальные env-файлы:

```bash
cp .env.production.example .env.production
cp frontend/.env.production.example frontend/.env.production
cp backend/.env.production.example backend/.env.production
```

Замените `YOUR_VPS_IP` на реальный публичный IP VPS во всех трёх файлах:

```bash
sed -i 's/YOUR_VPS_IP/203.0.113.10/g' .env.production frontend/.env.production backend/.env.production
```

Заполните:

- `LETSENCRYPT_EMAIL` в `.env.production`;
- `DB_PASSWORD` / `POSTGRES_PASSWORD` сильным паролем;
- `APP_KEY` в `backend/.env.production`;
- `JWT_SECRET` в `backend/.env.production`;
- OAuth/AI secrets, если эти функции включены.

Сгенерировать Laravel `APP_KEY` можно внутри backend-контейнера после build или локально в доверенном окружении Laravel. JWT secret можно получить командой после запуска backend-контейнера:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend php artisan jwt:secret --show
```

Не коммитьте реальные `.env.production` файлы.

## D. Первый запуск HTTPS по IP

1. Проверить compose config:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production config
   ```

2. Собрать контейнеры:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production build
   ```

3. Выпустить staging certificate для проверки ACME/IP flow:

   ```bash
   ./deploy/issue-ip-cert.sh --staging
   ```

   Скрипт временно запускает HTTP-only Nginx bootstrap на `80/tcp`, отдаёт `/.well-known/acme-challenge/` из shared webroot volume и запускает `certbot certonly` с `--ip-address ${VPS_PUBLIC_IP}`.

4. Если staging успешен, выпустить production certificate:

   ```bash
   ./deploy/issue-ip-cert.sh --production
   ```

5. Запустить весь stack:

   ```bash
   ./deploy/deploy.sh
   ```

6. Выполнить migrations явно:

   ```bash
   ./deploy/deploy.sh --migrate
   ```

7. Открыть:

   ```text
   https://VPS_PUBLIC_IP
   ```

## E. Автообновление сертификата

Let's Encrypt IP certificates short-lived: срок жизни около 160 часов. Renewal должен запускаться часто.

Пример cron каждые 6 часов:

```cron
0 */6 * * * cd /path/to/project && ./deploy/renew-ip-cert.sh >> logs/cert-renew.log 2>&1
```

`renew-ip-cert.sh` запускает `certbot renew` через compose и после успешного выполнения перезагружает Nginx reverse proxy (`nginx -s reload`). Если renewal не требуется, Certbot завершится успешно и сайт не будет остановлен.

## F. Обновление проекта

```bash
cd /path/to/project
git pull
./deploy/deploy.sh
```

Если в обновлении есть новые migrations:

```bash
./deploy/deploy.sh --migrate
```

## G. Backup / restore

Создать backup PostgreSQL:

```bash
./deploy/backup-db.sh
```

Файлы сохраняются в `backups/` с датой в имени и не коммитятся.

Восстановить backup:

```bash
./deploy/restore-db.sh backups/FILE.sql.gz --yes
```

Без `--yes` скрипт запросит подтверждение. Restore удаляет и пересоздаёт базу, поэтому используйте его только осознанно.

Пример cron для ежедневного backup:

```cron
30 2 * * * cd /path/to/project && ./deploy/backup-db.sh >> logs/db-backup.log 2>&1
```

## H. Logs

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs reverse-proxy
docker compose -f docker-compose.prod.yml --env-file .env.production logs frontend
docker compose -f docker-compose.prod.yml --env-file .env.production logs backend
docker compose -f docker-compose.prod.yml --env-file .env.production logs queue
docker compose -f docker-compose.prod.yml --env-file .env.production logs reverb
```

## I. Security checklist

- `APP_DEBUG=false`.
- `TELESCOPE_ENABLED=false`.
- `APP_KEY` заполнен.
- `JWT_SECRET` заполнен.
- `DB_PASSWORD` / `POSTGRES_PASSWORD` сильный.
- Наружу опубликованы только `80/443`.
- Laravel API не опубликован напрямую.
- PostgreSQL не опубликован.
- Redis не опубликован.
- Reverb не опубликован отдельным портом.
- `.env` / `.env.production` не закоммичены.
- `backups/` не закоммичен.
- Docker socket не смонтирован.
- HTTPS работает.
- Certificate renewal cron настроен.

## J. Ограничения IP HTTPS

- Let's Encrypt IP certificate живёт около 160 часов.
- Для учебного проекта это нормально при частом автоматическом renewal.
- Если публичный IP VPS изменится, обновите env-файлы и перевыпустите сертификат.
- Для долгосрочного публичного проекта обычно проще купить домен, но для этого учебного запуска домен не требуется.

## Reverb production

Reverb не публикуется отдельным host-портом. Если frontend использует websocket, используйте тот же публичный origin `https://VPS_PUBLIC_IP` и проксируйте websocket traffic через Nginx location `/app/` во внутренний `reverb:8080`. Не открывайте `8080` наружу.

## Code playground production note

Production compose не монтирует `/var/run/docker.sock` в `backend` или `queue`. Поэтому Docker-based code playground может быть ограничен без отдельного runner.

Для production нужен isolated runner service:

- отдельный worker pool;
- строгие CPU/RAM/PID/time лимиты;
- network isolation;
- отсутствие Docker socket в web/API контейнерах;
- per-user quotas и audit logs.

В этом этапе isolated runner не реализован.

## Debug deploy on VPS

Use the debug override only when you explicitly need direct Laravel debugging on the VPS. It publishes Laravel on `8000:8000`, switches Laravel containers to `APP_ENV=local` / `APP_DEBUG=true`, and builds backend-based services with Composer dev dependencies. **Debug mode exposes Laravel publicly and must not be left enabled permanently.**

Normal production deploy remains production-safe and does not use the debug override:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Debug deploy flow:

```bash
cd /path/to/project
git pull

docker compose -f docker-compose.prod.yml -f docker-compose.debug.yml --env-file .env.production up -d --build

docker compose -f docker-compose.prod.yml -f docker-compose.debug.yml --env-file .env.production exec backend php artisan migrate --force

docker compose -f docker-compose.prod.yml -f docker-compose.debug.yml --env-file .env.production logs -f backend queue scheduler reverb
```

Open Laravel directly for debugging:

```text
http://SERVER_IP:8000
```

Before using this from your workstation, allow `8000/tcp` in the VPS firewall only for the debugging window and preferably only from your IP. Close it again after debugging.

Return back to production mode:

```bash
cd /path/to/project

docker compose -f docker-compose.prod.yml -f docker-compose.debug.yml --env-file .env.production stop backend queue scheduler reverb

docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

docker compose -f docker-compose.prod.yml --env-file .env.production exec backend php artisan migrate --force

docker compose -f docker-compose.prod.yml --env-file .env.production logs -f backend
```

Do not use `docker compose down -v` for this switch. Do not delete PostgreSQL volumes and do not reset the production database.
