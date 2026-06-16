<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiModelConfig;
use App\Services\Ai\AiSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminAiModelController extends Controller
{
    public function dashboard(AiSettingsService $settings): JsonResponse
    {
        $settings->seedDefaultsIfNeeded();

        return response()->json([
            'data' => $settings->dashboard(),
        ]);
    }

    public function models(Request $request, AiSettingsService $settings): JsonResponse
    {
        $settings->seedDefaultsIfNeeded();

        $data = $request->validate([
            'q' => ['nullable', 'string', 'max:160'],
            'usage' => ['nullable', Rule::in(['all', 'chat', 'embedding', 'rerank'])],
            'enabled' => ['nullable', Rule::in(['all', 'enabled', 'disabled'])],
        ]);

        return response()->json([
            'data' => $settings->listModels($data),
            'meta' => $settings->dashboard(),
        ]);
    }

    public function sync(Request $request, AiSettingsService $settings): JsonResponse
    {
        $data = $request->validate([
            'limit' => ['nullable', 'integer', 'min:1', 'max:1000'],
        ]);

        $result = $settings->syncOpenRouterModels((int) ($data['limit'] ?? 500));
        $status = isset($result['error']) ? 502 : 200;

        return response()->json([
            'message' => isset($result['error'])
                ? 'Не удалось получить список моделей OpenRouter.'
                : 'Список моделей OpenRouter обновлён.',
            'data' => $result,
        ], $status);
    }

    public function updateModel(Request $request, AiModelConfig $model, AiSettingsService $settings): JsonResponse
    {
        $data = $request->validate([
            'enabled' => ['sometimes', 'boolean'],
            'use_for_chat' => ['sometimes', 'boolean'],
            'use_for_embeddings' => ['sometimes', 'boolean'],
            'use_for_rerank' => ['sometimes', 'boolean'],
            'default_for_chat' => ['sometimes', 'boolean'],
            'default_for_embeddings' => ['sometimes', 'boolean'],
            'default_for_rerank' => ['sometimes', 'boolean'],
            'category' => ['nullable', 'string', 'max:80'],
            'system_prompt' => ['nullable', 'string', 'max:8000'],
            'temperature' => ['nullable', 'numeric', 'min:0', 'max:2'],
            'max_tokens' => ['nullable', 'integer', 'min:64', 'max:200000'],
            'dimensions' => ['nullable', 'integer', 'min:32', 'max:8192'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:10000'],
        ]);

        $model = $settings->updateModel($model, $data);

        return response()->json([
            'message' => 'Настройки модели сохранены.',
            'data' => $settings->modelPayload($model, true),
        ]);
    }

    public function prompts(AiSettingsService $settings): JsonResponse
    {
        return response()->json([
            'data' => $settings->prompts(),
            'defaults' => $settings->defaultPrompts(),
        ]);
    }

    public function updatePrompts(Request $request, AiSettingsService $settings): JsonResponse
    {
        $data = $request->validate([
            'chat' => ['nullable', 'string', 'max:8000'],
            'rag' => ['nullable', 'string', 'max:8000'],
            'files' => ['nullable', 'string', 'max:8000'],
            'code' => ['nullable', 'string', 'max:8000'],
            'project' => ['nullable', 'string', 'max:8000'],
            'question_auto_answer' => ['nullable', 'string', 'max:8000'],
        ]);

        return response()->json([
            'message' => 'Промпты AI сохранены.',
            'data' => $settings->updatePrompts($data),
        ]);
    }
}
