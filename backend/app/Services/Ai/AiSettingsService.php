<?php

namespace App\Services\Ai;

use App\Models\AiChatMessage;
use App\Models\AiChatSession;
use App\Models\AiKnowledgeChunk;
use App\Models\AiKnowledgeDocument;
use App\Models\AiModelConfig;
use App\Models\AppSetting;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class AiSettingsService
{
    public const PROMPTS_SETTING_KEY = 'ai.prompts';
    public const CACHE_PROMPTS_KEY = 'settings:ai:prompts';
    public const CACHE_CHAT_MODELS_KEY = 'settings:ai:chat-models';
    public const CACHE_EMBEDDING_KEY = 'settings:ai:embedding-model';

    /** @return array<string, string> */
    public function defaultPrompts(): array
    {
        return [
            'chat' => implode("\n", [
                'Ты AI-помощник информационного сообщества программистов «Вектор».',
                'Отвечай на русском языке, структурно и практически.',
                'Не выдумывай факты о проекте, версиях библиотек и внешних API. Если данных мало — скажи об этом.',
            ]),
            'rag' => implode("\n", [
                'Ты AI/RAG-помощник платформы «Вектор».',
                'Используй найденные источники платформы как основной контекст.',
                'Если источников недостаточно, честно скажи, что данных мало, и предложи уточнить вопрос.',
            ]),
            'files' => 'Ты анализируешь прикреплённые файлы пользователя в AI-чате платформы «Вектор». Отвечай на русском и указывай ограничения анализа.',
            'code' => implode("\n", [
                'Ты AI-помощник песочницы кода платформы «Вектор».',
                'Объясняй код, stdout/stderr и ошибки запуска. Не выдумывай результат выполнения, если его нет.',
                'Не предлагай опасные действия: секреты, сетевые запросы, доступ к файловой системе вне sandbox.',
            ]),
            'project' => 'Ты проектный AI-помощник «Вектор». Помогай планировать изменения, находить риски и объяснять архитектурные решения.',
            'question_auto_answer' => 'Ты готовишь предварительный AI-ответ к вопросу пользователя. Ответ должен быть осторожным, проверяемым и полезным для программистов.',
        ];
    }

    /** @return array<string, string> */
    public function prompts(): array
    {
        $cached = Cache::get(self::CACHE_PROMPTS_KEY);
        if (is_array($cached)) {
            return $this->normalizePrompts($cached);
        }

        $setting = AppSetting::query()->where('key', self::PROMPTS_SETTING_KEY)->first();
        $prompts = $this->normalizePrompts(is_array($setting?->value) ? $setting->value : []);
        Cache::forever(self::CACHE_PROMPTS_KEY, $prompts);

        return $prompts;
    }

    /** @param array<string, mixed> $prompts @return array<string, string> */
    public function updatePrompts(array $prompts): array
    {
        $normalized = $this->normalizePrompts($prompts);

        AppSetting::query()->updateOrCreate(
            ['key' => self::PROMPTS_SETTING_KEY],
            ['value' => $normalized]
        );

        Cache::forever(self::CACHE_PROMPTS_KEY, $normalized);

        return $normalized;
    }

    public function promptFor(string $mode, ?string $modelId = null): string
    {
        if ($modelId) {
            $model = AiModelConfig::query()
                ->where('model_id', $modelId)
                ->where('enabled', true)
                ->first();

            if ($model && is_string($model->system_prompt) && trim($model->system_prompt) !== '') {
                return trim($model->system_prompt);
            }
        }

        $prompts = $this->prompts();
        return $prompts[$mode] ?? $prompts['chat'] ?? $this->defaultPrompts()['chat'];
    }

    /** @return array<int, array<string, mixed>> */
    public function chatModels(): array
    {
        $cached = Cache::get(self::CACHE_CHAT_MODELS_KEY);
        if (is_array($cached)) {
            return $cached;
        }

        $models = AiModelConfig::query()
            ->where('enabled', true)
            ->where('use_for_chat', true)
            ->orderByDesc('default_for_chat')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (AiModelConfig $model) => $this->modelPayload($model))
            ->values()
            ->all();

        if ($models === []) {
            $models = collect(config('ai.chat_models', []))
                ->filter(fn ($model) => is_array($model) && ! empty($model['id']))
                ->map(fn (array $model, int $index) => [
                    'id' => (string) $model['id'],
                    'label' => (string) ($model['label'] ?? $model['id']),
                    'name' => (string) ($model['label'] ?? $model['id']),
                    'provider' => (string) ($model['provider'] ?? config('ai.provider', 'openrouter')),
                    'description' => (string) ($model['description'] ?? ''),
                    'category' => (string) ($model['category'] ?? 'general'),
                    'default' => (bool) ($model['default'] ?? $index === 0),
                    'supports_files' => (bool) ($model['supports_files'] ?? false),
                    'supports_code' => (bool) ($model['supports_code'] ?? false),
                    'supports_rag' => (bool) ($model['supports_rag'] ?? true),
                ])
                ->values()
                ->all();
        }

        Cache::forever(self::CACHE_CHAT_MODELS_KEY, $models);

        return $models;
    }

    /** @return array<int, string> */
    public function allowedChatModelIds(): array
    {
        return collect($this->chatModels())->pluck('id')->filter()->values()->all();
    }

    public function defaultChatModelId(): string
    {
        $default = collect($this->chatModels())->first(fn ($model) => (bool) ($model['default'] ?? false));

        return (string) (($default['id'] ?? null) ?: (config('ai.models.chat') ?: 'gpt-4o-mini'));
    }

    public function providerForModel(?string $modelId): string
    {
        if ($modelId) {
            $model = AiModelConfig::query()->where('model_id', $modelId)->first();
            if ($model) {
                return (string) $model->provider;
            }

            $configured = collect(config('ai.chat_models', []))->first(fn ($item) => is_array($item) && ($item['id'] ?? null) === $modelId);
            if (is_array($configured) && ! empty($configured['provider'])) {
                return (string) $configured['provider'];
            }
        }

        return (string) config('ai.provider', 'openrouter');
    }

    /** @return array{provider: string, model: string, dimensions: int} */
    public function embeddingConfig(): array
    {
        $cached = Cache::get(self::CACHE_EMBEDDING_KEY);
        if (is_array($cached) && isset($cached['provider'], $cached['model'], $cached['dimensions'])) {
            return [
                'provider' => (string) $cached['provider'],
                'model' => (string) $cached['model'],
                'dimensions' => (int) $cached['dimensions'],
            ];
        }

        $model = AiModelConfig::query()
            ->where('enabled', true)
            ->where('use_for_embeddings', true)
            ->orderByDesc('default_for_embeddings')
            ->orderBy('sort_order')
            ->first();

        $config = [
            'provider' => (string) ($model?->provider ?: config('ai.embeddings.provider', config('ai.provider', 'openrouter'))),
            'model' => (string) ($model?->model_id ?: config('ai.embeddings.model', 'text-embedding-3-small')),
            'dimensions' => max(32, (int) ($model?->dimensions ?: config('ai.embeddings.dimensions', 1536))),
        ];

        Cache::forever(self::CACHE_EMBEDDING_KEY, $config);

        return $config;
    }

    /** @return array{temperature: float, max_tokens: int} */
    public function generationOptions(?string $modelId = null): array
    {
        $model = $modelId ? AiModelConfig::query()->where('model_id', $modelId)->first() : null;

        return [
            'temperature' => (float) ($model?->temperature ?? config('ai.generation.temperature', 0.2)),
            'max_tokens' => (int) ($model?->max_tokens ?? config('ai.generation.max_tokens', 1600)),
        ];
    }

    /** @return array<string, mixed> */
    public function dashboard(): array
    {
        return [
            'stats' => [
                'models_total' => AiModelConfig::query()->count(),
                'models_enabled' => AiModelConfig::query()->where('enabled', true)->count(),
                'chat_models' => AiModelConfig::query()->where('enabled', true)->where('use_for_chat', true)->count(),
                'embedding_models' => AiModelConfig::query()->where('enabled', true)->where('use_for_embeddings', true)->count(),
                'sessions' => AiChatSession::query()->count(),
                'messages' => AiChatMessage::query()->count(),
                'documents' => AiKnowledgeDocument::query()->count(),
                'chunks' => AiKnowledgeChunk::query()->count(),
            ],
            'defaults' => [
                'chat_model' => $this->defaultChatModelId(),
                'embedding' => $this->embeddingConfig(),
                'provider' => config('ai.provider', 'openrouter'),
                'configured' => $this->hasOpenRouterKey(),
            ],
            'daily' => $this->dailyUsage(),
            'models' => $this->modelUsage(),
            'updated_at' => now()->toISOString(),
        ];
    }

    /** @return array<int, array<string, mixed>> */
    public function listModels(array $filters = []): array
    {
        $query = AiModelConfig::query()->orderByDesc('enabled')->orderBy('sort_order')->orderBy('name');

        if (! empty($filters['q'])) {
            $q = trim((string) $filters['q']);
            $query->where(function ($builder) use ($q): void {
                $builder->where('model_id', 'ILIKE', "%{$q}%")
                    ->orWhere('name', 'ILIKE', "%{$q}%")
                    ->orWhere('description', 'ILIKE', "%{$q}%");
            });
        }

        if (! empty($filters['usage']) && $filters['usage'] !== 'all') {
            match ($filters['usage']) {
                'chat' => $query->where('use_for_chat', true),
                'embedding' => $query->where('use_for_embeddings', true),
                'rerank' => $query->where('use_for_rerank', true),
                default => null,
            };
        }

        if (! empty($filters['enabled']) && $filters['enabled'] !== 'all') {
            $query->where('enabled', $filters['enabled'] === 'enabled');
        }

        return $query->limit(250)->get()->map(fn (AiModelConfig $model) => $this->modelPayload($model, true))->values()->all();
    }

    /** @param array<string, mixed> $data */
    public function updateModel(AiModelConfig $model, array $data): AiModelConfig
    {
        DB::transaction(function () use ($model, $data): void {
            $model->fill([
                'enabled' => (bool) ($data['enabled'] ?? $model->enabled),
                'use_for_chat' => (bool) ($data['use_for_chat'] ?? $model->use_for_chat),
                'use_for_embeddings' => (bool) ($data['use_for_embeddings'] ?? $model->use_for_embeddings),
                'use_for_rerank' => (bool) ($data['use_for_rerank'] ?? $model->use_for_rerank),
                'default_for_chat' => (bool) ($data['default_for_chat'] ?? $model->default_for_chat),
                'default_for_embeddings' => (bool) ($data['default_for_embeddings'] ?? $model->default_for_embeddings),
                'default_for_rerank' => (bool) ($data['default_for_rerank'] ?? $model->default_for_rerank),
                'category' => $data['category'] ?? $model->category,
                'system_prompt' => array_key_exists('system_prompt', $data) ? $data['system_prompt'] : $model->system_prompt,
                'temperature' => array_key_exists('temperature', $data) ? $data['temperature'] : $model->temperature,
                'max_tokens' => array_key_exists('max_tokens', $data) ? $data['max_tokens'] : $model->max_tokens,
                'dimensions' => array_key_exists('dimensions', $data) ? $data['dimensions'] : $model->dimensions,
                'sort_order' => array_key_exists('sort_order', $data) ? (int) $data['sort_order'] : $model->sort_order,
            ]);

            if ($model->default_for_chat) {
                $model->enabled = true;
                $model->use_for_chat = true;
                AiModelConfig::query()->whereKeyNot($model->id)->update(['default_for_chat' => false]);
            }

            if ($model->default_for_embeddings) {
                $model->enabled = true;
                $model->use_for_embeddings = true;
                AiModelConfig::query()->whereKeyNot($model->id)->update(['default_for_embeddings' => false]);
            }

            if ($model->default_for_rerank) {
                $model->enabled = true;
                $model->use_for_rerank = true;
                AiModelConfig::query()->whereKeyNot($model->id)->update(['default_for_rerank' => false]);
            }

            $model->save();
        });

        $this->forgetCache();

        return $model->fresh() ?? $model;
    }

    /** @return array<string, mixed> */
    public function syncOpenRouterModels(int $limit = 500): array
    {
        $provider = 'openrouter';
        $baseUrl = rtrim((string) (config('ai.providers.openrouter.url') ?: 'https://openrouter.ai/api/v1'), '/');
        $apiKey = (string) (config('ai.providers.openrouter.key') ?: '');

        $request = Http::timeout(45)->acceptJson();
        if (trim($apiKey) !== '') {
            $request = $request->withToken($apiKey);
        }

        try {
            $response = $request->get($baseUrl . '/models');
        } catch (ConnectionException $exception) {
            return ['synced' => 0, 'error' => 'network_error', 'message' => Str::limit($exception->getMessage(), 240, '')];
        }

        if (! $response->successful()) {
            return ['synced' => 0, 'error' => 'provider_error', 'status' => $response->status(), 'message' => Str::limit($response->body(), 240, '')];
        }

        $items = $response->json('data');
        if (! is_array($items)) {
            return ['synced' => 0, 'error' => 'bad_response_body'];
        }

        $synced = 0;
        foreach (array_slice($items, 0, $limit) as $item) {
            if (! is_array($item) || empty($item['id'])) {
                continue;
            }

            $payload = $this->payloadFromOpenRouter($item, $provider);
            $existing = AiModelConfig::query()->where('provider', $provider)->where('model_id', $payload['model_id'])->first();
            if ($existing) {
                $existing->fill(Arr::except($payload, ['enabled', 'use_for_chat', 'use_for_embeddings', 'use_for_rerank', 'default_for_chat', 'default_for_embeddings', 'default_for_rerank', 'system_prompt', 'temperature', 'max_tokens', 'dimensions', 'sort_order']))->save();
            } else {
                AiModelConfig::query()->create($payload);
            }
            $synced++;
        }

        $this->seedDefaultsIfNeeded();
        $this->forgetCache();

        return ['synced' => $synced, 'total_remote' => count($items), 'provider' => $provider, 'updated_at' => now()->toISOString()];
    }

    public function seedDefaultsIfNeeded(): void
    {
        if (AiModelConfig::query()->where('enabled', true)->exists()) {
            return;
        }

        foreach (config('ai.chat_models', []) as $index => $model) {
            if (! is_array($model) || empty($model['id'])) {
                continue;
            }

            AiModelConfig::query()->updateOrCreate(
                ['provider' => (string) ($model['provider'] ?? config('ai.provider', 'openrouter')), 'model_id' => (string) $model['id']],
                [
                    'name' => (string) ($model['label'] ?? $model['id']),
                    'description' => (string) ($model['description'] ?? ''),
                    'category' => (string) ($model['category'] ?? 'general'),
                    'is_available' => true,
                    'enabled' => true,
                    'use_for_chat' => true,
                    'default_for_chat' => (bool) ($model['default'] ?? $index === 0),
                    'sort_order' => $index,
                    'last_seen_at' => now(),
                ]
            );
        }

        foreach (config('ai.embedding_models', []) as $index => $model) {
            if (! is_array($model) || empty($model['id'])) {
                continue;
            }

            AiModelConfig::query()->updateOrCreate(
                ['provider' => (string) ($model['provider'] ?? config('ai.embeddings.provider', 'openrouter')), 'model_id' => (string) $model['id']],
                [
                    'name' => (string) ($model['label'] ?? $model['id']),
                    'category' => 'embedding',
                    'is_available' => true,
                    'enabled' => true,
                    'use_for_embeddings' => true,
                    'default_for_embeddings' => (bool) ($model['default'] ?? $index === 0),
                    'dimensions' => (int) ($model['dimensions'] ?? config('ai.embeddings.dimensions', 1536)),
                    'sort_order' => $index,
                    'last_seen_at' => now(),
                ]
            );
        }

        $this->forgetCache();
    }

    /** @return array<string, mixed> */
    public function modelPayload(AiModelConfig $model, bool $full = false): array
    {
        $payload = [
            'id' => $model->model_id,
            'database_id' => $model->id,
            'label' => $model->name ?: $model->model_id,
            'name' => $model->name ?: $model->model_id,
            'provider' => $model->provider,
            'description' => $model->description,
            'category' => $model->category ?: 'general',
            'default' => (bool) $model->default_for_chat,
            'enabled' => (bool) $model->enabled,
            'use_for_chat' => (bool) $model->use_for_chat,
            'use_for_embeddings' => (bool) $model->use_for_embeddings,
            'use_for_rerank' => (bool) $model->use_for_rerank,
            'default_for_chat' => (bool) $model->default_for_chat,
            'default_for_embeddings' => (bool) $model->default_for_embeddings,
            'default_for_rerank' => (bool) $model->default_for_rerank,
            'supports_files' => in_array('file', $model->input_modalities ?? [], true),
            'supports_code' => true,
            'supports_rag' => true,
            'context_length' => $model->context_length,
            'modality' => $model->modality,
            'temperature' => $model->temperature,
            'max_tokens' => $model->max_tokens,
            'dimensions' => $model->dimensions,
            'sort_order' => $model->sort_order,
        ];

        if ($full) {
            $payload += [
                'input_modalities' => $model->input_modalities ?? [],
                'output_modalities' => $model->output_modalities ?? [],
                'supported_parameters' => $model->supported_parameters ?? [],
                'pricing' => $model->pricing ?? [],
                'system_prompt' => $model->system_prompt,
                'is_available' => (bool) $model->is_available,
                'last_seen_at' => optional($model->last_seen_at)->toISOString(),
                'created_at' => optional($model->created_at)->toISOString(),
                'updated_at' => optional($model->updated_at)->toISOString(),
            ];
        }

        return $payload;
    }

    /** @param array<string, mixed> $source @return array<string, mixed> */
    private function payloadFromOpenRouter(array $source, string $provider): array
    {
        $architecture = is_array($source['architecture'] ?? null) ? $source['architecture'] : [];
        $input = array_values(array_filter((array) ($architecture['input_modalities'] ?? []), 'is_string'));
        $output = array_values(array_filter((array) ($architecture['output_modalities'] ?? []), 'is_string'));
        $name = (string) ($source['name'] ?? $source['id']);
        $modelId = (string) $source['id'];
        $modality = (string) ($architecture['modality'] ?? '');
        $isEmbedding = str_contains(Str::lower($modelId . ' ' . $name . ' ' . $modality), 'embed');

        return [
            'provider' => $provider,
            'model_id' => $modelId,
            'name' => $name,
            'description' => Str::limit((string) ($source['description'] ?? ''), 5000, ''),
            'category' => $isEmbedding ? 'embedding' : $this->inferCategory($modelId, $name),
            'modality' => $modality ?: null,
            'context_length' => is_numeric($source['context_length'] ?? null) ? (int) $source['context_length'] : null,
            'input_modalities' => $input,
            'output_modalities' => $output,
            'supported_parameters' => array_values(array_filter((array) ($source['supported_parameters'] ?? []), 'is_string')),
            'pricing' => is_array($source['pricing'] ?? null) ? $source['pricing'] : null,
            'metadata' => [
                'canonical_slug' => $source['canonical_slug'] ?? null,
                'knowledge_cutoff' => $source['knowledge_cutoff'] ?? null,
                'top_provider' => $source['top_provider'] ?? null,
            ],
            'is_available' => true,
            'enabled' => false,
            'use_for_chat' => ! $isEmbedding && in_array('text', $output, true),
            'use_for_embeddings' => $isEmbedding,
            'use_for_rerank' => false,
            'default_for_chat' => false,
            'default_for_embeddings' => false,
            'default_for_rerank' => false,
            'last_seen_at' => now(),
        ];
    }

    private function inferCategory(string $id, string $name): string
    {
        $text = Str::lower($id . ' ' . $name);
        return match (true) {
            str_contains($text, 'code'), str_contains($text, 'coder'), str_contains($text, 'coding') => 'code',
            str_contains($text, 'vision'), str_contains($text, 'vl'), str_contains($text, 'image') => 'multimodal',
            str_contains($text, 'free') => 'free',
            str_contains($text, 'long') || str_contains($text, 'kimi') || str_contains($text, 'claude') => 'long-context',
            default => 'general',
        };
    }

    /** @param array<string, mixed> $prompts @return array<string, string> */
    private function normalizePrompts(array $prompts): array
    {
        $defaults = $this->defaultPrompts();
        $result = [];
        foreach ($defaults as $key => $fallback) {
            $value = $prompts[$key] ?? $fallback;
            $result[$key] = is_string($value) && trim($value) !== '' ? Str::limit(trim($value), 8000, '') : $fallback;
        }

        return $result;
    }

    /** @return array<int, array{date: string, messages: int, sessions: int}> */
    private function dailyUsage(): array
    {
        $start = now()->subDays(13)->startOfDay();
        $days = collect(range(0, 13))->mapWithKeys(fn ($i) => [now()->subDays(13 - $i)->toDateString() => ['date' => now()->subDays(13 - $i)->format('d.m'), 'messages' => 0, 'sessions' => 0]])->all();

        $messages = AiChatMessage::query()
            ->where('created_at', '>=', $start)
            ->selectRaw('DATE(created_at) as day, COUNT(*) as aggregate')
            ->groupBy('day')
            ->pluck('aggregate', 'day');

        $sessions = AiChatSession::query()
            ->where('created_at', '>=', $start)
            ->selectRaw('DATE(created_at) as day, COUNT(*) as aggregate')
            ->groupBy('day')
            ->pluck('aggregate', 'day');

        foreach ($messages as $day => $count) {
            $key = Carbon::parse($day)->toDateString();
            if (isset($days[$key])) $days[$key]['messages'] = (int) $count;
        }
        foreach ($sessions as $day => $count) {
            $key = Carbon::parse($day)->toDateString();
            if (isset($days[$key])) $days[$key]['sessions'] = (int) $count;
        }

        return array_values($days);
    }

    /** @return array<int, array{model: string, count: int}> */
    private function modelUsage(): array
    {
        return AiChatMessage::query()
            ->where('role', 'assistant')
            ->whereNotNull('metadata')
            ->latest('id')
            ->limit(500)
            ->get()
            ->map(fn (AiChatMessage $message) => (string) Arr::get($message->metadata ?? [], 'model', 'unknown'))
            ->countBy()
            ->map(fn ($count, $model) => ['model' => (string) $model, 'count' => (int) $count])
            ->values()
            ->take(12)
            ->all();
    }

    private function hasOpenRouterKey(): bool
    {
        $key = (string) (config('ai.providers.openrouter.key') ?: '');
        return trim($key) !== '' && ! str_contains($key, '${');
    }

    private function forgetCache(): void
    {
        Cache::forget(self::CACHE_CHAT_MODELS_KEY);
        Cache::forget(self::CACHE_EMBEDDING_KEY);
    }
}
