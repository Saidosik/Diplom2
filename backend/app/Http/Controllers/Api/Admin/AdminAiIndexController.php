<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\RebuildAiKnowledgeIndexJob;
use App\Jobs\ReindexAiKnowledgeSourceJob;
use App\Models\AiKnowledgeDocument;
use App\Models\CodeSnippet;
use App\Models\IssueAnswer;
use App\Models\IssueQuestion;
use App\Models\Publication;
use App\Services\Ai\KnowledgeExtractorService;
use App\Services\Ai\AiSettingsService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

class AdminAiIndexController extends Controller
{
    public function status(AiSettingsService $settings): JsonResponse
    {
        $sourceCounts = $this->sourceCounts();
        $documentCounts = AiKnowledgeDocument::query()
            ->selectRaw('source_type, count(*) as aggregate')
            ->groupBy('source_type')
            ->pluck('aggregate', 'source_type')
            ->map(fn ($value) => (int) $value)
            ->all();

        $missing = [];
        foreach ($sourceCounts as $type => $count) {
            $missing[$type] = max(0, $count - (int) ($documentCounts[$type] ?? 0));
        }

        return response()->json([
            'data' => [
                'documents' => [
                    'total' => AiKnowledgeDocument::query()->count(),
                    'indexed' => AiKnowledgeDocument::query()->where('status', 'indexed')->count(),
                    'indexing' => AiKnowledgeDocument::query()->where('status', 'indexing')->count(),
                    'failed' => AiKnowledgeDocument::query()->where('status', 'failed')->count(),
                    'stale' => AiKnowledgeDocument::query()
                        ->where(function (Builder $query) {
                            $query->whereNull('indexed_at')
                                ->orWhere('status', '!=', 'indexed')
                                ->orWhereColumn('source_updated_at', '>', 'indexed_at');
                        })
                        ->count(),
                ],
                'chunks' => [
                    'total' => \App\Models\AiKnowledgeChunk::query()->count(),
                ],
                'sources' => $sourceCounts,
                'indexed_by_type' => $documentCounts,
                'missing_by_type' => $missing,
                'provider' => [
                    'chat_provider' => config('ai.provider'),
                    'chat_model' => $settings->defaultChatModelId(),
                    'embedding_provider' => $settings->embeddingConfig()['provider'],
                    'embedding_model' => $settings->embeddingConfig()['model'],
                    'embedding_dimensions' => (int) $settings->embeddingConfig()['dimensions'],
                    'vector_driver' => config('ai.vector.driver'),
                    'rerank_enabled' => (bool) config('ai.rag.use_rerank'),
                ],
                'updated_at' => now()->toISOString(),
            ],
        ]);
    }

    public function documents(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:160'],
            'type' => ['nullable', Rule::in(['all', 'publication', 'question', 'answer', 'snippet'])],
            'status' => ['nullable', Rule::in(['all', 'indexed', 'indexing', 'failed', 'stale'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = AiKnowledgeDocument::query()
            ->withCount(['chunks as actual_chunks_count'])
            ->latest('indexed_at')
            ->latest('updated_at');

        if (($validated['type'] ?? 'all') !== 'all') {
            $query->where('source_type', $validated['type']);
        }

        if (($validated['status'] ?? 'all') === 'stale') {
            $query->where(function (Builder $builder) {
                $builder->whereNull('indexed_at')
                    ->orWhere('status', '!=', 'indexed')
                    ->orWhereColumn('source_updated_at', '>', 'indexed_at');
            });
        } elseif (($validated['status'] ?? 'all') !== 'all') {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['q'])) {
            $search = trim($validated['q']);
            $query->where(function (Builder $builder) use ($search) {
                $builder->where('title', 'ILIKE', "%{$search}%")
                    ->orWhere('url', 'ILIKE', "%{$search}%")
                    ->orWhere('source_type', 'ILIKE', "%{$search}%");
            });
        }

        $paginator = $query->paginate((int) ($validated['per_page'] ?? 20))->withQueryString();

        return response()->json([
            'data' => collect($paginator->items())->map(fn (AiKnowledgeDocument $document) => $this->documentPayload($document))->values(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function rebuild(Request $request, KnowledgeExtractorService $extractor): JsonResponse
    {
        $data = $request->validate([
            'mode' => ['nullable', Rule::in(['queued', 'sync'])],
            'force' => ['nullable', 'boolean'],
        ]);

        $force = (bool) ($data['force'] ?? true);

        if (($data['mode'] ?? 'queued') === 'sync') {
            $stats = $extractor->rebuild($force, $request->user()->id);

            return response()->json([
                'message' => 'AI индекс пересобран.',
                'data' => $stats,
            ]);
        }

        RebuildAiKnowledgeIndexJob::dispatch($force, $request->user()->id);

        return response()->json([
            'message' => 'Полная пересборка AI индекса добавлена в очередь.',
            'data' => ['queued' => true],
        ], 202);
    }

    public function reindexSource(Request $request, KnowledgeExtractorService $extractor): JsonResponse
    {
        $data = $request->validate([
            'source_type' => ['required', Rule::in(['publication', 'question', 'answer', 'snippet'])],
            'source_id' => ['required', 'integer', 'min:1'],
            'mode' => ['nullable', Rule::in(['queued', 'sync'])],
            'force' => ['nullable', 'boolean'],
        ]);

        $force = (bool) ($data['force'] ?? true);

        if (($data['mode'] ?? 'queued') === 'sync') {
            $result = $extractor->reindexSource($data['source_type'], (int) $data['source_id'], $force, $request->user()->id);

            return response()->json([
                'message' => 'Материал переиндексирован.',
                'data' => $result,
            ]);
        }

        ReindexAiKnowledgeSourceJob::dispatch($data['source_type'], (int) $data['source_id'], $force, $request->user()->id);

        return response()->json([
            'message' => 'Материал добавлен в очередь переиндексации.',
            'data' => ['queued' => true],
        ], 202);
    }

    public function reindexStale(Request $request): JsonResponse
    {
        $data = $request->validate([
            'force' => ['nullable', 'boolean'],
        ]);

        $force = (bool) ($data['force'] ?? false);
        $queued = 0;

        foreach ($this->staleSources() as [$type, $id]) {
            ReindexAiKnowledgeSourceJob::dispatch($type, $id, $force, $request->user()->id);
            $queued++;
        }

        return response()->json([
            'message' => "В очередь добавлено материалов: {$queued}.",
            'data' => ['queued' => $queued],
        ], 202);
    }

    public function destroyDocument(AiKnowledgeDocument $document): JsonResponse
    {
        $document->delete();

        return response()->json(['message' => 'Документ удалён из AI индекса.']);
    }

    /**
     * @return array<string, int>
     */
    private function sourceCounts(): array
    {
        return [
            'publication' => Publication::query()->published()->count(),
            'question' => IssueQuestion::query()->published()->count(),
            'answer' => IssueAnswer::query()->published()->whereHas('question', fn (Builder $query) => $query->published())->count(),
            'snippet' => CodeSnippet::query()->where('visibility', 'public')->count(),
        ];
    }

    /**
     * @return array<int, array{0:string, 1:int}>
     */
    private function staleSources(): array
    {
        $items = [];

        $this->collectStale($items, 'publication', Publication::query()->published());
        $this->collectStale($items, 'question', IssueQuestion::query()->published());
        $this->collectStale($items, 'answer', IssueAnswer::query()->published()->whereHas('question', fn (Builder $query) => $query->published()));
        $this->collectStale($items, 'snippet', CodeSnippet::query()->where('visibility', 'public'));

        AiKnowledgeDocument::query()
            ->where(function (Builder $query) {
                $query->where('status', 'failed')
                    ->orWhere('status', 'indexing')
                    ->orWhereNull('indexed_at');
            })
            ->get(['source_type', 'source_id'])
            ->each(function (AiKnowledgeDocument $document) use (&$items) {
                $items[] = [$document->source_type, (int) $document->source_id];
            });

        return collect($items)
            ->unique(fn ($item) => $item[0] . ':' . $item[1])
            ->values()
            ->all();
    }

    private function collectStale(array &$items, string $sourceType, Builder $sourceQuery): void
    {
        $sourceQuery->select(['id', 'updated_at'])->chunkById(200, function ($sources) use (&$items, $sourceType) {
            $documents = AiKnowledgeDocument::query()
                ->where('source_type', $sourceType)
                ->whereIn('source_id', $sources->pluck('id'))
                ->get()
                ->keyBy('source_id');

            foreach ($sources as $source) {
                $document = $documents->get($source->id);
                $sourceUpdatedAt = $source->updated_at instanceof Carbon ? $source->updated_at : Carbon::parse($source->updated_at);

                if (! $document || $document->status !== 'indexed' || ! $document->indexed_at || $document->indexed_at->lt($sourceUpdatedAt)) {
                    $items[] = [$sourceType, (int) $source->id];
                }
            }
        });
    }

    /**
     * @return array<string, mixed>
     */
    private function documentPayload(AiKnowledgeDocument $document): array
    {
        return [
            'id' => $document->id,
            'source_type' => $document->source_type,
            'source_id' => $document->source_id,
            'title' => $document->title,
            'url' => $document->url,
            'status' => $document->status,
            'is_stale' => $document->status !== 'indexed'
                || ! $document->indexed_at
                || ($document->source_updated_at && $document->source_updated_at->gt($document->indexed_at)),
            'chunks_count' => (int) ($document->chunks_count ?: ($document->actual_chunks_count ?? $document->chunks()->count())),
            'embedding_provider' => $document->embedding_provider,
            'embedding_model' => $document->embedding_model,
            'embedding_dimensions' => $document->embedding_dimensions,
            'last_error' => $document->last_error,
            'href' => $document->url,
            'indexed_at' => $document->indexed_at?->toISOString(),
            'source_updated_at' => $document->source_updated_at?->toISOString(),
            'updated_at' => $document->updated_at?->toISOString(),
        ];
    }
}
