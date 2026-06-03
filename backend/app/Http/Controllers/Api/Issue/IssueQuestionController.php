<?php

namespace App\Http\Controllers\Api\Issue;

use App\Events\IssueAnswerChanged;
use App\Enums\IssueQuestionStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Issue\StoreIssueQuestionRequest;
use App\Http\Requests\Issue\UpdateIssueQuestionRequest;
use App\Http\Resources\Issue\IssueQuestionResource;
use App\Jobs\GenerateAiQuestionAnswerJob;
use App\Models\IssueAnswer;
use App\Models\IssueQuestion;
use App\Models\Reaction;
use App\Models\Tag;
use App\Models\UserFile;
use App\Services\Community\CommunityActivityService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class IssueQuestionController extends Controller
{
    public function index(Request $request)
    {
        $query = IssueQuestion::query()
            ->published()
            ->with(['author', 'tags'])
            ->withCount([
                'answers' => fn ($builder) => $builder->published(),
                'reactions as likes_count' => fn (Builder $query) => $query->where('type', Reaction::LIKE),
                'reactions as dislikes_count' => fn (Builder $query) => $query->where('type', Reaction::DISLIKE),
                'savedItems',
            ])
            ->latest('published_at');

        if ($search = trim((string) $request->query('search'))) {
            $query->where(function ($builder) use ($search) {
                $builder->where('title', 'ilike', "%{$search}%")
                    ->orWhere('excerpt', 'ilike', "%{$search}%");
            });
        }

        if ($tag = trim((string) $request->query('tag'))) {
            $tagSlug = Str::slug($tag);
            $query->whereHas('tags', function (Builder $builder) use ($tag, $tagSlug) {
                $builder->where('slug', $tag)
                    ->when($tagSlug !== '', fn (Builder $query) => $query->orWhere('slug', $tagSlug))
                    ->orWhere('name', 'ilike', $tag);
            });
        }

        if ($request->query('filter') === 'solved') {
            $query->where('is_solved', true);
        }

        if ($request->query('filter') === 'unanswered') {
            $query->doesntHave('answers');
        }

        if ($request->query('filter') === 'unsolved') {
            $query->where('is_solved', false);
        }

        $perPage = min(max((int) $request->query('per_page', 12), 1), 50);

        return IssueQuestionResource::collection($query->paginate($perPage));
    }

    public function myIndex(Request $request)
    {
        $query = IssueQuestion::query()
            ->where('author_id', $request->user()->id)
            ->with(['author', 'tags'])
            ->with(['reactions' => fn ($builder) => $builder->where('user_id', $request->user()->id)])
            ->with(['savedItems' => fn ($builder) => $builder->where('user_id', $request->user()->id)])
            ->withCount([
                'answers' => fn ($builder) => $builder->published(),
                'reactions as likes_count' => fn (Builder $query) => $query->where('type', Reaction::LIKE),
                'reactions as dislikes_count' => fn (Builder $query) => $query->where('type', Reaction::DISLIKE),
                'savedItems',
            ])
            ->latest('updated_at');

        if ($status = $request->query('status')) {
            if (in_array($status, IssueQuestionStatus::values(), true)) {
                $query->where('status', $status);
            }
        }

        $perPage = min(max((int) $request->query('per_page', 12), 1), 50);

        return IssueQuestionResource::collection($query->paginate($perPage));
    }

    public function show(Request $request, string $issueQuestion)
    {
        $question = IssueQuestion::query()
            ->published()
            ->with([
                'author',
                'tags',
                'blocks',
                'attachments.userFile',
                'answers' => fn ($builder) => $builder->published()
                    ->with(['author', 'blocks', 'question'])
                    ->with(['savedItems' => fn ($savedBuilder) => $request->user() ? $savedBuilder->where('user_id', $request->user()->id) : $savedBuilder->whereRaw('1 = 0')])
                    ->withCount(['comments', 'savedItems'])
                    ->orderByDesc('is_accepted')
                    ->oldest(),
            ])
            ->with(['reactions' => fn ($builder) => $request->user() ? $builder->where('user_id', $request->user()->id) : $builder->whereRaw('1 = 0')])
            ->with(['savedItems' => fn ($builder) => $request->user() ? $builder->where('user_id', $request->user()->id) : $builder->whereRaw('1 = 0')])
            ->withCount([
                'answers' => fn ($builder) => $builder->published(),
                'reactions as likes_count' => fn (Builder $query) => $query->where('type', Reaction::LIKE),
                'reactions as dislikes_count' => fn (Builder $query) => $query->where('type', Reaction::DISLIKE),
                'savedItems',
            ])
            ->where('slug', $issueQuestion)
            ->firstOrFail();

        $question->increment('views_count');

        return new IssueQuestionResource($question);
    }

    public function edit(Request $request, IssueQuestion $issueQuestion)
    {
        $this->authorizeQuestion($request, $issueQuestion);

        return new IssueQuestionResource(
            $issueQuestion->load(['author', 'tags', 'blocks', 'attachments.userFile'])
                ->load(['reactions' => fn ($builder) => $builder->where('user_id', $request->user()->id)])
                ->load(['savedItems' => fn ($builder) => $builder->where('user_id', $request->user()->id)])
                ->loadCount([
                    'answers' => fn ($builder) => $builder->published(),
                    'reactions as likes_count' => fn (Builder $query) => $query->where('type', Reaction::LIKE),
                    'reactions as dislikes_count' => fn (Builder $query) => $query->where('type', Reaction::DISLIKE),
                    'savedItems',
                ])
        );
    }

    public function store(StoreIssueQuestionRequest $request, CommunityActivityService $community)
    {
        $question = DB::transaction(function () use ($request) {
            $data = $request->validated();
            $status = IssueQuestionStatus::from($data['status']);

            $question = IssueQuestion::query()->create([
                'author_id' => $request->user()->id,
                'title' => $data['title'],
                'slug' => $this->makeUniqueSlug($data['slug'] ?? $data['title']),
                'excerpt' => $this->normalizeExcerpt($data),
                'status' => $data['status'],
                'published_at' => $status === IssueQuestionStatus::Published ? now() : null,
            ]);

            $this->syncBlocks($question, $data['blocks']);
            $this->syncTags($question, $data['tags'] ?? []);
            $this->syncAttachments($question, $data['attachment_ids'] ?? [], (int) $request->user()->id);

            return $question;
        });

        app(\App\Services\Ai\AiIndexingDispatcher::class)->queue('question', (int) $question->id, false, $request->user()->id);

        if ($question->status === IssueQuestionStatus::Published && (bool) config('ai.question_auto_answer.enabled', true)) {
            GenerateAiQuestionAnswerJob::dispatch((int) $question->id)->onQueue(config('ai.indexing.queue', 'ai-index'));
        }

        if ($question->status === IssueQuestionStatus::Published) {
            $community->record(
                $request->user(),
                CommunityActivityService::ACTIVITY_QUESTION_CREATED,
                $question,
                null,
                ['question_id' => $question->id],
                "{$request->user()->name} задал вопрос",
                $question->title,
                "/questions/{$question->slug}",
                10
            );

            $community->awardReputation(
                $request->user(),
                4,
                CommunityActivityService::REASON_QUESTION_CREATED,
                $question
            );
        }

        return (new IssueQuestionResource($question->load(['author', 'tags', 'blocks', 'attachments.userFile'])))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateIssueQuestionRequest $request, IssueQuestion $issueQuestion, CommunityActivityService $community)
    {
        $this->authorizeQuestion($request, $issueQuestion);

        $question = DB::transaction(function () use ($request, $issueQuestion) {
            $data = $request->validated();
            $status = IssueQuestionStatus::from($data['status']);

            $issueQuestion->update([
                'title' => $data['title'],
                'slug' => $this->makeUniqueSlug($data['slug'] ?? $issueQuestion->slug ?? $data['title'], $issueQuestion->id),
                'excerpt' => $this->normalizeExcerpt($data),
                'status' => $data['status'],
                'published_at' => $status === IssueQuestionStatus::Published
                    ? ($issueQuestion->published_at ?? now())
                    : null,
            ]);

            $this->syncBlocks($issueQuestion, $data['blocks']);
            $this->syncTags($issueQuestion, $data['tags'] ?? []);

            return $issueQuestion;
        });

        app(\App\Services\Ai\AiIndexingDispatcher::class)->queue('question', (int) $question->id, true, $request->user()->id);

        if ($question->status === IssueQuestionStatus::Published && $question->wasChanged('published_at')) {
            $community->record(
                $request->user(),
                CommunityActivityService::ACTIVITY_QUESTION_CREATED,
                $question,
                null,
                ['question_id' => $question->id],
                "{$request->user()->name} задал вопрос",
                $question->title,
                "/questions/{$question->slug}",
                10
            );
        }

        return new IssueQuestionResource($question->load(['author', 'tags', 'blocks', 'attachments.userFile']));
    }

    public function destroy(Request $request, IssueQuestion $issueQuestion): JsonResponse
    {
        $this->authorizeQuestion($request, $issueQuestion);

        $issueQuestion->delete();
        app(\App\Services\Ai\AiIndexingDispatcher::class)->queue('question', (int) $issueQuestion->id, true, $request->user()->id);

        return response()->json([
            'message' => 'Вопрос удалён.',
        ]);
    }

    public function acceptAnswer(Request $request, IssueQuestion $issueQuestion, IssueAnswer $issueAnswer, CommunityActivityService $community)
    {
        $this->authorizeQuestion($request, $issueQuestion);

        abort_unless(
            $issueAnswer->issue_question_id === $issueQuestion->id,
            404,
            'Ответ не относится к этому вопросу.'
        );

        DB::transaction(function () use ($issueQuestion, $issueAnswer) {
            IssueAnswer::query()
                ->where('issue_question_id', $issueQuestion->id)
                ->update(['is_accepted' => false]);

            $issueAnswer->update(['is_accepted' => true]);

            $issueQuestion->update([
                'accepted_answer_id' => $issueAnswer->id,
                'is_solved' => true,
            ]);
        });

        $issueAnswer->loadMissing(['author', 'question']);

        $community->record(
            $request->user(),
            CommunityActivityService::ACTIVITY_ANSWER_ACCEPTED,
            $issueAnswer,
            $issueQuestion,
            ['question_id' => $issueQuestion->id, 'answer_id' => $issueAnswer->id],
            'Ответ выбран решением',
            $issueQuestion->title,
            "/questions/{$issueQuestion->slug}#answer-{$issueAnswer->id}",
            18
        );

        if ($issueAnswer->author) {
            $community->awardReputation(
                $issueAnswer->author,
                15,
                CommunityActivityService::REASON_ANSWER_ACCEPTED,
                $issueAnswer,
                $request->user()
            );

            $community->notify(
                $issueAnswer->author,
                'answer_accepted',
                'Ответ выбран решением',
                "Ваш ответ на вопрос «{$issueQuestion->title}» выбран лучшим.",
                "/questions/{$issueQuestion->slug}",
                ['question_id' => $issueQuestion->id, 'answer_id' => $issueAnswer->id],
                $request->user()
            );
        }

        app(\App\Services\Ai\AiIndexingDispatcher::class)->queue('question', (int) $issueQuestion->id, true, $request->user()->id);
        app(\App\Services\Ai\AiIndexingDispatcher::class)->queue('answer', (int) $issueAnswer->id, true, $request->user()->id);
        broadcast(new IssueAnswerChanged('accepted', $issueAnswer))->toOthers();

        return new IssueQuestionResource(
            $issueQuestion->fresh()->load([
                'author',
                'tags',
                'blocks',
                'attachments.userFile',
                'answers' => fn ($builder) => $builder->published()
                    ->with(['author', 'blocks', 'question'])
                    ->with(['savedItems' => fn ($savedBuilder) => $request->user() ? $savedBuilder->where('user_id', $request->user()->id) : $savedBuilder->whereRaw('1 = 0')])
                    ->withCount(['comments', 'savedItems'])
                    ->orderByDesc('is_accepted')
                    ->oldest(),
            ])->load(['reactions' => fn ($builder) => $builder->where('user_id', $request->user()->id)])
                ->load(['savedItems' => fn ($builder) => $builder->where('user_id', $request->user()->id)])
                ->loadCount([
                'answers' => fn ($builder) => $builder->published(),
                'reactions as likes_count' => fn (Builder $query) => $query->where('type', Reaction::LIKE),
                'reactions as dislikes_count' => fn (Builder $query) => $query->where('type', Reaction::DISLIKE),
                'savedItems',
            ])
        );
    }

    private function authorizeQuestion(Request $request, IssueQuestion $question): void
    {
        $user = $request->user();

        abort_unless(
            $user && ($question->author_id === $user->id || $user->isAdmin()),
            403,
            'Нет доступа к этому вопросу.'
        );
    }

    /**
     * @param array<int, array<string, mixed>> $blocks
     */
    private function syncBlocks(IssueQuestion $question, array $blocks): void
    {
        $question->blocks()->delete();

        foreach (array_values($blocks) as $index => $block) {
            $question->blocks()->create([
                'type' => $block['type'],
                'sort_order' => $block['sort_order'] ?? $index,
                'content' => $block['content'] ?? [],
            ]);
        }
    }

    /**
     * @param array<int, string> $tags
     */
    private function syncTags(IssueQuestion $question, array $tags): void
    {
        $tagIds = collect($tags)
            ->map(fn ($tag) => trim((string) $tag))
            ->filter()
            ->unique(fn ($tag) => Str::lower($tag))
            ->take(8)
            ->map(function (string $name) {
                $slug = $this->makeUniqueTagSlug($name);

                return Tag::query()->firstOrCreate(
                    ['slug' => $slug],
                    ['name' => $name, 'status' => 'active']
                )->id;
            })
            ->values()
            ->all();

        $question->tags()->sync($tagIds);
    }

    /**
     * @param array<int, int|string> $fileIds
     */
    private function syncAttachments(IssueQuestion $question, array $fileIds, int $userId): void
    {
        $ids = collect($fileIds)
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->unique()
            ->take(12)
            ->values();

        $question->attachments()->delete();

        if ($ids->isEmpty()) {
            return;
        }

        $files = UserFile::query()
            ->where('user_id', $userId)
            ->whereIn('id', $ids->all())
            ->get()
            ->keyBy('id');

        foreach ($ids as $index => $fileId) {
            if (! $files->has($fileId)) {
                continue;
            }

            $question->attachments()->create([
                'user_id' => $userId,
                'user_file_id' => $fileId,
                'sort_order' => $index,
            ]);
        }
    }

    private function makeUniqueSlug(string $value, ?int $ignoreId = null): string
    {
        $base = Str::slug($value);

        if ($base === '') {
            $base = 'question-' . now()->format('YmdHis');
        }

        $slug = $base;
        $counter = 2;

        while (
            IssueQuestion::query()
                ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
                ->where('slug', $slug)
                ->withTrashed()
                ->exists()
        ) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }

    private function makeUniqueTagSlug(string $name): string
    {
        $slug = Str::slug($name);

        if ($slug === '') {
            $slug = Str::lower(Str::ascii($name));
            $slug = preg_replace('/[^a-z0-9]+/i', '-', $slug) ?: 'tag';
            $slug = trim($slug, '-');
        }

        return $slug ?: 'tag';
    }

    /**
     * @param array<string, mixed> $data
     */
    private function normalizeExcerpt(array $data): ?string
    {
        $excerpt = trim((string) ($data['excerpt'] ?? ''));

        if ($excerpt !== '') {
            return $excerpt;
        }

        foreach ($data['blocks'] ?? [] as $block) {
            $text = trim((string) Arr::get($block, 'content.text', ''));

            if ($text !== '') {
                return Str::limit(strip_tags($text), 260);
            }
        }

        return null;
    }
}
