<?php

namespace App\Http\Controllers\Api\Community;

use App\Http\Controllers\Controller;
use App\Http\Resources\Issue\IssueQuestionResource;
use App\Http\Resources\PublicationResource;
use App\Models\Comment;
use App\Models\IssueQuestion;
use App\Models\Publication;
use App\Models\Reaction;
use App\Models\SavedItem;
use App\Models\Subscription;
use App\Models\Tag;
use App\Models\User;
use App\Services\Community\CommunityActivityService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Throwable;

class CommunityDiscoveryController extends Controller
{
    public function discovery(Request $request): JsonResponse
    {
        $period = $this->period($request);
        $since = $this->periodStart($period);
        $user = $this->optionalUser($request);
        $profile = $this->userInterestProfile($user);

        $popularPublications = $this->popularPublications($since, 12);
        $popularQuestions = $this->popularQuestions($since, 12);
        $unansweredQuestions = $this->unansweredQuestions(6);
        $topUsers = $this->topUsers(8);
        $popularTags = $this->popularTags($since, 16);
        $recommendations = $this->buildRecommendations($popularPublications, $popularQuestions, $popularTags, $user, $profile);

        return response()->json([
            'period' => $period,
            'personalized' => $user !== null,
            'stats' => $this->stats(),
            'feed' => $this->buildFeed($popularPublications->take(6), $popularQuestions->take(6), $unansweredQuestions->take(4)),
            'recommendations' => $recommendations,
            'trends' => $this->buildTrends($popularPublications->take(6), $popularQuestions->take(6), $popularTags->take(12)),
            'popular_publications' => PublicationResource::collection($popularPublications->take(6)),
            'actual_questions' => IssueQuestionResource::collection($popularQuestions->merge($unansweredQuestions)->unique('id')->values()->take(8)),
            'unanswered_questions' => IssueQuestionResource::collection($unansweredQuestions),
            'top_users' => $topUsers,
            'popular_tags' => $popularTags,
            'recommendation_meta' => [
                'matched_tags' => $this->matchedTagsPayload($profile),
                'followed_authors_count' => count($profile['author_ids']),
                'signals_count' => $profile['signals_count'],
            ],
        ]);
    }

    public function feed(Request $request): JsonResponse
    {
        $period = $this->period($request);
        $since = $this->periodStart($period);

        return response()->json([
            'period' => $period,
            'data' => $this->buildFeed(
                $this->popularPublications($since, 6),
                $this->popularQuestions($since, 6),
                $this->unansweredQuestions(4),
            ),
        ]);
    }

    public function trends(Request $request): JsonResponse
    {
        $period = $this->period($request);
        $since = $this->periodStart($period);

        return response()->json([
            'period' => $period,
            'data' => $this->buildTrends(
                $this->popularPublications($since, 6),
                $this->popularQuestions($since, 6),
                $this->popularTags($since, 12),
            ),
        ]);
    }

    public function recommendations(Request $request): JsonResponse
    {
        $period = $this->period($request);
        $since = $this->periodStart($period);
        $user = $this->optionalUser($request);
        $profile = $this->userInterestProfile($user);

        return response()->json([
            'period' => $period,
            'personalized' => $user !== null,
            'data' => $this->buildRecommendations(
                $this->popularPublications($since, 18),
                $this->popularQuestions($since, 18),
                $this->popularTags($since, 18),
                $user,
                $profile,
            ),
            'meta' => [
                'matched_tags' => $this->matchedTagsPayload($profile),
                'followed_authors_count' => count($profile['author_ids']),
                'signals_count' => $profile['signals_count'],
            ],
        ]);
    }

    public function users(Request $request): JsonResponse
    {
        $query = trim((string) $request->query('q', ''));
        $limit = max(1, min(50, (int) $request->query('limit', 24)));

        $users = User::query()
            ->select(['id', 'name', 'role', 'avatar', 'headline', 'bio', 'reputation_score', 'created_at'])
            ->when($query !== '', function (Builder $builder) use ($query) {
                $builder->where(function (Builder $builder) use ($query) {
                    $builder
                        ->where('name', 'ilike', "%{$query}%")
                        ->orWhere('headline', 'ilike', "%{$query}%")
                        ->orWhere('bio', 'ilike', "%{$query}%");
                });
            })
            ->withCount([
                'publications' => fn (Builder $builder) => $builder->published(),
                'issueQuestions' => fn (Builder $builder) => $builder->published(),
                'issueAnswers' => fn (Builder $builder) => $builder->published(),
                'comments' => fn (Builder $builder) => $builder->published(),
                'subscribers',
            ])
            ->orderByDesc('reputation_score')
            ->orderByDesc('issue_answers_count')
            ->orderByDesc('publications_count')
            ->limit($limit)
            ->get()
            ->map(fn (User $user) => $this->userPayload($user));

        return response()->json([
            'data' => $users,
            'meta' => [
                'query' => $query,
                'limit' => $limit,
                'total' => $users->count(),
            ],
        ]);
    }

    private function period(Request $request): string
    {
        $period = (string) $request->query('period', 'week');

        return in_array($period, ['day', 'week', 'month'], true) ? $period : 'week';
    }

    private function periodStart(string $period): Carbon
    {
        return match ($period) {
            'day' => now()->subDay(),
            'month' => now()->subMonth(),
            default => now()->subWeek(),
        };
    }

    private function optionalUser(Request $request): ?User
    {
        if (! $request->bearerToken()) {
            return null;
        }

        try {
            $user = JWTAuth::parseToken()->authenticate();

            return $user instanceof User ? $user : null;
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * @return array<string, int>
     */
    private function stats(): array
    {
        return [
            'publications_count' => Publication::query()->published()->count(),
            'questions_count' => IssueQuestion::query()->published()->count(),
            'solved_questions_count' => IssueQuestion::query()->published()->where('is_solved', true)->count(),
            'unanswered_questions_count' => IssueQuestion::query()->published()->whereDoesntHave('answers', fn (Builder $builder) => $builder->published())->count(),
            'comments_count' => Comment::query()->published()->count(),
            'members_count' => User::query()->count(),
        ];
    }

    /**
     * @return Collection<int, Publication>
     */
    private function popularPublications(Carbon $since, int $limit): Collection
    {
        return Publication::query()
            ->published()
            ->with(['author', 'tags'])
            ->withCount([
                'comments',
                'savedItems',
                'reactions as likes_count' => fn (Builder $builder) => $builder->where('type', Reaction::LIKE),
                'reactions as dislikes_count' => fn (Builder $builder) => $builder->where('type', Reaction::DISLIKE),
                'comments as period_comments_count' => fn (Builder $builder) => $builder->published()->where('created_at', '>=', $since),
                'savedItems as period_saved_count' => fn (Builder $builder) => $builder->where('created_at', '>=', $since),
                'reactions as period_likes_count' => fn (Builder $builder) => $builder
                    ->where('type', Reaction::LIKE)
                    ->where('created_at', '>=', $since),
            ])
            ->latest('published_at')
            ->limit(80)
            ->get()
            ->sortByDesc(fn (Publication $publication) => $this->publicationScore($publication))
            ->values()
            ->take($limit);
    }

    /**
     * @return Collection<int, IssueQuestion>
     */
    private function popularQuestions(Carbon $since, int $limit): Collection
    {
        return IssueQuestion::query()
            ->published()
            ->with(['author', 'tags'])
            ->withCount([
                'answers' => fn (Builder $builder) => $builder->published(),
                'savedItems',
                'reactions as likes_count' => fn (Builder $builder) => $builder->where('type', Reaction::LIKE),
                'reactions as dislikes_count' => fn (Builder $builder) => $builder->where('type', Reaction::DISLIKE),
                'answers as period_answers_count' => fn (Builder $builder) => $builder
                    ->published()
                    ->where('created_at', '>=', $since),
                'savedItems as period_saved_count' => fn (Builder $builder) => $builder->where('created_at', '>=', $since),
                'reactions as period_likes_count' => fn (Builder $builder) => $builder
                    ->where('type', Reaction::LIKE)
                    ->where('created_at', '>=', $since),
            ])
            ->latest('published_at')
            ->limit(80)
            ->get()
            ->sortByDesc(fn (IssueQuestion $question) => $this->questionScore($question))
            ->values()
            ->take($limit);
    }

    /**
     * @return Collection<int, IssueQuestion>
     */
    private function unansweredQuestions(int $limit): Collection
    {
        return IssueQuestion::query()
            ->published()
            ->with(['author', 'tags'])
            ->withCount([
                'answers' => fn (Builder $builder) => $builder->published(),
                'savedItems',
                'reactions as likes_count' => fn (Builder $builder) => $builder->where('type', Reaction::LIKE),
                'reactions as dislikes_count' => fn (Builder $builder) => $builder->where('type', Reaction::DISLIKE),
            ])
            ->where('is_solved', false)
            ->whereDoesntHave('answers', fn (Builder $builder) => $builder->published())
            ->latest('published_at')
            ->limit($limit)
            ->get();
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function popularTags(Carbon $since, int $limit): Collection
    {
        return Tag::query()
            ->withCount([
                'publications' => fn (Builder $builder) => $builder->published(),
                'issueQuestions' => fn (Builder $builder) => $builder->published(),
                'publications as period_publications_count' => fn (Builder $builder) => $builder
                    ->published()
                    ->where('publications.published_at', '>=', $since),
                'issueQuestions as period_questions_count' => fn (Builder $builder) => $builder
                    ->published()
                    ->where('issue_questions.published_at', '>=', $since),
            ])
            ->limit(80)
            ->get()
            ->map(fn (Tag $tag) => [
                'id' => $tag->id,
                'name' => $tag->name,
                'slug' => $tag->slug,
                'description' => $tag->description,
                'color' => $tag->color,
                'usage_count' => (int) ($tag->publications_count + $tag->issue_questions_count),
                'period_usage_count' => (int) ($tag->period_publications_count + $tag->period_questions_count),
                'trend_score' => (int) (($tag->period_publications_count + $tag->period_questions_count) * 4 + ($tag->publications_count + $tag->issue_questions_count)),
            ])
            ->sortByDesc('trend_score')
            ->values()
            ->take($limit);
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function topUsers(int $limit): Collection
    {
        return User::query()
            ->select(['id', 'name', 'role', 'avatar', 'headline', 'reputation_score'])
            ->withCount([
                'publications' => fn (Builder $builder) => $builder->published(),
                'issueQuestions' => fn (Builder $builder) => $builder->published(),
                'issueAnswers' => fn (Builder $builder) => $builder->published(),
                'comments' => fn (Builder $builder) => $builder->published(),
                'subscribers',
            ])
            ->orderByDesc('reputation_score')
            ->orderByDesc('issue_answers_count')
            ->limit($limit)
            ->get()
            ->map(fn (User $user) => $this->userPayload($user));
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function buildFeed(Collection $publications, Collection $questions, Collection $unansweredQuestions): Collection
    {
        return $publications
            ->map(fn (Publication $publication) => [
                'type' => 'publication',
                'label' => 'Публикация',
                'reason' => 'Популярно по реакциям, комментариям и сохранениям',
                'score' => $this->publicationScore($publication),
                'created_at' => $publication->published_at?->toISOString(),
                'item' => (new PublicationResource($publication))->resolve(request()),
            ])
            ->merge($questions->map(fn (IssueQuestion $question) => [
                'type' => 'question',
                'label' => $question->is_solved ? 'Решённый вопрос' : 'Вопрос',
                'reason' => $question->is_solved ? 'Есть принятое решение' : 'Активное обсуждение',
                'score' => $this->questionScore($question),
                'created_at' => $question->published_at?->toISOString(),
                'item' => (new IssueQuestionResource($question))->resolve(request()),
            ]))
            ->merge($unansweredQuestions->map(fn (IssueQuestion $question) => [
                'type' => 'question',
                'label' => 'Без ответа',
                'reason' => 'Можно помочь участнику и получить репутацию',
                'score' => max(1, $this->questionScore($question)),
                'created_at' => $question->published_at?->toISOString(),
                'item' => (new IssueQuestionResource($question))->resolve(request()),
            ]))
            ->sortByDesc('score')
            ->values()
            ->take(10);
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function buildRecommendations(Collection $publications, Collection $questions, Collection $tags, ?User $user, array $profile): Collection
    {
        $publicationRecommendations = $publications
            ->reject(fn (Publication $publication) => in_array($publication->id, $profile['disliked_publication_ids'], true))
            ->map(fn (Publication $publication) => [
                'type' => 'publication',
                'title' => $publication->title,
                'description' => $publication->excerpt,
                'href' => "/publications/{$publication->slug}",
                'reason' => $this->recommendationReasonForPublication($publication, $profile, $user),
                'score' => $this->recommendationScoreForPublication($publication, $profile, $user),
                'item' => (new PublicationResource($publication))->resolve(request()),
            ]);

        $questionRecommendations = $questions
            ->reject(fn (IssueQuestion $question) => in_array($question->id, $profile['disliked_question_ids'], true))
            ->map(fn (IssueQuestion $question) => [
                'type' => 'question',
                'title' => $question->title,
                'description' => $question->excerpt,
                'href' => "/questions/{$question->slug}",
                'reason' => $this->recommendationReasonForQuestion($question, $profile, $user),
                'score' => $this->recommendationScoreForQuestion($question, $profile, $user),
                'item' => (new IssueQuestionResource($question))->resolve(request()),
            ]);

        $tagRecommendations = $tags
            ->map(fn (array $tag) => [
                'type' => 'tag',
                'title' => '#' . $tag['name'],
                'description' => $tag['description'] ?? 'Популярная тема сообщества',
                'href' => "/tags/{$tag['slug']}",
                'reason' => in_array((int) $tag['id'], $profile['tag_ids'], true)
                    ? 'Тема совпадает с вашими подписками и историей действий'
                    : 'Тема набирает материалы и обсуждения за выбранный период',
                'score' => (int) $tag['trend_score'] + (in_array((int) $tag['id'], $profile['tag_ids'], true) ? 30 : 0),
                'item' => $tag,
            ]);

        return $publicationRecommendations
            ->merge($questionRecommendations)
            ->merge($tagRecommendations)
            ->sortByDesc('score')
            ->values()
            ->take(12);
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function buildTrends(Collection $publications, Collection $questions, Collection $tags): Collection
    {
        return $tags
            ->take(6)
            ->map(fn (array $tag) => [
                'type' => 'tag',
                'title' => '#' . $tag['name'],
                'href' => "/tags/{$tag['slug']}",
                'score' => $tag['trend_score'],
                'metric_label' => $tag['period_usage_count'] > 0
                    ? $tag['period_usage_count'] . ' новых материалов за период'
                    : $tag['usage_count'] . ' материалов всего',
                'item' => $tag,
            ])
            ->merge($publications->take(4)->map(fn (Publication $publication) => [
                'type' => 'publication',
                'title' => $publication->title,
                'href' => "/publications/{$publication->slug}",
                'score' => $this->publicationScore($publication),
                'metric_label' => (int) ($publication->period_likes_count ?? 0) . ' реакций за период',
                'item' => (new PublicationResource($publication))->resolve(request()),
            ]))
            ->merge($questions->take(4)->map(fn (IssueQuestion $question) => [
                'type' => 'question',
                'title' => $question->title,
                'href' => "/questions/{$question->slug}",
                'score' => $this->questionScore($question),
                'metric_label' => (int) ($question->period_answers_count ?? 0) . ' ответов за период',
                'item' => (new IssueQuestionResource($question))->resolve(request()),
            ]))
            ->sortByDesc('score')
            ->values()
            ->take(10);
    }

    /**
     * @return array<string, mixed>
     */
    private function userInterestProfile(?User $user): array
    {
        $profile = [
            'tag_ids' => [],
            'author_ids' => [],
            'saved_publication_ids' => [],
            'saved_question_ids' => [],
            'liked_publication_ids' => [],
            'liked_question_ids' => [],
            'disliked_publication_ids' => [],
            'disliked_question_ids' => [],
            'signals_count' => 0,
        ];

        if (! $user) {
            return $profile;
        }

        $tagMorph = (new Tag())->getMorphClass();
        $userMorph = (new User())->getMorphClass();
        $publicationMorph = (new Publication())->getMorphClass();
        $questionMorph = (new IssueQuestion())->getMorphClass();

        $tagIds = collect(Subscription::query()
            ->where('user_id', $user->id)
            ->where('subscribable_type', $tagMorph)
            ->pluck('subscribable_id'));

        $authorIds = collect(Subscription::query()
            ->where('user_id', $user->id)
            ->where('subscribable_type', $userMorph)
            ->pluck('subscribable_id'));

        $savedPublicationIds = SavedItem::query()
            ->where('user_id', $user->id)
            ->where('saveable_type', $publicationMorph)
            ->pluck('saveable_id');

        $savedQuestionIds = SavedItem::query()
            ->where('user_id', $user->id)
            ->where('saveable_type', $questionMorph)
            ->pluck('saveable_id');

        $likedPublicationIds = Reaction::query()
            ->where('user_id', $user->id)
            ->where('reactable_type', $publicationMorph)
            ->where('type', Reaction::LIKE)
            ->pluck('reactable_id');

        $likedQuestionIds = Reaction::query()
            ->where('user_id', $user->id)
            ->where('reactable_type', $questionMorph)
            ->where('type', Reaction::LIKE)
            ->pluck('reactable_id');

        $dislikedPublicationIds = Reaction::query()
            ->where('user_id', $user->id)
            ->where('reactable_type', $publicationMorph)
            ->where('type', Reaction::DISLIKE)
            ->pluck('reactable_id');

        $dislikedQuestionIds = Reaction::query()
            ->where('user_id', $user->id)
            ->where('reactable_type', $questionMorph)
            ->where('type', Reaction::DISLIKE)
            ->pluck('reactable_id');

        $signalPublicationIds = $savedPublicationIds->merge($likedPublicationIds)->unique()->values();
        $signalQuestionIds = $savedQuestionIds->merge($likedQuestionIds)->unique()->values();

        if ($signalPublicationIds->isNotEmpty()) {
            Publication::query()
                ->with('tags:id')
                ->whereIn('id', $signalPublicationIds)
                ->get(['id', 'author_id'])
                ->each(function (Publication $publication) use (&$tagIds, &$authorIds) {
                    $tagIds = $tagIds->merge($publication->tags->pluck('id'));
                    if ($publication->author_id) {
                        $authorIds->push($publication->author_id);
                    }
                });
        }

        if ($signalQuestionIds->isNotEmpty()) {
            IssueQuestion::query()
                ->with('tags:id')
                ->whereIn('id', $signalQuestionIds)
                ->get(['id', 'author_id'])
                ->each(function (IssueQuestion $question) use (&$tagIds, &$authorIds) {
                    $tagIds = $tagIds->merge($question->tags->pluck('id'));
                    if ($question->author_id) {
                        $authorIds->push($question->author_id);
                    }
                });
        }

        $profile['tag_ids'] = $tagIds->map(fn ($id) => (int) $id)->filter()->unique()->values()->all();
        $profile['author_ids'] = $authorIds->map(fn ($id) => (int) $id)->filter(fn (int $id) => $id !== $user->id)->unique()->values()->all();
        $profile['saved_publication_ids'] = $savedPublicationIds->map(fn ($id) => (int) $id)->values()->all();
        $profile['saved_question_ids'] = $savedQuestionIds->map(fn ($id) => (int) $id)->values()->all();
        $profile['liked_publication_ids'] = $likedPublicationIds->map(fn ($id) => (int) $id)->values()->all();
        $profile['liked_question_ids'] = $likedQuestionIds->map(fn ($id) => (int) $id)->values()->all();
        $profile['disliked_publication_ids'] = $dislikedPublicationIds->map(fn ($id) => (int) $id)->values()->all();
        $profile['disliked_question_ids'] = $dislikedQuestionIds->map(fn ($id) => (int) $id)->values()->all();
        $profile['signals_count'] = count($profile['tag_ids']) + count($profile['author_ids']) + count($profile['saved_publication_ids']) + count($profile['saved_question_ids']) + count($profile['liked_publication_ids']) + count($profile['liked_question_ids']);

        return $profile;
    }

    /**
     * @param array<string, mixed> $profile
     * @return array<int, array<string, mixed>>
     */
    private function matchedTagsPayload(array $profile): array
    {
        if (empty($profile['tag_ids'])) {
            return [];
        }

        return Tag::query()
            ->whereIn('id', $profile['tag_ids'])
            ->orderBy('name')
            ->limit(12)
            ->get(['id', 'name', 'slug', 'color'])
            ->map(fn (Tag $tag) => [
                'id' => $tag->id,
                'name' => $tag->name,
                'slug' => $tag->slug,
                'color' => $tag->color,
            ])
            ->all();
    }

    /**
     * @param array<string, mixed> $profile
     */
    private function recommendationScoreForPublication(Publication $publication, array $profile, ?User $user): int
    {
        $tagMatches = $publication->tags->pluck('id')->intersect($profile['tag_ids'])->count();
        $authorMatch = in_array((int) $publication->author_id, $profile['author_ids'], true) ? 1 : 0;
        $alreadySaved = in_array($publication->id, $profile['saved_publication_ids'], true) ? 1 : 0;
        $alreadyLiked = in_array($publication->id, $profile['liked_publication_ids'], true) ? 1 : 0;
        $ownPenalty = $user && (int) $publication->author_id === (int) $user->id ? -18 : 0;

        return $this->publicationScore($publication)
            + ($tagMatches * 35)
            + ($authorMatch * 28)
            + ($alreadySaved * 8)
            + ($alreadyLiked * 6)
            + $ownPenalty;
    }

    /**
     * @param array<string, mixed> $profile
     */
    private function recommendationScoreForQuestion(IssueQuestion $question, array $profile, ?User $user): int
    {
        $tagMatches = $question->tags->pluck('id')->intersect($profile['tag_ids'])->count();
        $authorMatch = in_array((int) $question->author_id, $profile['author_ids'], true) ? 1 : 0;
        $alreadySaved = in_array($question->id, $profile['saved_question_ids'], true) ? 1 : 0;
        $alreadyLiked = in_array($question->id, $profile['liked_question_ids'], true) ? 1 : 0;
        $canHelpBonus = ! $question->is_solved && (int) ($question->answers_count ?? 0) === 0 ? 18 : 0;
        $ownPenalty = $user && (int) $question->author_id === (int) $user->id ? -18 : 0;

        return $this->questionScore($question)
            + ($tagMatches * 35)
            + ($authorMatch * 28)
            + ($alreadySaved * 8)
            + ($alreadyLiked * 6)
            + $canHelpBonus
            + $ownPenalty;
    }

    /**
     * @param array<string, mixed> $profile
     */
    private function recommendationReasonForPublication(Publication $publication, array $profile, ?User $user): string
    {
        $matchedTags = $publication->tags->filter(fn (Tag $tag) => in_array($tag->id, $profile['tag_ids'], true))->pluck('name')->take(3)->values();

        if ($matchedTags->isNotEmpty()) {
            return 'Совпадает с вашими темами: #' . $matchedTags->implode(', #');
        }

        if (in_array((int) $publication->author_id, $profile['author_ids'], true)) {
            return 'Автор связан с вашими подписками и сохранёнными материалами';
        }

        if ($user && (int) $publication->author_id === (int) $user->id) {
            return 'Ваш материал остаётся заметным в сообществе';
        }

        return 'Материал набирает реакции, комментарии и сохранения';
    }

    /**
     * @param array<string, mixed> $profile
     */
    private function recommendationReasonForQuestion(IssueQuestion $question, array $profile, ?User $user): string
    {
        $matchedTags = $question->tags->filter(fn (Tag $tag) => in_array($tag->id, $profile['tag_ids'], true))->pluck('name')->take(3)->values();

        if ($matchedTags->isNotEmpty()) {
            return 'Вопрос по вашим темам: #' . $matchedTags->implode(', #');
        }

        if (! $question->is_solved && (int) ($question->answers_count ?? 0) === 0) {
            return 'На вопрос ещё можно дать первый ответ и получить репутацию';
        }

        if (in_array((int) $question->author_id, $profile['author_ids'], true)) {
            return 'Автор связан с вашими подписками и сохранёнными материалами';
        }

        if ($question->is_solved) {
            return 'Можно изучить принятое решение';
        }

        return 'Вопрос активно обсуждается в сообществе';
    }

    private function publicationScore(Publication $publication): int
    {
        $periodLikes = (int) ($publication->period_likes_count ?? 0);
        $periodComments = (int) ($publication->period_comments_count ?? 0);
        $periodSaved = (int) ($publication->period_saved_count ?? 0);
        $likes = (int) ($publication->likes_count ?? 0);
        $comments = (int) ($publication->comments_count ?? 0);
        $saved = (int) ($publication->saved_items_count ?? 0);
        $freshness = $publication->published_at?->greaterThan(now()->subDays(3)) ? 8 : 0;

        return ($periodLikes * 5) + ($periodComments * 6) + ($periodSaved * 7) + ($likes * 2) + ($comments * 2) + ($saved * 2) + $freshness;
    }

    private function questionScore(IssueQuestion $question): int
    {
        $periodAnswers = (int) ($question->period_answers_count ?? 0);
        $periodLikes = (int) ($question->period_likes_count ?? 0);
        $periodSaved = (int) ($question->period_saved_count ?? 0);
        $answers = (int) ($question->answers_count ?? 0);
        $likes = (int) ($question->likes_count ?? 0);
        $saved = (int) ($question->saved_items_count ?? 0);
        $views = (int) ($question->views_count ?? 0);
        $solvedBonus = $question->is_solved ? 10 : 0;
        $freshness = $question->published_at?->greaterThan(now()->subDays(3)) ? 6 : 0;

        return ($periodAnswers * 8) + ($periodLikes * 5) + ($periodSaved * 6) + ($answers * 4) + ($likes * 2) + ($saved * 2) + min(30, (int) floor($views / 10)) + $solvedBonus + $freshness;
    }

    /**
     * @return array<string, mixed>
     */
    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'role' => $user->role,
            'headline' => $user->headline,
            'bio' => $user->bio,
            'reputation_score' => (int) ($user->reputation_score ?? 0),
            'reputation_level' => CommunityActivityService::reputationLevel((int) ($user->reputation_score ?? 0)),
            'stats' => [
                'publications_count' => (int) $user->publications_count,
                'questions_count' => (int) $user->issue_questions_count,
                'answers_count' => (int) $user->issue_answers_count,
                'comments_count' => (int) $user->comments_count,
                'followers_count' => (int) $user->subscribers_count,
            ],
        ];
    }
}
