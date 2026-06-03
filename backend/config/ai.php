<?php

return [
    /*
    |--------------------------------------------------------------------------
    | AI provider selection
    |--------------------------------------------------------------------------
    |
    | These values are consumed by Laravel AI SDK and by the application RAG
    | services. Switching providers should be possible from .env without
    | changing application code.
    |
    */

    'provider' => env('AI_PROVIDER', 'openrouter'),

    'models' => [
        'chat' => env('AI_CHAT_MODEL', 'gpt-4o-mini'),
        'embedding' => env('AI_EMBEDDING_MODEL', 'text-embedding-3-small'),
        'rerank' => env('AI_RERANK_MODEL'),
    ],

    'chat_models' => [
        [
            'id' => env('AI_CHAT_MODEL', 'deepseek/deepseek-v4-flash:free'),
            'label' => env('AI_CHAT_MODEL_LABEL', 'DeepSeek V4 Flash'),
            'provider' => 'openrouter',
            'description' => 'Быстрая модель для обычного чата, технических вопросов и коротких объяснений.',
            'category' => 'general',
            'default' => true,
            'supports_files' => true,
            'supports_code' => true,
            'supports_rag' => true,
        ],
        [
            'id' => env('AI_CODE_MODEL', 'poolsideai/laguna-xs-2:free'),
            'label' => env('AI_CODE_MODEL_LABEL', 'Poolside Laguna XS.2'),
            'provider' => 'openrouter',
            'description' => 'Модель для программирования, анализа ошибок, рефакторинга и объяснения кода.',
            'category' => 'code',
            'default' => false,
            'supports_files' => true,
            'supports_code' => true,
            'supports_rag' => true,
        ],
        [
            'id' => env('AI_LONG_CONTEXT_MODEL', 'moonshotai/kimi-k2.6:free'),
            'label' => env('AI_LONG_CONTEXT_MODEL_LABEL', 'Kimi K2.6'),
            'provider' => 'openrouter',
            'description' => 'Модель для длинного контекста, анализа больших файлов и сложных архитектурных задач.',
            'category' => 'long-context',
            'default' => false,
            'supports_files' => true,
            'supports_code' => true,
            'supports_rag' => true,
        ],
        [
            'id' => env('AI_ALT_MODEL', 'google/gemma-4-26b-a4b-it:free'),
            'label' => env('AI_ALT_MODEL_LABEL', 'Gemma 4 26B A4B'),
            'provider' => 'openrouter',
            'description' => 'Универсальная альтернативная модель для общения, объяснений и анализа текста.',
            'category' => 'general',
            'default' => false,
            'supports_files' => true,
            'supports_code' => true,
            'supports_rag' => true,
        ],
    ],

    'embedding_models' => [
        [
            'id' => env('AI_EMBEDDING_MODEL', 'nvidia/llama-nemotron-embed-vl-1b-v2:free'),
            'label' => env('AI_EMBEDDING_MODEL_LABEL', 'NVIDIA Llama Nemotron Embed VL 1B V2'),
            'provider' => env('AI_EMBEDDING_PROVIDER', 'openrouter'),
            'dimensions' => (int) env('AI_EMBEDDING_DIMENSIONS', 1536),
            'default' => true,
        ],
    ],

    'embeddings' => [
        'provider' => env('AI_EMBEDDING_PROVIDER', env('AI_PROVIDER', 'openai')),
        'model' => env('AI_EMBEDDING_MODEL', 'text-embedding-3-small'),
        'dimensions' => (int) env('AI_EMBEDDING_DIMENSIONS', 1536),
        'cache' => filter_var(env('AI_EMBEDDINGS_CACHE', true), FILTER_VALIDATE_BOOL),
        'fallback_to_local' => filter_var(env('AI_EMBEDDINGS_LOCAL_FALLBACK', true), FILTER_VALIDATE_BOOL),
    ],

    'question_auto_answer' => [
        'enabled' => filter_var(env('AI_AUTO_ANSWER_QUESTIONS', true), FILTER_VALIDATE_BOOL),
    ],

    'indexing' => [
        'auto_reembed' => filter_var(env('AI_AUTO_REEMBED', true), FILTER_VALIDATE_BOOL),
        'queue' => env('AI_INDEX_QUEUE', 'ai-index'),
    ],

    'rag' => [
        'max_sources' => (int) env('AI_RAG_MAX_SOURCES', 8),
        'min_similarity' => (float) env('AI_RAG_MIN_SIMILARITY', 0.35),
        'use_rerank' => filter_var(env('AI_RAG_RERANK', true), FILTER_VALIDATE_BOOL),
        'fallback_to_local_answer' => filter_var(env('AI_RAG_LOCAL_FALLBACK', true), FILTER_VALIDATE_BOOL),
    ],

    'reranking' => [
        'provider' => env('AI_RERANK_PROVIDER'),
        'model' => env('AI_RERANK_MODEL'),
        'enabled' => filter_var(env('AI_RERANK_ENABLED', true), FILTER_VALIDATE_BOOL),
    ],

    'vector' => [
        // json is safe everywhere. pgvector enables Laravel 13 whereVectorSimilarTo()
        // and HNSW indexes when the PostgreSQL pgvector extension is installed.
        'driver' => env('AI_VECTOR_DRIVER', 'json'), // json|pgvector
        'column' => env('AI_VECTOR_COLUMN', 'embedding_vector'),
    ],

    'generation' => [
        'temperature' => (float) env('AI_TEMPERATURE', 0.2),
        'max_tokens' => (int) env('AI_MAX_TOKENS', 1600),
        'timeout' => (int) env('AI_TIMEOUT', 40),
    ],

    'attachments' => [
        'disk' => env('AI_ATTACHMENTS_DISK', 'local'),
        'max_kb' => (int) env('AI_ATTACHMENTS_MAX_KB', 1024),
        'max_extracted_chars' => (int) env('AI_ATTACHMENTS_MAX_EXTRACTED_CHARS', 24000),
        'allowed_extensions' => [
            'txt', 'md', 'json', 'js', 'jsx', 'ts', 'tsx', 'php', 'py', 'java', 'c', 'cpp', 'cs',
            'go', 'rs', 'sql', 'yaml', 'yml', 'xml', 'html', 'css', 'scss', 'log', 'env', 'ini', 'conf',
        ],
    ],

    'providers' => [
        'openai' => [
            'driver' => 'openai',
            'key' => env('OPENAI_API_KEY', env('AI_API_KEY')),
            'url' => env('OPENAI_BASE_URL', env('AI_BASE_URL')),
        ],
        'anthropic' => [
            'driver' => 'anthropic',
            'key' => env('ANTHROPIC_API_KEY'),
            'url' => env('ANTHROPIC_BASE_URL'),
        ],
        'gemini' => [
            'driver' => 'gemini',
            'key' => env('GEMINI_API_KEY'),
            'url' => env('GEMINI_BASE_URL'),
        ],
        'groq' => [
            'driver' => 'groq',
            'key' => env('GROQ_API_KEY'),
            'url' => env('GROQ_BASE_URL'),
        ],
        'mistral' => [
            'driver' => 'mistral',
            'key' => env('MISTRAL_API_KEY'),
            'url' => env('MISTRAL_BASE_URL'),
        ],
        'deepseek' => [
            'driver' => 'deepseek',
            'key' => env('DEEPSEEK_API_KEY'),
            'url' => env('DEEPSEEK_BASE_URL'),
        ],
        'xai' => [
            'driver' => 'xai',
            'key' => env('XAI_API_KEY'),
            'url' => env('XAI_BASE_URL'),
        ],
        'openrouter' => [
            'driver' => 'openrouter',
            'key' => env('OPENROUTER_API_KEY'),
            'url' => env('OPENROUTER_BASE_URL'),
        ],
        'cohere' => [
            'driver' => 'cohere',
            'key' => env('COHERE_API_KEY'),
        ],
        'jina' => [
            'driver' => 'jina',
            'key' => env('JINA_API_KEY'),
        ],
        'voyageai' => [
            'driver' => 'voyageai',
            'key' => env('VOYAGEAI_API_KEY'),
        ],
        'ollama' => [
            'driver' => 'ollama',
            'key' => env('OLLAMA_API_KEY'),
            'url' => env('OLLAMA_BASE_URL', 'http://127.0.0.1:11434/v1'),
        ],
    ],

    'caching' => [
        'embeddings' => [
            'cache' => filter_var(env('AI_EMBEDDINGS_CACHE', true), FILTER_VALIDATE_BOOL),
            'store' => env('CACHE_STORE', 'database'),
        ],
    ],
];
