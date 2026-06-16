<?php

namespace App\Services\Ai;

use App\Models\AiKnowledgeChunk;
use App\Models\AiKnowledgeDocument;
use App\Models\CodeSnippet;
use App\Models\IssueAnswer;
use App\Models\IssueQuestion;
use App\Models\Publication;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class KnowledgeExtractorService
{
    public function __construct(private readonly EmbeddingService $embeddings, private readonly AiSettingsService $settings)
    {
    }

    /**
     * Полностью пересобирает RAG-индекс из опубликованных материалов платформы.
     *
     * @return array<string, int>
     */
    public function rebuild(bool $force = true, ?int $requestedById = null): array
    {
        DB::transaction(function () {
            AiKnowledgeChunk::query()->delete();
            AiKnowledgeDocument::query()->delete();
        });

        $stats = [
            'queued' => 0,
            'indexed' => 0,
            'skipped' => 0,
            'removed' => 0,
            'failed' => 0,
        ];

        $this->indexPublications($stats, $force, $requestedById);
        $this->indexQuestions($stats, $force, $requestedById);
        $this->indexAnswers($stats, $force, $requestedById);
        $this->indexCodeSnippets($stats, $force, $requestedById);

        return [
            ...$stats,
            'documents' => AiKnowledgeDocument::query()->count(),
            'chunks' => AiKnowledgeChunk::query()->count(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function reindexSource(string $sourceType, int $sourceId, bool $force = false, ?int $requestedById = null): array
    {
        $sourceType = $this->normalizeSourceType($sourceType);
        $model = $this->sourceModel($sourceType, $sourceId);

        if (! $model) {
            return [
                'status' => 'removed',
                'source_type' => $sourceType,
                'source_id' => $sourceId,
                'removed' => (bool) $this->removeDocument($sourceType, $sourceId),
            ];
        }

        try {
            $document = match ($sourceType) {
                'publication' => $this->indexPublication($model, $force, $requestedById),
                'question' => $this->indexQuestion($model, $force, $requestedById),
                'answer' => $this->indexAnswer($model, $force, $requestedById),
                'snippet' => $this->indexCodeSnippet($model, $force, $requestedById),
                default => throw new RuntimeException("Unsupported AI source type [{$sourceType}]"),
            };

            if (! $document) {
                return [
                    'status' => 'removed',
                    'source_type' => $sourceType,
                    'source_id' => $sourceId,
                    'removed' => (bool) $this->removeDocument($sourceType, $sourceId),
                ];
            }

            return [
                'status' => $document->wasRecentlyCreated || $document->wasChanged('indexed_at') ? 'indexed' : 'skipped',
                'document' => $document->fresh('chunks'),
            ];
        } catch (Throwable $e) {
            $document = AiKnowledgeDocument::query()->firstOrCreate(
                ['source_type' => $sourceType, 'source_id' => $sourceId],
                ['title' => class_basename($model) . ' #' . $sourceId, 'status' => 'failed']
            );

            $document->update([
                'status' => 'failed',
                'last_error' => Str::limit($e->getMessage(), 2000),
                'source_updated_at' => optional($model->updated_at)->toDateTimeString(),
                'reindexed_by_id' => $requestedById,
            ]);

            throw $e;
        }
    }

    public function removeDocument(string $sourceType, int $sourceId): ?AiKnowledgeDocument
    {
        $sourceType = $this->normalizeSourceType($sourceType);
        $document = AiKnowledgeDocument::query()
            ->where('source_type', $sourceType)
            ->where('source_id', $sourceId)
            ->first();

        if ($document) {
            $document->delete();
        }

        return $document;
    }

    public function indexPublication(Publication $publication, bool $force = false, ?int $requestedById = null): ?AiKnowledgeDocument
    {
        if ((method_exists($publication, 'trashed') && $publication->trashed()) || ! $publication->isPublished()) {
            $this->removeDocument('publication', (int) $publication->id);
            return null;
        }

        $publication->loadMissing(['author', 'tags', 'blocks']);

        $text = collect([
            $publication->title,
            $publication->excerpt,
            $publication->tags->pluck('name')->implode(', '),
            $this->blocksToText($publication->blocks->pluck('content')->all()),
        ])->filter()->implode("\n\n");

        return $this->storeDocument(
            sourceType: 'publication',
            sourceId: (int) $publication->id,
            title: $publication->title,
            url: '/publications/' . $publication->slug,
            text: $text,
            tags: $publication->tags->map(fn ($tag) => ['id' => $tag->id, 'name' => $tag->name, 'slug' => $tag->slug])->values()->all(),
            metadata: [
                'author_id' => $publication->author_id,
                'author_name' => $publication->author?->name,
                'published_at' => optional($publication->published_at)->toISOString(),
                'type' => $publication->type?->value ?? (string) $publication->type,
            ],
            sourceUpdatedAt: $publication->updated_at,
            force: $force,
            requestedById: $requestedById,
        );
    }

    public function indexQuestion(IssueQuestion $question, bool $force = false, ?int $requestedById = null): ?AiKnowledgeDocument
    {
        if ((method_exists($question, 'trashed') && $question->trashed()) || ! $question->isPublished()) {
            $this->removeDocument('question', (int) $question->id);
            return null;
        }

        $question->loadMissing(['author', 'tags', 'blocks']);

        $text = collect([
            $question->title,
            $question->excerpt,
            $question->is_solved ? 'Вопрос решён' : 'Вопрос пока без принятого ответа',
            $question->tags->pluck('name')->implode(', '),
            $this->blocksToText($question->blocks->pluck('content')->all()),
        ])->filter()->implode("\n\n");

        return $this->storeDocument(
            sourceType: 'question',
            sourceId: (int) $question->id,
            title: $question->title,
            url: '/questions/' . $question->slug,
            text: $text,
            tags: $question->tags->map(fn ($tag) => ['id' => $tag->id, 'name' => $tag->name, 'slug' => $tag->slug])->values()->all(),
            metadata: [
                'author_id' => $question->author_id,
                'author_name' => $question->author?->name,
                'published_at' => optional($question->published_at)->toISOString(),
                'is_solved' => (bool) $question->is_solved,
                'views_count' => (int) $question->views_count,
            ],
            sourceUpdatedAt: $question->updated_at,
            force: $force,
            requestedById: $requestedById,
        );
    }

    public function indexAnswer(IssueAnswer $answer, bool $force = false, ?int $requestedById = null): ?AiKnowledgeDocument
    {
        $status = $answer->status instanceof \BackedEnum ? $answer->status->value : (string) $answer->status;
        if ($status !== 'published') {
            $this->removeDocument('answer', (int) $answer->id);
            return null;
        }

        $answer->loadMissing(['author', 'blocks', 'question.tags']);

        if (! $answer->question || ! $answer->question->isPublished()) {
            $this->removeDocument('answer', (int) $answer->id);
            return null;
        }

        $title = ($answer->is_ai_generated ? 'AI-ответ' : 'Ответ') . ' к вопросу: ' . $answer->question->title;
        $text = collect([
            $title,
            $answer->question->title,
            $answer->question->excerpt,
            $answer->question->tags->pluck('name')->implode(', '),
            $this->blocksToText($answer->blocks->pluck('content')->all()),
        ])->filter()->implode("\n\n");

        return $this->storeDocument(
            sourceType: 'answer',
            sourceId: (int) $answer->id,
            title: $title,
            url: '/questions/' . $answer->question->slug . '#answer-' . $answer->id,
            text: $text,
            tags: $answer->question->tags->map(fn ($tag) => ['id' => $tag->id, 'name' => $tag->name, 'slug' => $tag->slug])->values()->all(),
            metadata: [
                'author_id' => $answer->author_id,
                'author_name' => $answer->author?->name,
                'question_id' => $answer->issue_question_id,
                'question_title' => $answer->question->title,
                'is_accepted' => (bool) $answer->is_accepted,
                'is_ai_generated' => (bool) $answer->is_ai_generated,
            ],
            sourceUpdatedAt: $answer->updated_at,
            force: $force,
            requestedById: $requestedById,
        );
    }

    public function indexCodeSnippet(CodeSnippet $snippet, bool $force = false, ?int $requestedById = null): ?AiKnowledgeDocument
    {
        if (! $snippet->isPublic()) {
            $this->removeDocument('snippet', (int) $snippet->id);
            return null;
        }

        $snippet->loadMissing('user');

        $text = collect([
            $snippet->title,
            $snippet->language,
            $snippet->code,
            $snippet->stdin,
        ])->filter()->implode("\n\n");

        return $this->storeDocument(
            sourceType: 'snippet',
            sourceId: (int) $snippet->id,
            title: $snippet->title,
            url: '/playground?snippet=' . $snippet->id,
            text: $text,
            tags: [['name' => $snippet->language, 'slug' => $snippet->language]],
            metadata: [
                'author_id' => $snippet->user_id,
                'author_name' => $snippet->user?->name,
                'language' => $snippet->language,
                'last_run_status' => $snippet->last_run_status,
            ],
            sourceUpdatedAt: $snippet->updated_at,
            force: $force,
            requestedById: $requestedById,
        );
    }

    private function indexPublications(array &$stats, bool $force, ?int $requestedById): void
    {
        Publication::query()->published()->with(['author', 'tags', 'blocks'])->chunkById(50, function ($items) use (&$stats, $force, $requestedById) {
            foreach ($items as $publication) {
                $this->countResult($stats, $this->indexPublication($publication, $force, $requestedById));
            }
        });
    }

    private function indexQuestions(array &$stats, bool $force, ?int $requestedById): void
    {
        IssueQuestion::query()->published()->with(['author', 'tags', 'blocks'])->chunkById(50, function ($items) use (&$stats, $force, $requestedById) {
            foreach ($items as $question) {
                $this->countResult($stats, $this->indexQuestion($question, $force, $requestedById));
            }
        });
    }

    private function indexAnswers(array &$stats, bool $force, ?int $requestedById): void
    {
        IssueAnswer::query()->published()->with(['author', 'blocks', 'question.tags'])->chunkById(50, function ($items) use (&$stats, $force, $requestedById) {
            foreach ($items as $answer) {
                $this->countResult($stats, $this->indexAnswer($answer, $force, $requestedById));
            }
        });
    }

    private function indexCodeSnippets(array &$stats, bool $force, ?int $requestedById): void
    {
        CodeSnippet::query()->where('visibility', 'public')->with('user')->chunkById(50, function ($items) use (&$stats, $force, $requestedById) {
            foreach ($items as $snippet) {
                $this->countResult($stats, $this->indexCodeSnippet($snippet, $force, $requestedById));
            }
        });
    }

    private function countResult(array &$stats, ?AiKnowledgeDocument $document): void
    {
        if (! $document) {
            $stats['removed']++;
            return;
        }

        if ($document->wasChanged('indexed_at') || $document->wasRecentlyCreated) {
            $stats['indexed']++;
        } else {
            $stats['skipped']++;
        }
    }

    private function sourceModel(string $sourceType, int $sourceId): ?Model
    {
        return match ($this->normalizeSourceType($sourceType)) {
            'publication' => Publication::withTrashed()->find($sourceId),
            'question' => IssueQuestion::withTrashed()->find($sourceId),
            'answer' => IssueAnswer::query()->find($sourceId),
            'snippet' => CodeSnippet::query()->find($sourceId),
            default => null,
        };
    }

    private function normalizeSourceType(string $sourceType): string
    {
        return match ($sourceType) {
            'publications' => 'publication',
            'issue_question', 'questions' => 'question',
            'issue_answer', 'answers' => 'answer',
            'code_snippet', 'snippets' => 'snippet',
            default => $sourceType,
        };
    }

    /**
     * @param array<int, mixed> $blocks
     */
    private function blocksToText(array $blocks): string
    {
        return collect($blocks)
            ->map(fn ($content) => $this->flattenContent($content))
            ->filter()
            ->implode("\n\n");
    }

    private function flattenContent(mixed $value): string
    {
        if (is_string($value) || is_numeric($value)) {
            return trim((string) $value);
        }

        if (is_array($value)) {
            return collect($value)
                ->map(fn ($item) => $this->flattenContent($item))
                ->filter()
                ->implode("\n");
        }

        return '';
    }

    /**
     * @param array<int, array<string, mixed>> $tags
     * @param array<string, mixed> $metadata
     */
    private function storeDocument(
        string $sourceType,
        int $sourceId,
        string $title,
        ?string $url,
        string $text,
        array $tags,
        array $metadata,
        mixed $sourceUpdatedAt = null,
        bool $force = false,
        ?int $requestedById = null,
    ): AiKnowledgeDocument {
        $embedding = $this->settings->embeddingConfig();
        $provider = $embedding['provider'];
        $model = $embedding['model'];
        $dimensions = $this->embeddings->dimensions();
        $contentHash = hash('sha256', json_encode([
            $sourceType,
            $sourceId,
            $title,
            $url,
            $text,
            $tags,
            $metadata,
            $provider,
            $model,
            $dimensions,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        $document = AiKnowledgeDocument::query()->firstOrNew([
            'source_type' => $sourceType,
            'source_id' => $sourceId,
        ]);

        if (! $force && $document->exists && $document->status === 'indexed' && $document->content_hash === $contentHash) {
            return $document;
        }

        $document->fill([
            'title' => Str::limit($title, 250, ''),
            'url' => $url,
            'status' => 'indexing',
            'content_hash' => $contentHash,
            'language' => $metadata['language'] ?? null,
            'tags' => $tags,
            'metadata' => $metadata,
            'source_updated_at' => $sourceUpdatedAt,
            'last_error' => null,
            'embedding_provider' => $provider,
            'embedding_model' => $model,
            'embedding_dimensions' => $dimensions,
            'reindexed_by_id' => $requestedById,
        ])->save();

        $document->chunks()->delete();
        $chunks = $this->splitIntoChunks($text);

        foreach ($chunks as $index => $chunkText) {
            $chunkTitle = count($chunks) > 1
                ? $title . ' · часть ' . ($index + 1)
                : $title;

            $chunkHash = hash('sha256', $contentHash . '|' . $index . '|' . $chunkText);
            $embedding = $this->embeddings->embed($title . "\n" . $chunkText);
            $payload = [
                'ai_knowledge_document_id' => $document->id,
                'source_type' => $sourceType,
                'source_id' => $sourceId,
                'chunk_index' => $index,
                'title' => Str::limit($chunkTitle, 250, ''),
                'content' => $chunkText,
                'search_text' => $title . "\n" . $chunkText . "\n" . collect($tags)->pluck('name')->implode(' '),
                'content_hash' => $chunkHash,
                'embedding' => $embedding,
                'token_count' => $this->embeddings->tokenCount($chunkText),
                'embedding_provider' => $provider,
                'embedding_model' => $model,
                'embedding_dimensions' => $dimensions,
                'metadata' => $metadata,
                'indexed_at' => now(),
            ];

            if ((string) config('ai.vector.driver', 'json') === 'pgvector' && Schema::hasColumn('ai_knowledge_chunks', 'embedding_vector')) {
                $payload['embedding_vector'] = $embedding;
            }

            AiKnowledgeChunk::query()->create($payload);
        }

        $document->forceFill([
            'status' => 'indexed',
            'chunks_count' => count($chunks),
            'indexed_at' => now(),
            'last_error' => null,
        ])->save();

        return $document;
    }

    /**
     * @return array<int, string>
     */
    private function splitIntoChunks(string $text): array
    {
        $text = trim(preg_replace("/\n{3,}/", "\n\n", $text) ?: '');

        if ($text === '') {
            return [];
        }

        $max = 1500;
        $overlap = 180;
        $chunks = [];
        $position = 0;
        $length = mb_strlen($text);

        while ($position < $length) {
            $slice = mb_substr($text, $position, $max);
            $lastBreak = mb_strrpos($slice, "\n\n");

            if ($lastBreak !== false && mb_strlen($slice) > $max * 0.65) {
                $slice = mb_substr($slice, 0, $lastBreak);
            }

            $slice = trim($slice);
            if ($slice !== '') {
                $chunks[] = $slice;
            }

            $step = max(mb_strlen($slice) - $overlap, 500);
            $position += $step;
        }

        return $chunks;
    }
}
