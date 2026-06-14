<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Models\AiChatAttachment;
use App\Models\AiChatMessage;
use App\Models\AiChatSession;
use App\Models\CodeRun;
use App\Models\UserFile;
use App\Services\Ai\AiSdkService;
use App\Services\Ai\GroundedAnswerService;
use App\Services\Ai\KnowledgeExtractorService;
use App\Services\Ai\RagSearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RagController extends Controller
{
    public function capabilities(AiSdkService $sdk): JsonResponse
    {
        return response()->json([
            'data' => $sdk->capabilities(),
        ]);
    }

    public function models(): JsonResponse
    {
        $models = collect(config('ai.chat_models', []))
            ->filter(fn ($model) => is_array($model) && ! empty($model['id']))
            ->unique('id')
            ->values()
            ->all();

        return response()->json(['data' => $models]);
    }

    public function search(Request $request, RagSearchService $search): JsonResponse
    {
        $data = $request->validate([
            'query' => ['required', 'string', 'min:2', 'max:500'],
            'type' => ['nullable', Rule::in(['all', 'publication', 'question', 'answer', 'snippet'])],
            'limit' => ['nullable', 'integer', 'min:1', 'max:20'],
        ]);

        return response()->json($search->search($data['query'], [
            'type' => $data['type'] ?? 'all',
            'limit' => $data['limit'] ?? 8,
        ]));
    }

    public function sessions(Request $request): JsonResponse
    {
        $sessions = AiChatSession::query()
            ->where('user_id', $request->user()->id)
            ->withCount('messages')
            ->latest('updated_at')
            ->limit(50)
            ->get()
            ->map(fn (AiChatSession $session) => $this->sessionPayload($session));

        return response()->json(['data' => $sessions]);
    }

    public function createSession(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:120'],
            'model' => ['nullable', 'string', Rule::in($this->allowedModelIds())],
            'type' => ['nullable', Rule::in(['all', 'publication', 'question', 'answer', 'snippet'])],
            'mode' => ['nullable', Rule::in(['chat', 'rag', 'files', 'code', 'project'])],
            'context_scope' => ['nullable', Rule::in(['none', 'all', 'publication', 'question', 'answer', 'snippet'])],
        ]);

        $model = $data['model'] ?? $this->defaultModelId();
        $mode = $data['mode'] ?? 'chat';
        $contextScope = $data['context_scope'] ?? ($mode === 'rag' ? ($data['type'] ?? 'all') : 'none');

        $session = AiChatSession::query()->create([
            'user_id' => $request->user()->id,
            'title' => $data['title'] ?? 'Новый чат',
            'mode' => $mode,
            'metadata' => [
                'source' => 'assistant',
                'model' => $model,
                'type' => $contextScope === 'none' ? 'all' : $contextScope,
                'context_scope' => $contextScope,
            ],
        ]);

        return response()->json(['data' => $this->sessionPayload($session)], 201);
    }

    public function updateSession(Request $request, AiChatSession $session): JsonResponse
    {
        $this->authorizeSession($request, $session);

        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:120'],
            'model' => ['nullable', 'string', Rule::in($this->allowedModelIds())],
            'type' => ['nullable', Rule::in(['all', 'publication', 'question', 'answer', 'snippet'])],
            'mode' => ['nullable', Rule::in(['chat', 'rag', 'files', 'code', 'project'])],
            'context_scope' => ['nullable', Rule::in(['none', 'all', 'publication', 'question', 'answer', 'snippet'])],
        ]);

        $metadata = $session->metadata ?? [];
        if (array_key_exists('model', $data)) {
            $metadata['model'] = $data['model'];
        }
        if (array_key_exists('type', $data)) {
            $metadata['type'] = $data['type'];
        }
        if (array_key_exists('context_scope', $data)) {
            $metadata['context_scope'] = $data['context_scope'];
            $metadata['type'] = $data['context_scope'] === 'none' ? 'all' : $data['context_scope'];
        }

        $session->fill([
            'title' => $data['title'] ?? $session->title,
            'mode' => $data['mode'] ?? $session->mode,
            'metadata' => $metadata,
        ])->save();

        return response()->json(['data' => $this->sessionPayload($session->fresh())]);
    }

    public function destroySession(Request $request, AiChatSession $session): JsonResponse
    {
        $this->authorizeSession($request, $session);
        $session->delete();

        return response()->json(['message' => 'AI-чат удалён']);
    }

    public function messages(Request $request, AiChatSession $session): JsonResponse
    {
        $this->authorizeSession($request, $session);

        return response()->json([
            'session' => $this->sessionPayload($session),
            'data' => $session->messages()
                ->with('attachments')
                ->latest('id')
                ->limit(100)
                ->get()
                ->reverse()
                ->values()
                ->map(fn (AiChatMessage $message) => $this->messagePayload($message)),
        ]);
    }

    public function uploadAttachment(Request $request): JsonResponse
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'max:' . (int) config('ai.attachments.max_kb', 1024)],
            'session_id' => ['nullable', 'integer', 'exists:ai_chat_sessions,id'],
        ]);

        if (! empty($data['session_id'])) {
            $session = AiChatSession::query()->findOrFail($data['session_id']);
            $this->authorizeSession($request, $session);
        }

        $file = $request->file('file');
        $extension = Str::lower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'txt');
        $allowed = array_map('strtolower', config('ai.attachments.allowed_extensions', []));

        if (! in_array($extension, $allowed, true)) {
            throw ValidationException::withMessages([
                'file' => 'Этот тип файла пока не поддерживается AI-чатом.',
            ]);
        }

        $disk = (string) config('ai.attachments.disk', 'local');
        $path = $file->store('ai-chat/' . $request->user()->id, $disk);
        $raw = Storage::disk($disk)->get($path);
        $extracted = $this->normalizeAttachmentText($raw);

        $attachment = AiChatAttachment::query()->create([
            'user_id' => $request->user()->id,
            'ai_chat_session_id' => $data['session_id'] ?? null,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'extension' => $extension,
            'size' => $file->getSize() ?: 0,
            'disk' => $disk,
            'path' => $path,
            'extracted_text' => $extracted,
            'metadata' => [
                'preview' => Str::limit($extracted, 500),
            ],
        ]);

        return response()->json(['data' => $this->attachmentPayload($attachment)], 201);
    }

    public function chat(Request $request, RagSearchService $search, GroundedAnswerService $answers): JsonResponse
    {
        $data = $this->validateChatRequest($request);
        [$session, $userMessage, $rag, $answer, $attachments] = $this->createChatTurn($request, $data, $search, $answers);

        $assistantMessage = $session->messages()->create([
            'user_id' => null,
            'role' => 'assistant',
            'content' => $answer['answer'],
            'sources' => $rag['data'] ?? [],
            'metadata' => [
                'provider' => $answer['provider'],
                'used_external_provider' => $answer['used_external_provider'],
                'model' => $data['model'] ?? $this->defaultModelId(),
                'rag' => $rag['meta'] ?? [],
                'thinking_steps' => $this->thinkingSteps($attachments !== [], (bool) ($answer['used_rag'] ?? false), $data['mode'] ?? 'chat'),
            ],
        ]);

        $session->touch();

        return response()->json([
            'session' => $this->sessionPayload($session->fresh()),
            'messages' => [
                $this->messagePayload($userMessage->load('attachments')),
                $this->messagePayload($assistantMessage),
            ],
            'answer' => $answer['answer'],
            'sources' => $rag['data'] ?? [],
            'meta' => [
                'provider' => $answer['provider'],
                'used_external_provider' => $answer['used_external_provider'],
                'model' => $data['model'] ?? $this->defaultModelId(),
                'rag' => $rag['meta'] ?? [],
            ],
        ], 201);
    }

    public function stream(Request $request, RagSearchService $search, GroundedAnswerService $answers): StreamedResponse
    {
        $data = $this->validateChatRequest($request);

        return response()->stream(function () use ($request, $data, $search, $answers): void {
            $send = function (string $event, array $payload): void {
                echo "event: {$event}\n";
                echo 'data: ' . json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n\n";
                @ob_flush();
                flush();
            };

            try {
                $send('status', ['step' => 'received', 'text' => 'Получил сообщение']);
                [$session, $userMessage, $rag, $answer, $attachments] = $this->createChatTurn($request, $data, $search, $answers, $send);

                foreach (($rag['data'] ?? []) as $source) {
                    $send('source', $source);
                }

                $send('status', ['step' => 'writing', 'text' => 'Формирую ответ']);
                $this->streamText($answer['answer'], $send);

                $assistantMessage = $session->messages()->create([
                    'user_id' => null,
                    'role' => 'assistant',
                    'content' => $answer['answer'],
                    'sources' => $rag['data'] ?? [],
                    'metadata' => [
                        'provider' => $answer['provider'],
                        'used_external_provider' => $answer['used_external_provider'],
                        'model' => $data['model'] ?? $this->defaultModelId(),
                        'rag' => $rag['meta'] ?? [],
                        'thinking_steps' => $this->thinkingSteps($attachments !== [], (bool) ($answer['used_rag'] ?? false), $data['mode'] ?? 'chat'),
                    ],
                ]);

                $session->touch();

                $send('done', [
                    'session' => $this->sessionPayload($session->fresh()),
                    'messages' => [
                        $this->messagePayload($userMessage->load('attachments')),
                        $this->messagePayload($assistantMessage),
                    ],
                    'answer' => $answer['answer'],
                    'sources' => $rag['data'] ?? [],
                    'meta' => [
                        'provider' => $answer['provider'],
                        'used_external_provider' => $answer['used_external_provider'],
                        'model' => $data['model'] ?? $this->defaultModelId(),
                        'rag' => $rag['meta'] ?? [],
                    ],
                ]);
            } catch (\Throwable $exception) {
                report($exception);
                $send('error', ['message' => 'AI-помощник временно недоступен']);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream; charset=utf-8',
            'Cache-Control' => 'no-cache, no-transform',
            'X-Accel-Buffering' => 'no',
            'Connection' => 'keep-alive',
        ]);
    }

    public function codeExplain(Request $request, RagSearchService $search, GroundedAnswerService $answers): JsonResponse
    {
        $data = $request->validate([
            'run_id' => ['nullable', 'integer', 'exists:code_runs,id'],
            'title' => ['nullable', 'string', 'max:160'],
            'language' => ['nullable', 'string', 'max:40'],
            'code' => ['nullable', 'string', 'max:30000'],
            'stdin' => ['nullable', 'string', 'max:8000'],
            'stdout' => ['nullable', 'string', 'max:20000'],
            'stderr' => ['nullable', 'string', 'max:20000'],
            'run_status' => ['nullable', 'string', 'max:40'],
            'exit_code' => ['nullable', 'integer'],
            'execution_time' => ['nullable', 'numeric'],
            'memory_usage' => ['nullable', 'numeric'],
            'intent' => ['nullable', Rule::in(['explain_code', 'explain_result', 'explain_error', 'find_bug', 'optimize', 'write_tests'])],
            'backend_runner' => ['nullable', 'string', 'max:120'],
            'backend_execution_note' => ['nullable', 'string', 'max:500'],
            'query' => ['nullable', 'string', 'max:500'],
        ]);

        $run = null;
        if (! empty($data['run_id'])) {
            $run = CodeRun::query()->where('user_id', $request->user()->id)->findOrFail($data['run_id']);
        }

        $runContext = [
            'title' => $data['title'] ?? $run?->snippet?->title ?? null,
            'language' => $data['language'] ?? $run?->language ?? 'code',
            'code' => $data['code'] ?? $run?->code ?? '',
            'stdin' => $data['stdin'] ?? $run?->stdin ?? '',
            'stdout' => $data['stdout'] ?? $run?->stdout ?? '',
            'stderr' => $data['stderr'] ?? $run?->stderr ?? '',
            'run_id' => $run?->id ?? ($data['run_id'] ?? null),
            'run_status' => $data['run_status'] ?? $run?->status ?? null,
            'exit_code' => $data['exit_code'] ?? $run?->exit_code ?? null,
            'execution_time' => $data['execution_time'] ?? $run?->execution_time ?? null,
            'memory_usage' => $data['memory_usage'] ?? $run?->memory_usage ?? null,
            'intent' => $data['intent'] ?? 'explain_code',
            'backend_runner' => $data['backend_runner'] ?? 'Laravel queue + Docker sandbox',
            'backend_execution_note' => $data['backend_execution_note'] ?? 'Код выполняется на backend через Laravel queue job и Docker sandbox. Browser не выполняет код напрямую.',
        ];

        $hasRun = ! empty($runContext['run_id']) || ! empty($runContext['run_status']);
        $intent = (string) ($runContext['intent'] ?? 'explain_code');
        $rag = ['data' => [], 'meta' => []];

        if ($hasRun || in_array($intent, ['explain_code', 'optimize', 'write_tests'], true)) {
            $query = trim(($data['query'] ?? '') . ' ' . $runContext['language'] . ' ' . $intent . ' ' . mb_substr($runContext['stderr'] ?: $runContext['stdout'] ?: $runContext['code'], 0, 500));
            $rag = $search->search($query, [
                'type' => 'all',
                'limit' => 4,
            ]);
        }

        return response()->json([
            'answer' => $answers->codeExplanation($runContext, $rag['data'] ?? []),
            'sources' => $rag['data'] ?? [],
            'meta' => $rag['meta'] ?? [],
        ]);
    }

    public function reindex(KnowledgeExtractorService $extractor): JsonResponse
    {
        $stats = $extractor->rebuild();

        return response()->json([
            'message' => 'AI RAG индекс пересобран',
            'data' => $stats,
        ]);
    }

    private function authorizeSession(Request $request, AiChatSession $session): void
    {
        abort_unless((int) $session->user_id === (int) $request->user()->id, 403, 'Нет доступа к AI-сессии');
    }

    private function sessionTitle(string $message): string
    {
        return mb_strlen($message) > 56 ? mb_substr($message, 0, 56) . '…' : $message;
    }

    /**
     * @return array<int, string>
     */
    private function allowedModelIds(): array
    {
        return collect(config('ai.chat_models', []))
            ->pluck('id')
            ->filter()
            ->values()
            ->all();
    }

    private function defaultModelId(): string
    {
        return (string) (config('ai.chat_models.0.id') ?: config('ai.models.chat', 'gpt-4o-mini'));
    }

    private function providerForModel(?string $model): string
    {
        $configured = collect(config('ai.chat_models', []))
            ->first(fn ($item) => is_array($item) && ($item['id'] ?? null) === $model);

        return (string) (($configured['provider'] ?? null) ?: config('ai.provider', 'openrouter'));
    }

    /**
     * @return array<string, mixed>
     */
    private function sessionPayload(AiChatSession $session): array
    {
        return [
            'id' => $session->id,
            'title' => $session->title,
            'mode' => $session->mode,
            'model' => $session->metadata['model'] ?? $this->defaultModelId(),
            'type' => $session->metadata['type'] ?? 'all',
            'context_scope' => $session->metadata['context_scope'] ?? ($session->mode === 'rag' ? ($session->metadata['type'] ?? 'all') : 'none'),
            'messages_count' => (int) ($session->messages_count ?? $session->messages()->count()),
            'created_at' => optional($session->created_at)->toISOString(),
            'updated_at' => optional($session->updated_at)->toISOString(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function messagePayload(AiChatMessage $message): array
    {
        return [
            'id' => $message->id,
            'role' => $message->role,
            'content' => $message->content,
            'sources' => $message->sources ?? [],
            'attachments' => $message->relationLoaded('attachments')
                ? $message->attachments->map(fn (AiChatAttachment $attachment) => $this->attachmentPayload($attachment))->values()->all()
                : [],
            'metadata' => $message->metadata ?? [],
            'created_at' => optional($message->created_at)->toISOString(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function attachmentPayload(AiChatAttachment $attachment): array
    {
        return [
            'id' => $attachment->id,
            'original_name' => $attachment->original_name,
            'mime_type' => $attachment->mime_type,
            'extension' => $attachment->extension,
            'size' => (int) $attachment->size,
            'preview' => $attachment->metadata['preview'] ?? Str::limit((string) $attachment->extracted_text, 500),
            'created_at' => optional($attachment->created_at)->toISOString(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function validateChatRequest(Request $request): array
    {
        return $request->validate([
            'message' => ['required', 'string', 'min:2', 'max:2500'],
            'session_id' => ['nullable', 'integer', 'exists:ai_chat_sessions,id'],
            'type' => ['nullable', Rule::in(['all', 'publication', 'question', 'answer', 'snippet'])],
            'mode' => ['nullable', Rule::in(['chat', 'rag', 'files', 'code', 'project'])],
            'context_scope' => ['nullable', Rule::in(['none', 'all', 'publication', 'question', 'answer', 'snippet'])],
            'model' => ['nullable', 'string', Rule::in($this->allowedModelIds())],
            'attachment_ids' => ['nullable', 'array', 'max:8'],
            'attachment_ids.*' => ['integer', 'exists:ai_chat_attachments,id'],
            'user_file_ids' => ['nullable', 'array', 'max:8'],
            'user_file_ids.*' => ['integer', 'exists:user_files,id'],
        ]);
    }

    /**
     * @return array{0: AiChatSession, 1: AiChatMessage, 2: array<string, mixed>, 3: array<string, mixed>, 4: array<int, array<string, mixed>>}
     */
    private function createChatTurn(Request $request, array $data, RagSearchService $search, GroundedAnswerService $answers, ?callable $send = null): array
    {
        $user = $request->user();
        $model = $data['model'] ?? $this->defaultModelId();
        $mode = $data['mode'] ?? 'chat';
        $contextScope = $data['context_scope'] ?? ($mode === 'rag' ? ($data['type'] ?? 'all') : 'none');
        $type = $contextScope === 'none' ? 'all' : $contextScope;
        $useRag = $mode === 'rag' || $contextScope !== 'none';

        $session = isset($data['session_id'])
            ? AiChatSession::query()->findOrFail($data['session_id'])
            : AiChatSession::query()->create([
                'user_id' => $user->id,
                'title' => $this->sessionTitle($data['message']),
                'mode' => $mode,
                'metadata' => [
                    'source' => 'assistant',
                    'model' => $model,
                    'type' => $type,
                    'context_scope' => $contextScope,
                ],
            ]);

        $this->authorizeSession($request, $session);

        $session->fill([
            'mode' => $mode,
            'metadata' => array_merge($session->metadata ?? [], [
                'model' => $model,
                'type' => $type,
                'context_scope' => $contextScope,
            ]),
        ])->save();

        $attachments = array_merge(
            $this->collectAttachments($request, $data['attachment_ids'] ?? [], $session),
            $this->collectUserFileAttachments($request, $data['user_file_ids'] ?? [], $session)
        );

        $userMessage = $session->messages()->create([
            'user_id' => $user->id,
            'role' => 'user',
            'content' => $data['message'],
            'metadata' => [
                'mode' => $mode,
                'type' => $type,
                'context_scope' => $contextScope,
                'model' => $model,
                'attachment_ids' => collect($attachments)->pluck('id')->values()->all(),
                'user_file_ids' => collect($attachments)->pluck('user_file_id')->filter()->values()->all(),
            ],
        ]);

        if ($attachments !== []) {
            AiChatAttachment::query()
                ->whereIn('id', collect($attachments)->pluck('id')->all())
                ->update([
                    'ai_chat_session_id' => $session->id,
                    'ai_chat_message_id' => $userMessage->id,
                ]);
        }

        $rag = ['data' => [], 'meta' => ['enabled' => false, 'type' => $type]];
        if ($useRag) {
            if ($send) {
                $send('status', ['step' => 'searching', 'text' => 'Ищу похожие материалы в базе знаний']);
            }
            $rag = $search->search($data['message'], [
                'type' => $type,
                'limit' => 8,
            ]);
            $rag['meta'] = array_merge($rag['meta'] ?? [], ['enabled' => true, 'type' => $type]);
        }

        if ($attachments !== []) {
            if ($send) {
                $send('status', ['step' => 'files', 'text' => 'Анализирую прикреплённые файлы']);
            }
        }

        if ($send) {
            $send('status', ['step' => 'thinking', 'text' => $useRag ? 'Собираю контекст и готовлю ответ' : 'Готовлю ответ без поиска по базе знаний']);
        }

        $history = $session->messages()
            ->latest('id')
            ->limit(10)
            ->get()
            ->reverse()
            ->values()
            ->map(fn (AiChatMessage $message) => [
                'role' => $message->role,
                'content' => $message->content,
            ])
            ->all();

        $answer = $answers->answer($data['message'], $rag['data'] ?? [], $mode, [
            'model' => $model,
            'provider' => $this->providerForModel($model),
            'attachments' => $attachments,
            'history' => $history,
            'use_rag' => $useRag,
            'context_scope' => $contextScope,
        ]);
        $answer['used_rag'] = $useRag;

        return [$session, $userMessage, $rag, $answer, $attachments];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function collectAttachments(Request $request, array $ids, AiChatSession $session): array
    {
        if ($ids === []) {
            return [];
        }

        return AiChatAttachment::query()
            ->where('user_id', $request->user()->id)
            ->whereIn('id', $ids)
            ->where(function ($query) use ($session) {
                $query->whereNull('ai_chat_session_id')
                    ->orWhere('ai_chat_session_id', $session->id);
            })
            ->get()
            ->map(fn (AiChatAttachment $attachment) => [
                'id' => $attachment->id,
                'original_name' => $attachment->original_name,
                'mime_type' => $attachment->mime_type,
                'extension' => $attachment->extension,
                'size' => (int) $attachment->size,
                'extracted_text' => $attachment->extracted_text,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function collectUserFileAttachments(Request $request, array $ids, AiChatSession $session): array
    {
        if ($ids === []) {
            return [];
        }

        $files = UserFile::query()
            ->where('user_id', $request->user()->id)
            ->whereIn('id', collect($ids)->map(fn ($id) => (int) $id)->filter()->unique()->take(8)->all())
            ->get();

        return $files->map(function (UserFile $file) use ($request, $session): array {
            $text = $this->extractTextFromUserFile($file);
            $extension = Str::lower(pathinfo($file->original_name ?: $file->path, PATHINFO_EXTENSION));

            $attachment = AiChatAttachment::query()->create([
                'user_id' => $request->user()->id,
                'ai_chat_session_id' => $session->id,
                'original_name' => $file->original_name,
                'mime_type' => $file->mime_type,
                'extension' => $extension ?: null,
                'size' => (int) $file->size,
                'disk' => $file->disk ?: 'local',
                'path' => $file->path,
                'extracted_text' => $text,
                'metadata' => [
                    'source' => 'user_file',
                    'user_file_id' => $file->id,
                    'preview' => Str::limit($text !== '' ? $text : 'Текст из файла не извлечён. Файл доступен как вложение.', 500),
                ],
            ]);

            return [
                'id' => $attachment->id,
                'user_file_id' => $file->id,
                'original_name' => $attachment->original_name,
                'mime_type' => $attachment->mime_type,
                'extension' => $attachment->extension,
                'size' => (int) $attachment->size,
                'extracted_text' => $attachment->extracted_text,
            ];
        })->values()->all();
    }

    private function extractTextFromUserFile(UserFile $file): string
    {
        $disk = $file->disk ?: 'local';

        if (! Storage::disk($disk)->exists($file->path)) {
            return '';
        }

        $mime = (string) $file->mime_type;
        $name = Str::lower($file->original_name ?: $file->path);
        $isText = str_starts_with($mime, 'text/')
            || str_contains($mime, 'json')
            || str_contains($mime, 'xml')
            || preg_match('/\.(md|txt|log|json|js|jsx|ts|tsx|php|py|java|c|cpp|cs|go|rs|sql|yaml|yml|xml|html|css|scss|env|ini|conf)$/', $name);

        if (! $isText) {
            return '';
        }

        return $this->normalizeAttachmentText(Storage::disk($disk)->get($file->path));
    }

    private function normalizeAttachmentText(string $raw): string
    {
        $text = preg_replace('/[^\P{C}\n\t]/u', '', $raw) ?: $raw;
        $text = trim(str_replace("\0", '', $text));

        return Str::limit($text, (int) config('ai.attachments.max_extracted_chars', 24000), '');
    }

    /**
     * @return array<int, string>
     */
    private function thinkingSteps(bool $hasAttachments, bool $usedRag = true, string $mode = 'chat'): array
    {
        return array_values(array_filter([
            $usedRag ? 'Ищу похожие материалы в базе знаний' : null,
            $hasAttachments ? 'Анализирую прикреплённые файлы' : null,
            'Собираю контекст диалога',
            $mode === 'chat' && ! $usedRag ? 'Формирую обычный ответ' : 'Формирую ответ с учётом выбранного режима',
        ]));
    }

    private function streamText(string $text, callable $send): void
    {
        $chunks = preg_split('/(\s+)/u', $text, -1, PREG_SPLIT_DELIM_CAPTURE) ?: [$text];
        $buffer = '';

        foreach ($chunks as $chunk) {
            $buffer .= $chunk;
            if (mb_strlen($buffer) >= 28 || str_ends_with($chunk, "\n")) {
                $send('token', ['text' => $buffer]);
                $buffer = '';
                usleep(25000);
            }
        }

        if ($buffer !== '') {
            $send('token', ['text' => $buffer]);
        }
    }
}
