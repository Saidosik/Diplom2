# Free OpenRouter AI config — 4 chat models

Заменить в проекте:

- `.env` — обновленный локальный env с твоим OpenRouter key.
- `.env.example` — безопасный пример без секретов.
- `config/ai.php` — обязательно, если хочешь видеть все 4 модели в `/api/ai/models` и на фронте.

Выбранные бесплатные модели для чата:

1. `deepseek/deepseek-v4-flash:free` — основная модель по умолчанию.
2. `google/gemma-4-31b-it:free` — универсальный чат, документы, мультиязычность.
3. `poolside/laguna-m.1:free` — модель для кодинга, ревью, дебага и рефакторинга.
4. `moonshotai/kimi-k2.6:free` — длинный контекст, большие файлы, UI/UX и сложные проектные задачи.

Embeddings/RAG:

- `nvidia/llama-nemotron-embed-vl-1b-v2:free`

После замены выполнить:

```bash
php artisan optimize:clear
php artisan config:clear
php artisan cache:clear
php artisan queue:restart
```

Если у тебя pgvector-колонка уже создана как `vector(1536)`, а embeddings теперь `2048`, нужно либо пересоздать/изменить индекс на 2048, либо временно поставить `AI_VECTOR_DRIVER=json`.
