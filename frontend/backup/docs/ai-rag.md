# AI RAG frontend

Добавлены:

- `/assistant` — AI-чат по базе знаний платформы;
- RAG sources cards — отображение источников ответа;
- AI-разбор запуска кода в `/playground`;
- навигация к AI-помощнику.

AI-чат работает через BFF:

```text
/api/laravel/ai/chat
/api/laravel/ai/rag/search
/api/laravel/ai/code/explain
```

Ответы показывают источники: публикации, вопросы, ответы и сниппеты.
