<?php

namespace App\Services\Ai;

use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Ai\Embeddings;
use Laravel\Ai\Reranking;

use function Laravel\Ai\agent;

class AiSdkService
{
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

        $provider = (string) config('ai.embeddings.provider', config('ai.provider', 'openai'));
        $model = (string) config('ai.embeddings.model', 'text-embedding-3-small');
        $dimensions = (int) config('ai.embeddings.dimensions', 1536);

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
                'message' => $exception->getMessage(),
            ]);

            return null;
        }
    }

    public function text(string $instructions, string $prompt, array $options = []): ?string
    {
        if (! function_exists('Laravel\\Ai\\agent')) {
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
                'message' => $exception->getMessage(),
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
                'message' => $exception->getMessage(),
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
            'chat_model' => config('ai.models.chat'),
            'embedding_provider' => config('ai.embeddings.provider'),
            'embedding_model' => config('ai.embeddings.model'),
            'embedding_dimensions' => config('ai.embeddings.dimensions'),
            'reranking_enabled' => config('ai.reranking.enabled'),
            'reranking_provider' => config('ai.reranking.provider'),
            'vector_driver' => config('ai.vector.driver'),
            'external_generation_enabled' => $this->hasAnyProviderKey(),
        ];
    }

    private function hasAnyProviderKey(): bool
    {
        $provider = (string) config('ai.provider', 'openai');
        $key = Arr::get(config('ai.providers', []), $provider . '.key');

        return is_string($key) && trim($key) !== '';
    }
}
