<?php

namespace App\Services\Ai;

use App\Models\AiKnowledgeChunk;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class RagSearchService
{
    private const TYPES = ['all', 'publication', 'question', 'answer', 'snippet'];

    public function __construct(
        private readonly EmbeddingService $embeddings,
        private readonly AiSdkService $sdk,
    ) {
    }

    /**
     * @return array{data: array<int, array<string, mixed>>, meta: array<string, mixed>}
     */
    public function search(string $query, array $options = []): array
    {
        $query = $this->normalizeQuery($query);
        $type = $this->normalizeType((string) ($options['type'] ?? 'all'));
        $limit = min(max((int) ($options['limit'] ?? 8), 1), 20);

        if (Str::length($query) < 2) {
            return [
                'data' => [],
                'meta' => [
                    'query' => $query,
                    'type' => $type,
                    'limit' => $limit,
                    'engine' => $this->engineName(),
                    'total_candidates' => 0,
                    'sdk' => $this->sdk->capabilities(),
                ],
            ];
        }

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('SELECT set_limit(0.06)');
        }

        $queryEmbedding = $this->embeddings->embed($query);
        $vectorCandidates = $this->vectorCandidates($queryEmbedding, $type, $limit * 5);
        $lexicalCandidates = $this->lexicalCandidates($query, $type, $limit * 8);

        $candidates = $vectorCandidates
            ->concat($lexicalCandidates)
            ->unique('id')
            ->values();

        if ($candidates->isEmpty()) {
            $candidates = $this->fallbackCandidates($type, $limit * 4);
        }

        $items = $candidates
            ->map(function (AiKnowledgeChunk $chunk) use ($queryEmbedding, $query) {
                $lexical = (float) ($chunk->lexical_score ?? $this->basicLexicalScore($query, $chunk->search_text));
                $semantic = isset($chunk->vector_similarity)
                    ? (float) $chunk->vector_similarity
                    : $this->embeddings->cosine($queryEmbedding, $chunk->embedding ?? []);
                $freshness = $chunk->indexed_at && $chunk->indexed_at->greaterThan(now()->subDays(30)) ? 0.04 : 0.0;
                $score = ($semantic * 0.66) + (min($lexical, 1.0) * 0.30) + $freshness;

                return $this->mapChunk($chunk, round($score, 6), round($semantic, 6), round($lexical, 6));
            })
            ->sortByDesc('score')
            ->take(max($limit * 2, $limit))
            ->values()
            ->all();

        $reranked = $this->sdk->rerank($query, $items, $limit);

        if ($reranked !== null) {
            $items = $reranked;
        } else {
            $items = array_slice($items, 0, $limit);
        }

        return [
            'data' => array_values($items),
            'meta' => [
                'query' => $query,
                'type' => $type,
                'limit' => $limit,
                'engine' => $this->engineName(),
                'vector_candidates' => $vectorCandidates->count(),
                'lexical_candidates' => $lexicalCandidates->count(),
                'total_candidates' => $candidates->count(),
                'reranked' => $reranked !== null,
                'sdk' => $this->sdk->capabilities(),
            ],
        ];
    }

    private function normalizeQuery(string $query): string
    {
        return trim(preg_replace('/\s+/u', ' ', strip_tags($query)) ?: '');
    }

    private function normalizeType(string $type): string
    {
        return in_array($type, self::TYPES, true) ? $type : 'all';
    }

    private function engineName(): string
    {
        $parts = ['Laravel AI SDK embeddings'];

        if ($this->canUsePgvector()) {
            $parts[] = 'pgvector';
        }

        if (DB::getDriverName() === 'pgsql') {
            $parts[] = 'pg_trgm';
        }

        return implode(' + ', $parts);
    }

    /**
     * @param array<int, float> $queryEmbedding
     * @return \Illuminate\Support\Collection<int, AiKnowledgeChunk>
     */
    private function vectorCandidates(array $queryEmbedding, string $type, int $limit)
    {
        if (! $this->canUsePgvector() || $queryEmbedding === []) {
            return collect();
        }

        $column = (string) config('ai.vector.column', 'embedding_vector');
        $maxDistance = max(0.05, 1 - (float) config('ai.rag.min_similarity', 0.35));

        try {
            return AiKnowledgeChunk::query()
                ->with('document')
                ->when($type !== 'all', fn (Builder $builder) => $builder->where('source_type', $type))
                ->whereNotNull($column)
                ->select('ai_knowledge_chunks.*')
                ->selectVectorDistance($column, $queryEmbedding, as: 'vector_distance')
                ->whereVectorDistanceLessThan($column, $queryEmbedding, maxDistance: $maxDistance)
                ->orderByVectorDistance($column, $queryEmbedding)
                ->limit($limit)
                ->get()
                ->map(function (AiKnowledgeChunk $chunk) {
                    $distance = (float) ($chunk->vector_distance ?? 1.0);
                    $chunk->vector_similarity = max(0.0, min(1.0, 1.0 - $distance));

                    return $chunk;
                });
        } catch (\Throwable) {
            return collect();
        }
    }

    /**
     * @return \Illuminate\Support\Collection<int, AiKnowledgeChunk>
     */
    private function lexicalCandidates(string $query, string $type, int $limit)
    {
        $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $query) . '%';

        $builder = AiKnowledgeChunk::query()
            ->with('document')
            ->when($type !== 'all', fn (Builder $builder) => $builder->where('source_type', $type));

        if (DB::getDriverName() === 'pgsql') {
            $builder
                ->select('ai_knowledge_chunks.*')
                ->selectRaw(
                    "GREATEST(similarity(lower(search_text), lower(?)), similarity(lower(title), lower(?))) AS lexical_score",
                    [$query, $query]
                )
                ->where(function (Builder $q) use ($like, $query) {
                    $q->where('search_text', 'ILIKE', $like)
                        ->orWhere('title', 'ILIKE', $like)
                        ->orWhereRaw('lower(search_text) % lower(?)', [$query])
                        ->orWhereRaw('lower(title) % lower(?)', [$query]);
                })
                ->orderByDesc('lexical_score');
        } else {
            $builder->where(function (Builder $q) use ($like) {
                $q->where('search_text', 'LIKE', $like)
                    ->orWhere('title', 'LIKE', $like);
            });
        }

        return $builder
            ->latest('indexed_at')
            ->limit($limit)
            ->get();
    }

    /**
     * @return \Illuminate\Support\Collection<int, AiKnowledgeChunk>
     */
    private function fallbackCandidates(string $type, int $limit)
    {
        return AiKnowledgeChunk::query()
            ->with('document')
            ->when($type !== 'all', fn (Builder $builder) => $builder->where('source_type', $type))
            ->latest('indexed_at')
            ->limit($limit)
            ->get();
    }

    private function basicLexicalScore(string $query, string $text): float
    {
        $query = Str::lower($query);
        $text = Str::lower($text);

        if (str_contains($text, $query)) {
            return 1.0;
        }

        $terms = array_filter(preg_split('/\s+/u', $query) ?: []);
        if ($terms === []) {
            return 0.0;
        }

        $hits = 0;
        foreach ($terms as $term) {
            if (str_contains($text, $term)) {
                $hits++;
            }
        }

        return $hits / count($terms);
    }

    /**
     * @return array<string, mixed>
     */
    private function mapChunk(AiKnowledgeChunk $chunk, float $score, float $semantic, float $lexical): array
    {
        $document = $chunk->document;
        $metadata = $chunk->metadata ?? [];

        return [
            'id' => $chunk->id,
            'document_id' => $chunk->ai_knowledge_document_id,
            'type' => $chunk->source_type,
            'source_id' => $chunk->source_id,
            'title' => $chunk->title,
            'content' => Str::limit($chunk->content, 1200),
            'href' => $document?->url,
            'score' => $score,
            'semantic_score' => $semantic,
            'lexical_score' => $lexical,
            'chunk_index' => $chunk->chunk_index,
            'tags' => $document?->tags ?? [],
            'metadata' => $metadata,
            'indexed_at' => optional($chunk->indexed_at)->toISOString(),
        ];
    }

    private function canUsePgvector(): bool
    {
        return DB::getDriverName() === 'pgsql'
            && (string) config('ai.vector.driver', 'json') === 'pgvector'
            && Schema::hasColumn('ai_knowledge_chunks', (string) config('ai.vector.column', 'embedding_vector'));
    }
}
