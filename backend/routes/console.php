<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('ai:reindex', function () {
    $stats = app(\App\Services\Ai\KnowledgeExtractorService::class)->rebuild();
    $this->info('AI RAG индекс пересобран. Documents: ' . $stats['documents'] . ', chunks: ' . $stats['chunks']);
})->purpose('Rebuild AI RAG knowledge index from platform content');

Artisan::command('ai:openrouter:diagnose {--chat : Also send a minimal chat completions request}', function () {
    $provider = (string) config('ai.provider', 'openrouter');
    $apiKey = (string) (config('ai.providers.openrouter.key') ?: '');
    $baseUrl = rtrim((string) (config('ai.providers.openrouter.url') ?: 'https://openrouter.ai/api/v1'), '/');
    $chatModel = (string) config('ai.models.chat');
    $timeout = max(1, (int) config('ai.generation.timeout', 40));

    $this->line('provider=' . $provider);
    $this->line('base_url=' . safe_ai_cli_value($baseUrl));
    $this->line('chat_model=' . $chatModel);
    $this->line('timeout=' . $timeout);
    $this->line('api_key=' . ($apiKey !== '' && ! preg_match('/^\$\{[A-Z0-9_]+\}$/', trim($apiKey)) ? substr($apiKey, 0, 10) . '...' : 'missing_or_unexpanded'));

    if ($apiKey === '' || preg_match('/^\$\{[A-Z0-9_]+\}$/', trim($apiKey))) {
        $this->warn('OpenRouter API key is missing or still contains an unexpanded ${...} reference.');
    }

    $modelsResponse = Http::timeout($timeout)->acceptJson()->get($baseUrl . '/models');
    $this->line('models_status=' . $modelsResponse->status());
    $this->line('models_body_preview=' . safe_ai_cli_value(Str::limit($modelsResponse->body(), 500, '')));

    if (! $this->option('chat')) {
        return;
    }

    if ($apiKey === '' || preg_match('/^\$\{[A-Z0-9_]+\}$/', trim($apiKey))) {
        $this->warn('Skipping chat smoke test without a valid API key.');
        return;
    }

    $chatResponse = Http::timeout($timeout)
        ->withToken($apiKey)
        ->acceptJson()
        ->asJson()
        ->post($baseUrl . '/chat/completions', [
            'model' => $chatModel,
            'messages' => [
                ['role' => 'user', 'content' => 'Ответь одним словом: ping'],
            ],
            'max_tokens' => 16,
            'temperature' => 0,
        ]);

    $this->line('chat_status=' . $chatResponse->status());
    $this->line('chat_body_preview=' . safe_ai_cli_value(Str::limit($chatResponse->body(), 800, '')));
})->purpose('Safely diagnose OpenRouter connectivity and chat completions');

if (! function_exists('safe_ai_cli_value')) {
    function safe_ai_cli_value(string $value): string
    {
        return preg_replace('/sk-or-[A-Za-z0-9_\-]+/', 'sk-or-***', $value) ?? $value;
    }
}
