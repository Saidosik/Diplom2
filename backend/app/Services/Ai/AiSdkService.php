<?php

namespace App\Services\Ai;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Ai\Embeddings;
use Laravel\Ai\Reranking;

use function Laravel\Ai\agent;

class AiSdkService
{
    public function __construct(private readonly AiSettingsService $settings)
    {
    }

    /**
     * @param array<int, string> $inputs
     * @return array<int, array<int, float>>|null
     */
    public function embeddings(array $inputs): ?array
    {
        $inputs = collect($inputs)
            ->map(fn (string $input) => trim($input))
            ->filter(fn (string $input) => $input !== '')
            ->values()
            ->all();

        if ($inputs === [] || ! class_exists(Embeddings::class)) {
            return null;
        }

        $embedding = $this->settings->embeddingConfig();
        $provider = $embedding['provider'];
        $model = $embedding['model'];
        $dimensions = $embedding['dimensions'];

        try {
            $prompt = Embeddings::for($inputs)->dimensions($dimensions);

            if ((bool) config('ai.embeddings.cache', true) && method_exists($prompt, 'cache')) {
                $prompt = $prompt->cache();
            }

            $response = $model !== ''
                ? $prompt->generate($provider, $model)
                : $prompt->generate($provider);

            $vectors = $response->embeddings ?? null;

            if (! is_array($vectors)) {
                return null;
            }

            return array_values(array_map(
                fn (array $vector) => array_map(fn ($value) => (float) $value, $vector),
                $vectors
            ));
        } catch (\Throwable $exception) {
            Log::warning('Laravel AI SDK embeddings failed', [
                'provider' => $provider,
                'model' => $model,
                'reason' => $this->classifyException($exception),
                'message' => Str::limit($exception->getMessage(), 500, ''),
            ]);

            return null;
        }
    }

    public function text(string $instructions, string $prompt, array $options = []): ?string
    {
        $provider = (string) ($options['provider'] ?? config('ai.provider', 'openrouter'));

        if ($provider === 'openrouter') {
            return $this->openRouterText($instructions, $prompt, $options);
        }

        if (! function_exists('Laravel\\Ai\\agent')) {
            Log::warning('Laravel AI SDK text generation unavailable', [
                'provider' => $provider,
                'reason' => 'sdk_agent_function_missing',
            ]);

            return null;
        }

        $previousProvider = config('ai.provider');
        $previousChatModel = config('ai.models.chat');

        if (! empty($options['provider'])) {
            config(['ai.provider' => $options['provider']]);
        }

        if (! empty($options['model'])) {
            config(['ai.models.chat' => $options['model']]);
        }

        try {
            $response = agent(
                instructions: $instructions,
                messages: $options['messages'] ?? [],
                tools: $options['tools'] ?? [],
            )->prompt($prompt);

            $text = trim((string) ($response->text ?? $response));

            return $text !== '' ? $text : null;
        } catch (\Throwable $exception) {
            Log::warning('Laravel AI SDK text generation failed', [
                'provider' => config('ai.provider'),
                'model' => config('ai.models.chat'),
                'reason' => $this->classifyException($exception),
                'message' => Str::limit($exception->getMessage(), 500, ''),
            ]);

            return null;
        } finally {
            config([
                'ai.provider' => $previousProvider,
                'ai.models.chat' => $previousChatModel,
            ]);
        }
    }

    /**
     * @param array<int, array<string, mixed>> $items
     * @return array<int, array<string, mixed>>|null
     */
    public function rerank(string $query, array $items, int $limit = 8): ?array
    {
        if ($items === [] || ! class_exists(Reranking::class) || ! (bool) config('ai.reranking.enabled', true)) {
            return null;
        }

        $documents = collect($items)
            ->map(fn (array $item) => Str::limit(($item['title'] ?? 'Материал') . "\n" . ($item['content'] ?? ''), 2200, ''))
            ->values()
            ->all();

        try {
            $prompt = Reranking::of($documents)->limit($limit);
            $provider = config('ai.reranking.provider');
            $model = config('ai.reranking.model');

            $response = $provider
                ? $prompt->rerank($query, $provider, $model)
                : $prompt->rerank($query);

            $ranked = [];
            foreach ($response as $result) {
                $index = (int) ($result->index ?? -1);
                if (isset($items[$index])) {
                    $item = $items[$index];
                    $item['rerank_score'] = (float) ($result->score ?? 0.0);
                    $ranked[] = $item;
                }
            }

            return $ranked !== [] ? array_slice($ranked, 0, $limit) : null;
        } catch (\Throwable $exception) {
            Log::warning('Laravel AI SDK reranking failed', [
                'provider' => config('ai.reranking.provider'),
                'model' => config('ai.reranking.model'),
                'reason' => $this->classifyException($exception),
                'message' => Str::limit($exception->getMessage(), 500, ''),
            ]);

            return null;
        }
    }

    public function providerLabel(): string
    {
        return trim((string) config('ai.provider', 'laravel-ai-sdk'));
    }

    /**
     * @return array<string, mixed>
     */
    public function capabilities(): array
    {
        return [
            'sdk' => class_exists(Embeddings::class),
            'provider' => config('ai.provider'),
            'chat_model' => $this->settings->defaultChatModelId(),
            'embedding_provider' => $this->settings->embeddingConfig()['provider'],
            'embedding_model' => $this->settings->embeddingConfig()['model'],
            'embedding_dimensions' => $this->settings->embeddingConfig()['dimensions'],
            'reranking_enabled' => config('ai.reranking.enabled'),
            'reranking_provider' => config('ai.reranking.provider'),
            'vector_driver' => config('ai.vector.driver'),
            'external_generation_enabled' => $this->hasAnyProviderKey(),
            'provider_configured' => $this->hasProviderKey((string) config('ai.provider', 'openrouter')),
            'chat_models' => collect($this->settings->chatModels())
                ->map(fn (array $model) => [
                    'id' => $model['id'] ?? null,
                    'provider' => $model['provider'] ?? config('ai.provider'),
                    'default' => (bool) ($model['default'] ?? false),
                ])
                ->values()
                ->all(),
        ];
    }

    private function hasAnyProviderKey(): bool
    {
        return $this->hasProviderKey((string) config('ai.provider', 'openai'));
    }

    private function hasProviderKey(string $provider): bool
    {
        $key = Arr::get(config('ai.providers', []), $provider . '.key');

        return is_string($key) && trim($key) !== '' && ! $this->looksLikeUnexpandedEnvReference($key);
    }

    private function openRouterText(string $instructions, string $prompt, array $options = []): ?string
    {
        $apiKey = (string) (config('ai.providers.openrouter.key') ?: '');
        $baseUrl = rtrim((string) (config('ai.providers.openrouter.url') ?: 'https://openrouter.ai/api/v1'), '/');
        $model = (string) ($options['model'] ?? $this->settings->defaultChatModelId());
        $generation = $this->settings->generationOptions($model);
        $timeout = max(1, (int) config('ai.generation.timeout', 40));

        if (trim($apiKey) === '' || $this->looksLikeUnexpandedEnvReference($apiKey)) {
            Log::warning('OpenRouter text generation failed', [
                'provider' => 'openrouter',
                'model' => $model,
                'reason' => 'missing_api_key',
            ]);

            return null;
        }

        if (trim($baseUrl) === '' || $this->looksLikeUnexpandedEnvReference($baseUrl)) {
            Log::warning('OpenRouter text generation failed', [
                'provider' => 'openrouter',
                'model' => $model,
                'reason' => 'invalid_base_url',
                'base_url' => $this->safeUrlForLog($baseUrl),
            ]);

            return null;
        }

        if (trim($model) === '') {
            Log::warning('OpenRouter text generation failed', [
                'provider' => 'openrouter',
                'reason' => 'invalid_model',
            ]);

            return null;
        }

        $url = $baseUrl . '/chat/completions';

        try {
            $response = Http::timeout($timeout)
                ->retry(2, 750, fn (\Exception $exception, mixed $request): bool => $exception instanceof ConnectionException)
                ->withToken($apiKey)
                ->acceptJson()
                ->asJson()
                ->post($url, [
                    'model' => $model,
                    'messages' => [
                        ['role' => 'system', 'content' => $instructions],
                        ['role' => 'user', 'content' => $prompt],
                    ],
                    'temperature' => (float) ($options['temperature'] ?? $generation['temperature']),
                    'max_tokens' => (int) ($options['max_tokens'] ?? $generation['max_tokens']),
                ]);
        } catch (ConnectionException $exception) {
            Log::warning('OpenRouter text generation failed', [
                'provider' => 'openrouter',
                'model' => $model,
                'reason' => 'network_error',
                'message' => Str::limit($exception->getMessage(), 500, ''),
            ]);

            return null;
        } catch (\Throwable $exception) {
            Log::warning('OpenRouter text generation failed', [
                'provider' => 'openrouter',
                'model' => $model,
                'reason' => $this->classifyException($exception),
                'message' => Str::limit($exception->getMessage(), 500, ''),
            ]);

            return null;
        }

        if (! $response->successful()) {
            $this->logOpenRouterHttpFailure($response, $model);

            return null;
        }

        $content = $response->json('choices.0.message.content');

        if (! is_string($content) || trim($content) === '') {
            Log::warning('OpenRouter text generation failed', [
                'provider' => 'openrouter',
                'model' => $model,
                'reason' => 'bad_response_body',
                'status' => $response->status(),
                'body_preview' => $this->safeBodyPreview($response),
            ]);

            return null;
        }

        return trim($content);
    }

    private function logOpenRouterHttpFailure(Response $response, string $model): void
    {
        Log::warning('OpenRouter text generation failed', [
            'provider' => 'openrouter',
            'model' => $model,
            'reason' => $this->classifyStatus($response->status(), $response->body()),
            'status' => $response->status(),
            'body_preview' => $this->safeBodyPreview($response),
        ]);
    }

    private function classifyException(\Throwable $exception): string
    {
        $message = Str::lower($exception->getMessage());

        return match (true) {
            str_contains($message, 'timed out'), str_contains($message, 'timeout') => 'timeout',
            str_contains($message, '401'), str_contains($message, 'unauthorized'), str_contains($message, 'api key') => 'invalid_credentials',
            str_contains($message, '403'), str_contains($message, 'forbidden') => 'invalid_credentials',
            str_contains($message, '404'), str_contains($message, 'model') => 'invalid_model',
            str_contains($message, '429'), str_contains($message, 'rate limit') => 'rate_limit',
            str_contains($message, 'endpoint') => 'unsupported_endpoint',
            default => 'provider_unavailable',
        };
    }

    private function classifyStatus(int $status, string $body = ''): string
    {
        $body = Str::lower($body);

        return match (true) {
            $status === 401 || $status === 403 => 'invalid_credentials',
            $status === 404 || str_contains($body, 'model') => 'invalid_model',
            $status === 408 => 'timeout',
            $status === 429 => 'rate_limit',
            $status >= 500 => 'provider_unavailable',
            str_contains($body, 'endpoint') => 'unsupported_endpoint',
            default => 'bad_response_body',
        };
    }

    private function safeBodyPreview(Response $response): string
    {
        $json = $response->json();

        if (is_array($json)) {
            $safe = array_filter([
                'error_code' => Arr::get($json, 'error.code'),
                'error_type' => Arr::get($json, 'error.type'),
                'message' => Arr::get($json, 'error.message') ?: Arr::get($json, 'message'),
            ], fn ($value) => is_scalar($value) && $value !== '');

            if ($safe !== []) {
                return $this->redactSecrets(Str::limit(json_encode($safe, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '', 1000, ''));
            }
        }

        return $this->redactSecrets(Str::limit($response->body(), 300, ''));
    }

    private function safeUrlForLog(string $url): string
    {
        return $this->redactSecrets(Str::limit($url, 300, ''));
    }

    private function redactSecrets(string $value): string
    {
        return preg_replace('/sk-or-[A-Za-z0-9_\-]+/', 'sk-or-***', $value) ?? $value;
    }

    private function looksLikeUnexpandedEnvReference(string $value): bool
    {
        $value = trim($value);

        return preg_match('/^\$\{[A-Z0-9_]+\}$/', $value) === 1;
    }
}
