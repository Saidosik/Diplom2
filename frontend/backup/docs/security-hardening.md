# Frontend security handling v1

## 429 handling

`browserApi` теперь распознаёт HTTP `429` и показывает пользователю понятное сообщение о слишком частых действиях. BFF `/api/laravel/*` прокидывает заголовок `Retry-After` от Laravel.

## Chat attachments

На клиенте добавлена предварительная проверка файлов перед отправкой в чат:

- максимум 5 файлов;
- максимум 10 МБ на файл;
- разрешены только типы, совпадающие с backend whitelist;
- unsupported/oversized файлы не добавляются в форму и показывают toast.

## Protected file proxy

Добавлен BFF endpoint:

```http
GET /api/laravel-file/*
```

Он проксирует бинарные ответы Laravel с авторизацией по httpOnly cookie. Это нужно для защищённых вложений чатов.
