# Вектор

**Вектор** — информационное сообщество программистов с публикациями, вопросами и ответами, репутацией, чатами, AI/RAG-ассистентом и playground для запуска кода в изолированной среде.

## Стек

### Backend

- Laravel и PHP.
- JWT-аутентификация.
- Redis для кеша, очередей и realtime-инфраструктуры.
- PostgreSQL с pgvector для данных и векторного поиска.
- Laravel Reverb для realtime-событий.
- Queues для фоновой обработки задач, AI/RAG-индексации и playground-запусков.

### Frontend

- Next.js.
- React.
- TypeScript.
- Tailwind CSS.
- TanStack Query.
- Monaco Editor.

### Infra

- Docker Compose.
- Nginx reverse proxy.
- Redis.
- PostgreSQL/pgvector.

## Основные возможности

- Регистрация, логин и email verification.
- Публикации с блочным контентом.
- Вопросы и ответы.
- Комментарии, реакции и жалобы.
- Репутация пользователей и события репутации.
- Realtime chat.
- AI/RAG assistant для поиска и ответов по базе знаний.
- Code playground через Docker sandbox.
- Админ-панель для управления контентом, пользователями, жалобами, тегами и AI-индексом.

## Локальный запуск через Docker Compose

> Перед запуском подготовьте `.env`-файлы на основе примеров и не коммитьте реальные секреты.

```bash
docker compose up --build
```

После запуска сервисы доступны по адресам, заданным в `docker-compose.yml` и переменных окружения. В типовой локальной конфигурации:

- Frontend: `http://localhost:3000`.
- Backend API: `http://localhost:8000` или через Nginx/reverse-proxy, если он включён в compose-конфигурации.

Проверить фактические порты можно командой:

```bash
docker compose ps
```

## Команды из Makefile

```bash
make docker-up
make docker-migrate
make docker-test
make frontend-typecheck
make frontend-lint
```

Дополнительно полезны:

```bash
make docker-build
make docker-down
make docker-ps
make docker-route-list
```

## Production deployment overview

Для production-развёртывания используются:

- `docker-compose.prod.yml` — production-compose со сборкой и запуском сервисов.
- `.env.production` — корневые переменные окружения для production-инфраструктуры.
- `backend/.env.production` — настройки Laravel-приложения.
- `frontend/.env.production` — настройки Next.js-приложения.
- Reverse-proxy/Nginx/SSL — входная точка для HTTPS, проксирования frontend/backend и корректной передачи `X-Forwarded-*` заголовков.

Общий порядок подготовки:

1. Скопировать production-примеры env-файлов и заменить все `CHANGE_ME`/`GENERATE_ME` значения.
2. Сгенерировать Laravel `APP_KEY` и `JWT_SECRET`.
3. Настроить домены, SSL и Nginx reverse proxy.
4. Указать безопасные значения `TRUSTED_PROXIES` для IP или подсетей reverse-proxy.
5. Собрать и запустить production-compose.
6. Выполнить миграции и проверить состояние сервисов.

## Переменные окружения, которые нужно сгенерировать или заменить

- `APP_KEY` — ключ Laravel-приложения.
- `JWT_SECRET` — секрет подписи JWT.
- `POSTGRES_PASSWORD` — пароль PostgreSQL.
- `REVERB_APP_SECRET` — секрет Reverb-приложения.
- `OPENROUTER_API_KEY` или `AI_API_KEY` — ключ AI-провайдера.
- OAuth client id/secret для подключённых провайдеров, например GitHub, Google или Yandex.

Не используйте реальные ключи, пароли и токены в репозитории. Храните их только в локальных или production env-файлах.

## Безопасность

- **Rate limits**: backend ограничивает частоту запросов для auth, поиска, AI, комментариев, реакций, жалоб, чата, presence, playground и операций записи контента.
- **JWT**: API использует JWT-аутентификацию, TTL и blacklist для контроля жизненного цикла токенов.
- **Email verification**: после регистрации пользователь должен подтвердить email перед полноценным доступом.
- **Docker sandbox для playground**: запуск пользовательского кода должен выполняться в ограниченной Docker-среде с лимитами времени, памяти, stdin/stdout и размера кода.
- **Trusted proxies через `TRUSTED_PROXIES`**: Laravel доверяет только явно заданным reverse-proxy IP/подсетям или безопасным локальным Docker-значениям по умолчанию. Не доверяйте всему интернету через `0.0.0.0/0` и `::/0` без крайней необходимости.

## Проверка перед защитой

Перед демонстрацией или защитой проекта рекомендуется выполнить:

```bash
cd backend && php artisan test
cd frontend && npm run typecheck
cd frontend && npm run lint
cd frontend && npm run build
docker compose ps
```

Также полезно проверить production-конфигурацию без секретов в git:

```bash
composer validate
npm install
```

## Быстрый чек-лист стабильного запуска

- Env-файлы созданы и заполнены безопасными значениями.
- `APP_KEY`, `JWT_SECRET`, `POSTGRES_PASSWORD`, `REVERB_APP_SECRET` и AI/OAuth-ключи заменены.
- База данных и Redis доступны из backend-контейнера.
- Миграции применены.
- Очереди запущены.
- Reverb доступен frontend-приложению.
- Nginx/SSL корректно проксируют запросы и websocket-соединения.
- `TRUSTED_PROXIES` содержит только внутреннюю подсеть Docker или IP reverse-proxy.
