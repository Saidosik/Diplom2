<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Http\Resources\Issue\IssueQuestionResource;
use App\Http\Resources\PublicationResource;
use App\Models\IssueQuestion;
use App\Models\Publication;
use App\Models\Tag;
use App\Services\Ai\GroundedAnswerService;
use App\Services\Ai\RagSearchService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class AiAssistantController extends Controller
{
    public function search(Request $request): JsonResponse
    {
        $data = $request->validate([
            'query' => ['required', 'string', 'min:2', 'max:300'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:20'],
        ]);

        $query = trim($data['query']);
        $limit = (int) ($data['limit'] ?? 8);
        $terms = $this->extractTerms($query);

        $publications = $this->searchPublications($terms, $limit);
        $questions = $this->searchQuestions($terms, $limit);
        $tags = $this->searchTags($terms, 10);

        return response()->json([
            'query' => $query,
            'terms' => $terms,
            'results' => [
                'publications' => PublicationResource::collection($publications),
                'questions' => IssueQuestionResource::collection($questions),
                'tags' => $tags,
            ],
            'suggested_filters' => $tags->take(6)->map(fn (array $tag) => $tag['name'])->values(),
        ]);
    }

    public function searchAnswer(Request $request, RagSearchService $rag, GroundedAnswerService $answers): JsonResponse
    {
        $data = $request->validate([
            'query' => ['required', 'string', 'min:2', 'max:500'],
            'type' => ['nullable', 'in:all,publication,question,answer,snippet'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:12'],
            'model' => ['nullable', 'string', 'max:160'],
        ]);

        $query = trim($data['query']);
        $result = $rag->search($query, [
            'type' => $data['type'] ?? 'all',
            'limit' => $data['limit'] ?? 8,
        ]);
        $answer = $answers->answer($query, $result['data'] ?? [], 'search', [
            'model' => $data['model'] ?? null,
            'use_rag' => true,
            'context_scope' => $data['type'] ?? 'all',
        ]);

        return response()->json([
            'answer' => $answer['answer'],
            'sources' => $result['data'] ?? [],
            'meta' => [
                'provider' => $answer['provider'],
                'used_external_provider' => $answer['used_external_provider'],
                'rag' => $result['meta'] ?? [],
                'model' => $data['model'] ?? null,
            ],
        ]);
    }

    public function questionAssist(Request $request, RagSearchService $rag): JsonResponse
    {
        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:180'],
            'excerpt' => ['nullable', 'string', 'max:1000'],
            'tags' => ['nullable', 'array', 'max:12'],
            'tags.*' => ['string', 'max:48'],
            'blocks' => ['nullable', 'array', 'max:80'],
            'question_id' => ['nullable', 'integer'],
        ]);

        $text = trim(($data['title'] ?? '') . ' ' . ($data['excerpt'] ?? '') . ' ' . $this->blocksText($data['blocks'] ?? []));
        $terms = $this->extractTerms($text);
        $tags = $this->mergeTags($data['tags'] ?? [], $terms, 8);
        $similar = $this->searchQuestions($terms, 5);
        $ragResult = $rag->search($text !== '' ? $text : implode(' ', $terms), ['type' => 'all', 'limit' => 8]);
        $duplicates = $rag->search($text !== '' ? $text : implode(' ', $terms), ['type' => 'question', 'limit' => 6]);
        $duplicateQuestions = collect($duplicates['data'] ?? [])
            ->filter(fn (array $source) => (float) ($source['score'] ?? 0) >= 0.38 && (int) ($source['source_id'] ?? 0) !== (int) ($data['question_id'] ?? 0))
            ->values()
            ->all();

        return response()->json([
            'suggested_title' => $this->questionTitle($data['title'] ?? '', $terms),
            'suggested_excerpt' => $this->excerpt($text, 'Нужно разобраться с проблемой и найти причину некорректного поведения.'),
            'suggested_tags' => $tags,
            'quality_checklist' => $this->questionChecklist($text),
            'missing_details' => $this->missingQuestionDetails($text),
            'similar_questions' => IssueQuestionResource::collection($similar),
            'rag_sources' => $ragResult['data'] ?? [],
            'duplicate_questions' => $duplicateQuestions,
            'duplicate_risk' => $this->duplicateRisk($duplicateQuestions),
            'rag_meta' => $ragResult['meta'] ?? [],
        ]);
    }

    public function publicationAssist(Request $request, RagSearchService $rag): JsonResponse
    {
        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:180'],
            'excerpt' => ['nullable', 'string', 'max:1000'],
            'tags' => ['nullable', 'array', 'max:12'],
            'blocks' => ['nullable', 'array', 'max:100'],
            'publication_id' => ['nullable', 'integer'],
        ]);

        $text = trim(($data['title'] ?? '') . ' ' . ($data['excerpt'] ?? '') . ' ' . $this->blocksText($data['blocks'] ?? []));
        $terms = $this->extractTerms($text);
        $tags = $this->mergeTags($data['tags'] ?? [], $terms, 10);
        $similar = $this->searchPublications($terms, 5);
        $ragResult = $rag->search($text !== '' ? $text : implode(' ', $terms), ['type' => 'all', 'limit' => 10]);
        $publicationSources = $rag->search($text !== '' ? $text : implode(' ', $terms), ['type' => 'publication', 'limit' => 6]);

        return response()->json([
            'suggested_title' => $this->publicationTitle($data['title'] ?? '', $terms),
            'suggested_excerpt' => $this->excerpt($text, 'Краткий разбор темы с практическими выводами для разработчиков.'),
            'suggested_tags' => $tags,
            'outline' => $this->publicationOutline($terms),
            'editor_hints' => $this->publicationHints($text),
            'similar_publications' => PublicationResource::collection($similar),
            'rag_sources' => $ragResult['data'] ?? [],
            'source_suggestions' => $this->sourceSuggestions($ragResult['data'] ?? []),
            'similar_publication_sources' => $publicationSources['data'] ?? [],
            'rag_meta' => $ragResult['meta'] ?? [],
        ]);
    }

    public function questionDuplicates(Request $request, RagSearchService $rag): JsonResponse
    {
        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:180'],
            'excerpt' => ['nullable', 'string', 'max:1000'],
            'blocks' => ['nullable', 'array', 'max:80'],
            'question_id' => ['nullable', 'integer'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:12'],
        ]);

        $text = trim(($data['title'] ?? '') . ' ' . ($data['excerpt'] ?? '') . ' ' . $this->blocksText($data['blocks'] ?? []));
        $result = $rag->search($text, [
            'type' => 'question',
            'limit' => $data['limit'] ?? 8,
        ]);

        $items = collect($result['data'] ?? [])
            ->filter(fn (array $source) => (int) ($source['source_id'] ?? 0) !== (int) ($data['question_id'] ?? 0))
            ->values()
            ->all();

        return response()->json([
            'data' => $items,
            'duplicate_risk' => $this->duplicateRisk($items),
            'meta' => $result['meta'] ?? [],
        ]);
    }

    public function contentSources(Request $request, RagSearchService $rag): JsonResponse
    {
        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:180'],
            'excerpt' => ['nullable', 'string', 'max:1200'],
            'blocks' => ['nullable', 'array', 'max:120'],
            'type' => ['nullable', 'in:all,publication,question,answer,snippet'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:12'],
        ]);

        $text = trim(($data['title'] ?? '') . ' ' . ($data['excerpt'] ?? '') . ' ' . $this->blocksText($data['blocks'] ?? []));
        $result = $rag->search($text, [
            'type' => $data['type'] ?? 'all',
            'limit' => $data['limit'] ?? 8,
        ]);
        $sources = $result['data'] ?? [];

        return response()->json([
            'data' => $sources,
            'suggestions' => $this->sourceSuggestions($sources),
            'markdown' => $this->sourcesMarkdown($sources),
            'blocks' => [[
                'type' => 'markdown',
                'sort_order' => 0,
                'content' => ['text' => $this->sourcesMarkdown($sources)],
            ]],
            'meta' => $result['meta'] ?? [],
        ]);
    }

    public function draftAnswerFromQuestion(Request $request, RagSearchService $rag, GroundedAnswerService $answers): JsonResponse
    {
        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:180'],
            'excerpt' => ['nullable', 'string', 'max:1000'],
            'tags' => ['nullable', 'array', 'max:12'],
            'tags.*' => ['string', 'max:48'],
            'blocks' => ['nullable', 'array', 'max:80'],
        ]);

        $text = trim(($data['title'] ?? '') . ' ' . ($data['excerpt'] ?? '') . ' ' . implode(' ', $data['tags'] ?? []) . ' ' . $this->blocksText($data['blocks'] ?? []));
        $result = $rag->search($text, ['type' => 'all', 'limit' => 8]);
        $answer = $answers->answer($text, $result['data'] ?? [], 'editor_answer_draft');

        return response()->json([
            'is_ai_generated' => true,
            'label' => 'Предварительный ответ от ИИ',
            'disclaimer' => 'Ответ сформирован по черновику вопроса и материалам платформы. Перед публикацией проверьте команды, версии библиотек и ограничения окружения.',
            'answer' => $answer['answer'],
            'blocks' => [[
                'type' => 'markdown',
                'sort_order' => 0,
                'content' => ['text' => $answer['answer']],
            ]],
            'sources' => $result['data'] ?? [],
            'meta' => [
                'provider' => $answer['provider'],
                'used_external_provider' => $answer['used_external_provider'],
                'rag' => $result['meta'] ?? [],
            ],
        ]);
    }

    public function answerDraft(Request $request, IssueQuestion $issueQuestion, RagSearchService $rag, GroundedAnswerService $answers): JsonResponse
    {
        $issueQuestion->load(['tags', 'blocks']);
        $text = trim($issueQuestion->title . ' ' . ($issueQuestion->excerpt ?? '') . ' ' . $this->blocksText($issueQuestion->blocks?->toArray() ?? []));
        $ragResult = $rag->search($text, ['type' => 'all', 'limit' => 6]);
        $answer = $answers->answer($text, $ragResult['data'] ?? [], 'answer_draft');

        return response()->json([
            'is_ai_generated' => true,
            'label' => 'Ответ от ИИ',
            'disclaimer' => 'Ответ сформирован автоматически на основе вопроса, RAG-индекса и материалов сообщества. Проверьте команды, версии библиотек и настройки окружения перед применением.',
            'blocks' => [
                [
                    'type' => 'markdown',
                    'sort_order' => 0,
                    'content' => [
                        'text' => $answer['answer'],
                    ],
                ],
            ],
            'sources' => $ragResult['data'] ?? [],
            'meta' => [
                'provider' => $answer['provider'],
                'used_external_provider' => $answer['used_external_provider'],
                'rag' => $ragResult['meta'] ?? [],
            ],
        ]);
    }

    private function searchPublications(array $terms, int $limit)
    {
        return Publication::query()
            ->published()
            ->with(['author', 'tags'])
            ->withCount(['comments', 'savedItems'])
            ->when($terms !== [], fn (Builder $builder) => $this->whereTerms($builder, ['title', 'excerpt'], $terms))
            ->latest('published_at')
            ->limit($limit)
            ->get();
    }

    private function searchQuestions(array $terms, int $limit)
    {
        return IssueQuestion::query()
            ->published()
            ->with(['author', 'tags'])
            ->withCount(['answers'])
            ->when($terms !== [], fn (Builder $builder) => $this->whereTerms($builder, ['title', 'excerpt'], $terms))
            ->latest('published_at')
            ->limit($limit)
            ->get();
    }

    private function searchTags(array $terms, int $limit)
    {
        return Tag::query()
            ->when($terms !== [], function (Builder $builder) use ($terms) {
                $builder->where(function (Builder $query) use ($terms) {
                    foreach ($terms as $term) {
                        $query->orWhere('name', 'ilike', "%{$term}%")
                            ->orWhere('slug', 'ilike', "%{$term}%");
                    }
                });
            })
            ->withCount(['publications', 'issueQuestions'])
            ->limit($limit)
            ->get()
            ->map(fn (Tag $tag) => [
                'id' => $tag->id,
                'name' => $tag->name,
                'slug' => $tag->slug,
                'usage_count' => (int) ($tag->publications_count + $tag->issue_questions_count),
            ]);
    }

    private function whereTerms(Builder $builder, array $columns, array $terms): void
    {
        $builder->where(function (Builder $query) use ($columns, $terms) {
            foreach ($terms as $term) {
                foreach ($columns as $column) {
                    $query->orWhere($column, 'ilike', "%{$term}%");
                }
            }
        });
    }

    private function extractTerms(string $text): array
    {
        $text = Str::lower(strip_tags($text));
        preg_match_all('/[a-zа-яё0-9][a-zа-яё0-9_+#.-]{1,}/iu', $text, $matches);

        $stop = ['как', 'что', 'это', 'для', 'или', 'при', 'если', 'the', 'and', 'with', 'без', 'мне', 'надо', 'нужно', 'почему', 'ошибка'];

        return collect($matches[0] ?? [])
            ->map(fn (string $term) => trim($term, '.,:;()[]{}'))
            ->filter(fn (string $term) => mb_strlen($term) >= 2 && ! in_array($term, $stop, true))
            ->unique()
            ->take(12)
            ->values()
            ->all();
    }

    private function mergeTags(array $currentTags, array $terms, int $limit): array
    {
        $existing = $this->searchTags($terms, $limit)->pluck('name')->all();

        return collect($currentTags)
            ->merge($existing)
            ->merge($terms)
            ->map(fn ($tag) => trim((string) $tag))
            ->filter(fn (string $tag) => mb_strlen($tag) >= 2)
            ->unique(fn (string $tag) => Str::lower($tag))
            ->take($limit)
            ->values()
            ->all();
    }

    private function blocksText(array $blocks): string
    {
        return collect($blocks)
            ->map(function (array $block) {
                $content = $block['content'] ?? [];

                return collect(['text', 'code', 'caption', 'alt', 'title', 'url'])
                    ->map(fn (string $key) => Arr::get($content, $key))
                    ->filter(fn ($value) => is_string($value) && trim($value) !== '')
                    ->join(' ');
            })
            ->filter()
            ->join(' ');
    }

    /**
     * @param array<int, array<string, mixed>> $sources
     */
    private function duplicateRisk(array $sources): string
    {
        $topScore = (float) collect($sources)->max('score');

        if ($topScore >= 0.62) {
            return 'high';
        }

        if ($topScore >= 0.45) {
            return 'medium';
        }

        return 'low';
    }

    /**
     * @param array<int, array<string, mixed>> $sources
     * @return array<int, array<string, mixed>>
     */
    private function sourceSuggestions(array $sources): array
    {
        return collect($sources)
            ->take(6)
            ->map(fn (array $source) => [
                'title' => (string) ($source['title'] ?? 'Материал'),
                'href' => $source['href'] ?? null,
                'type' => (string) ($source['type'] ?? 'source'),
                'excerpt' => Str::limit((string) ($source['content'] ?? ''), 220),
                'score' => (float) ($source['score'] ?? 0),
            ])
            ->values()
            ->all();
    }

    /**
     * @param array<int, array<string, mixed>> $sources
     */
    private function sourcesMarkdown(array $sources): string
    {
        if ($sources === []) {
            return "## Источники\n\nМатериалы по теме не найдены.";
        }

        $lines = ['## Источники из базы знаний', ''];

        foreach (array_slice($sources, 0, 6) as $index => $source) {
            $title = (string) ($source['title'] ?? 'Материал');
            $href = (string) ($source['href'] ?? '');
            $content = Str::limit(trim(preg_replace('/\s+/u', ' ', strip_tags((string) ($source['content'] ?? ''))) ?: ''), 180);
            $line = ($index + 1) . '. ' . ($href !== '' ? "[{$title}]({$href})" : $title);
            if ($content !== '') {
                $line .= " — {$content}";
            }
            $lines[] = $line;
        }

        return implode("\n", $lines);
    }

    private function questionTitle(string $title, array $terms): string
    {
        $title = trim($title);
        if (mb_strlen($title) >= 24 && Str::contains($title, '?')) {
            return $title;
        }

        $topic = $terms[0] ?? 'код';
        $context = $terms[1] ?? 'проекте';

        return "Почему {$topic} не работает в {$context}?";
    }

    private function publicationTitle(string $title, array $terms): string
    {
        $title = trim($title);
        if (mb_strlen($title) >= 16) {
            return $title;
        }

        $topic = $terms[0] ?? 'архитектуры';

        return "Практический разбор {$topic}: подход, реализация и выводы";
    }

    private function excerpt(string $text, string $fallback): string
    {
        $clean = trim(preg_replace('/\s+/u', ' ', strip_tags($text)) ?? '');

        return $clean !== '' ? Str::limit($clean, 220) : $fallback;
    }

    private function questionChecklist(string $text): array
    {
        return [
            ['label' => 'Понятная формулировка проблемы', 'passed' => mb_strlen($text) >= 80],
            ['label' => 'Есть фрагмент кода или конфигурации', 'passed' => Str::contains($text, ['<?php', 'function', 'const ', 'class ', 'QUEUE_', 'config'])],
            ['label' => 'Указано ожидаемое поведение', 'passed' => Str::contains(Str::lower($text), ['ожид', 'долж', 'expected'])],
            ['label' => 'Указан фактический результат или ошибка', 'passed' => Str::contains(Str::lower($text), ['ошиб', 'error', 'exception', 'не работает', 'получаю'])],
        ];
    }

    private function missingQuestionDetails(string $text): array
    {
        $lower = Str::lower($text);
        $missing = [];

        if (! Str::contains($lower, ['версия', 'version', 'laravel 13', 'next.js', 'postgresql'])) {
            $missing[] = 'указать версии фреймворков, базы данных и окружения';
        }
        if (! Str::contains($lower, ['ошибка', 'error', 'exception', 'stack trace'])) {
            $missing[] = 'добавить точный текст ошибки или лог';
        }
        if (! Str::contains($lower, ['пробовал', 'проверил', 'already tried'])) {
            $missing[] = 'описать, что уже было проверено';
        }

        return $missing;
    }

    private function publicationOutline(array $terms): array
    {
        $topic = $terms[0] ?? 'темы';

        return [
            "Контекст и проблема {$topic}",
            'Архитектурное решение',
            'Ключевые участки реализации',
            'Ошибки и ограничения',
            'Итоги и возможные улучшения',
        ];
    }

    private function publicationHints(string $text): array
    {
        $hints = [];

        if (! Str::contains($text, ['```', '<?php', 'const ', 'function ', 'class '])) {
            $hints[] = 'Добавить кодовый блок с ключевым фрагментом реализации.';
        }
        if (mb_strlen($text) < 800) {
            $hints[] = 'Расширить материал: добавить контекст, решение, результат и выводы.';
        }
        if (! Str::contains(Str::lower($text), ['вывод', 'итог', 'заключение'])) {
            $hints[] = 'Добавить финальный блок с выводами.';
        }

        return $hints;
    }

    private function answerMarkdown(IssueQuestion $question, array $terms): string
    {
        $tagList = $question->tags->pluck('name')->join(', ');
        $focus = $tagList !== '' ? $tagList : implode(', ', array_slice($terms, 0, 4));

        return <<<MD
**Ответ от ИИ.** Ниже — предварительная гипотеза по вопросу «{$question->title}».

1. Проверьте конфигурацию и версии окружения: {$focus}.
2. Сравните ожидаемое поведение с фактической ошибкой или логом.
3. Изолируйте минимальный фрагмент кода, на котором проблема повторяется.
4. Проверьте связанные настройки кеша, очередей, переменных окружения и прав доступа.

Если проблема связана с Laravel/Redis/PostgreSQL, дополнительно проверьте `.env`, конфигурационные файлы, состояние очередей и актуальность миграций.
MD;
    }
}
