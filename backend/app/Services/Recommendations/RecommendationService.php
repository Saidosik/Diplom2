<?php

namespace App\Services\Recommendations;

use App\Http\Resources\Issue\IssueQuestionResource;
use App\Http\Resources\PublicationResource;
use App\Models\IssueQuestion;
use App\Models\Publication;
use App\Models\Reaction;
use App\Models\RecommendationEvent;
use App\Models\SavedItem;
use App\Models\Subscription;
use App\Models\Tag;
use App\Models\User;
use App\Services\PublicationRankingService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class RecommendationService
{
    public function __construct(
        private readonly PublicationRankingService $rankingService,
        private readonly SemanticRecommendationSource $semanticSource,
    ) {}

    /** @return array{mode:string,data:Collection<int,array<string,mixed>>,meta:array<string,mixed>} */
    public function forRequest(Request $request, ?User $user, ?string $guestId = null): array
    {
        $period = $this->period($request);
        $since = $this->periodStart($period);
        $profile = $this->userInterestProfile($user);
        $eventSignals = $this->applyEventSignals($profile, $user, $guestId);
        $semantic = $this->semanticSource->candidates($user, $guestId, $profile);
        $semanticCandidates = $semantic['candidates'];
        $semanticSignals = $semantic['semantic_signals_count'];
        $mode = $user ? 'personalized' : 'guest';
        $strategy = $user
            ? ($semanticSignals > 0 ? 'personalized_semantic' : ($eventSignals > 0 ? 'personalized_events' : 'personalized'))
            : ($semanticSignals > 0 ? 'guest_semantic' : ($eventSignals > 0 ? 'guest_events' : 'guest_trending'));
        $candidateSources = collect(['trending', 'tags'])
            ->when($eventSignals > 0, fn ($sources) => $sources->push('events'))
            ->when($semanticCandidates->isNotEmpty(), fn ($sources) => $sources->push('semantic'))
            ->values()
            ->all();
        $popularPublications = $this->popularPublications($since, 18);
        $popularQuestions = $this->popularQuestions($since, 18);
        $popularPublications = $this->mergeSemanticPublications($popularPublications, $semanticCandidates);
        $popularQuestions = $this->mergeSemanticQuestions($popularQuestions, $semanticCandidates);

        return [
            'mode' => $mode,
            'data' => $this->buildRecommendations(
                $popularPublications,
                $popularQuestions,
                $this->popularTags($since, 18),
                $this->unansweredQuestions(8),
                $user,
                $profile,
                $mode,
                $request,
                $semanticCandidates,
            ),
            'meta' => [
                'period' => $period,
                'personalized' => $user !== null,
                'matched_tags' => $this->matchedTagsPayload($profile),
                'followed_authors_count' => count($profile['author_ids']),
                'signals_count' => $profile['signals_count'],
                'strategy' => $strategy,
                'semantic_signals_count' => $semanticSignals,
                'candidate_sources' => $candidateSources,
            ],
        ];
    }

    public function period(Request $request): string
    {
        $period = (string) $request->query('period', 'week');
        return in_array($period, ['day', 'week', 'month', 'all'], true) ? $period : 'week';
    }

    public function periodStart(string $period): Carbon
    {
        return match ($period) {
            'day' => now()->subDay(),
            'month' => now()->subMonth(),
            'all' => Carbon::create(1970, 1, 1),
            default => now()->subWeek(),
        };
    }

    /** @return Collection<int,Publication> */
    public function popularPublications(Carbon $since, int $limit): Collection
    {
        return Publication::query()->published()->with(['author', 'tags'])->withCount([
            'comments', 'savedItems',
            'reactions as likes_count' => fn (Builder $b) => $b->where('type', Reaction::LIKE),
            'reactions as dislikes_count' => fn (Builder $b) => $b->where('type', Reaction::DISLIKE),
            'comments as period_comments_count' => fn (Builder $b) => $b->published()->where('created_at', '>=', $since),
            'savedItems as period_saved_count' => fn (Builder $b) => $b->where('created_at', '>=', $since),
            'reactions as period_likes_count' => fn (Builder $b) => $b->where('type', Reaction::LIKE)->where('created_at', '>=', $since),
        ])->latest('published_at')->limit(80)->get()
            ->sortByDesc(fn (Publication $p) => $this->publicationScore($p))->values()->take($limit);
    }

    /** @return Collection<int,IssueQuestion> */
    public function popularQuestions(Carbon $since, int $limit): Collection
    {
        return IssueQuestion::query()->published()->with(['author', 'tags'])->withCount([
            'answers' => fn (Builder $b) => $b->published(), 'savedItems',
            'reactions as likes_count' => fn (Builder $b) => $b->where('type', Reaction::LIKE),
            'reactions as dislikes_count' => fn (Builder $b) => $b->where('type', Reaction::DISLIKE),
            'answers as period_answers_count' => fn (Builder $b) => $b->published()->where('created_at', '>=', $since),
            'savedItems as period_saved_count' => fn (Builder $b) => $b->where('created_at', '>=', $since),
            'reactions as period_likes_count' => fn (Builder $b) => $b->where('type', Reaction::LIKE)->where('created_at', '>=', $since),
        ])->latest('published_at')->limit(80)->get()->sortByDesc(fn (IssueQuestion $q) => $this->questionScore($q))->values()->take($limit);
    }

    /** @param Collection<int,array<string,mixed>> $semanticCandidates @return Collection<int,Publication> */
    private function mergeSemanticPublications(Collection $publications, Collection $semanticCandidates): Collection
    {
        $existingIds = $publications->pluck('id')->map(fn ($id) => (int) $id)->all();
        $semanticIds = $semanticCandidates
            ->where('type', RecommendationEvent::TARGET_PUBLICATION)
            ->pluck('source_id')
            ->map(fn ($id) => (int) $id)
            ->diff($existingIds)
            ->values()
            ->all();

        if ($semanticIds === []) {
            return $publications;
        }

        $semanticPublications = Publication::query()
            ->published()
            ->with(['author', 'tags'])
            ->withCount([
                'comments',
                'savedItems',
                'reactions as likes_count' => fn (Builder $builder) => $builder->where('type', Reaction::LIKE),
                'reactions as dislikes_count' => fn (Builder $builder) => $builder->where('type', Reaction::DISLIKE),
            ])
            ->whereIn('id', $semanticIds)
            ->get();

        return $publications->merge($semanticPublications)->unique('id')->values();
    }

    /** @param Collection<int,array<string,mixed>> $semanticCandidates @return Collection<int,IssueQuestion> */
    private function mergeSemanticQuestions(Collection $questions, Collection $semanticCandidates): Collection
    {
        $existingIds = $questions->pluck('id')->map(fn ($id) => (int) $id)->all();
        $semanticIds = $semanticCandidates
            ->where('type', RecommendationEvent::TARGET_QUESTION)
            ->pluck('source_id')
            ->map(fn ($id) => (int) $id)
            ->diff($existingIds)
            ->values()
            ->all();

        if ($semanticIds === []) {
            return $questions;
        }

        $semanticQuestions = IssueQuestion::query()
            ->published()
            ->with(['author', 'tags'])
            ->withCount([
                'answers' => fn (Builder $builder) => $builder->published(),
                'savedItems',
                'reactions as likes_count' => fn (Builder $builder) => $builder->where('type', Reaction::LIKE),
                'reactions as dislikes_count' => fn (Builder $builder) => $builder->where('type', Reaction::DISLIKE),
            ])
            ->whereIn('id', $semanticIds)
            ->get();

        return $questions->merge($semanticQuestions)->unique('id')->values();
    }

    /** @return Collection<int,IssueQuestion> */
    public function unansweredQuestions(int $limit): Collection
    {
        return IssueQuestion::query()->published()->with(['author', 'tags'])->withCount([
            'answers' => fn (Builder $b) => $b->published(), 'savedItems',
            'reactions as likes_count' => fn (Builder $b) => $b->where('type', Reaction::LIKE),
            'reactions as dislikes_count' => fn (Builder $b) => $b->where('type', Reaction::DISLIKE),
        ])->where('is_solved', false)->whereDoesntHave('answers', fn (Builder $b) => $b->published())->latest('published_at')->limit($limit)->get();
    }

    /** @return Collection<int,array<string,mixed>> */
    public function popularTags(Carbon $since, int $limit): Collection
    {
        return Tag::query()->withCount([
            'publications' => fn (Builder $b) => $b->published(), 'issueQuestions' => fn (Builder $b) => $b->published(),
            'publications as period_publications_count' => fn (Builder $b) => $b->published()->where('publications.published_at', '>=', $since),
            'issueQuestions as period_questions_count' => fn (Builder $b) => $b->published()->where('issue_questions.published_at', '>=', $since),
        ])->limit(80)->get()->map(fn (Tag $tag) => [
            'id' => $tag->id, 'name' => $tag->name, 'slug' => $tag->slug, 'description' => $tag->description, 'color' => $tag->color,
            'usage_count' => (int) ($tag->publications_count + $tag->issue_questions_count),
            'period_usage_count' => (int) ($tag->period_publications_count + $tag->period_questions_count),
            'trend_score' => (int) (($tag->period_publications_count + $tag->period_questions_count) * 4 + ($tag->publications_count + $tag->issue_questions_count)),
        ])->sortByDesc('trend_score')->values()->take($limit);
    }

    /** @param array<string,mixed> $profile @return Collection<int,array<string,mixed>> */
    public function buildRecommendations(Collection $publications, Collection $questions, Collection $tags, Collection $unanswered, ?User $user, array $profile, string $mode, Request $request, ?Collection $semanticCandidates = null): Collection
    {
        $semanticCandidates ??= collect();
        $semanticByKey = $semanticCandidates->keyBy(fn (array $candidate) => $candidate['type'] . ':' . $candidate['source_id']);

        $publicationRecommendations = $publications
            ->reject(fn (Publication $p) => in_array($p->id, $profile['disliked_publication_ids'], true) || in_array($p->id, $profile['hidden_publication_ids'], true))
            ->map(fn (Publication $p) => [
            'type' => 'publication', 'title' => $p->title, 'description' => $p->excerpt, 'href' => "/publications/{$p->slug}",
            'reason' => $this->recommendationReason('publication', $p->id, $semanticByKey) ?? ($mode === 'guest' ? 'Трендовая свежая публикация сообщества' : $this->publicationReason($p, $profile, $user)),
            'score' => $this->publicationRecommendationScore($p, $profile, $user) + $this->semanticBoost('publication', $p->id, $semanticByKey), 'item' => (new PublicationResource($p))->resolve($request),
        ]);

        $questionRecommendations = $questions->merge($unanswered)->unique('id')
            ->reject(fn (IssueQuestion $q) => in_array($q->id, $profile['disliked_question_ids'], true) || in_array($q->id, $profile['hidden_question_ids'], true))
            ->map(fn (IssueQuestion $q) => [
            'type' => 'question', 'title' => $q->title, 'description' => $q->excerpt, 'href' => "/questions/{$q->slug}",
            'reason' => $this->recommendationReason('question', $q->id, $semanticByKey) ?? ($mode === 'guest' && ! $q->is_solved && (int) ($q->answers_count ?? 0) === 0 ? 'Вопрос без ответа: можно помочь первым' : $this->questionReason($q, $profile, $user)),
            'score' => $this->questionRecommendationScore($q, $profile, $user) + $this->semanticBoost('question', $q->id, $semanticByKey), 'item' => (new IssueQuestionResource($q))->resolve($request),
        ]);

        $tagRecommendations = $tags->map(fn (array $tag) => [
            'type' => 'tag', 'title' => '#' . $tag['name'], 'description' => $tag['description'] ?? 'Популярная тема сообщества', 'href' => "/tags/{$tag['slug']}",
            'reason' => in_array((int) $tag['id'], $profile['tag_ids'], true) ? 'Тема совпадает с вашими сигналами' : 'Популярный тег за выбранный период',
            'score' => (int) $tag['trend_score'] + (in_array((int) $tag['id'], $profile['tag_ids'], true) ? 30 : 0), 'item' => $tag,
        ]);

        return $publicationRecommendations->merge($questionRecommendations)->merge($tagRecommendations)->sortByDesc('score')->values()->take(12);
    }

    /** @return array<string,mixed> */
    public function userInterestProfile(?User $user): array
    {
        $profile = ['tag_ids'=>[], 'author_ids'=>[], 'saved_publication_ids'=>[], 'saved_question_ids'=>[], 'liked_publication_ids'=>[], 'liked_question_ids'=>[], 'disliked_publication_ids'=>[], 'disliked_question_ids'=>[], 'hidden_publication_ids'=>[], 'hidden_question_ids'=>[], 'seen_publication_ids'=>[], 'seen_question_ids'=>[], 'tag_weights'=>[], 'author_weights'=>[], 'content_type_weights'=>[], 'signals_count'=>0];
        if (! $user) return $profile;
        $publicationMorph = (new Publication())->getMorphClass(); $questionMorph = (new IssueQuestion())->getMorphClass();
        $tagIds = collect(Subscription::query()->where('user_id',$user->id)->where('subscribable_type',(new Tag())->getMorphClass())->pluck('subscribable_id'));
        $authorIds = collect(Subscription::query()->where('user_id',$user->id)->where('subscribable_type',(new User())->getMorphClass())->pluck('subscribable_id'));
        $savedPublicationIds = SavedItem::query()->where('user_id',$user->id)->where('saveable_type',$publicationMorph)->pluck('saveable_id');
        $savedQuestionIds = SavedItem::query()->where('user_id',$user->id)->where('saveable_type',$questionMorph)->pluck('saveable_id');
        $likedPublicationIds = Reaction::query()->where('user_id',$user->id)->where('reactable_type',$publicationMorph)->where('type',Reaction::LIKE)->pluck('reactable_id');
        $likedQuestionIds = Reaction::query()->where('user_id',$user->id)->where('reactable_type',$questionMorph)->where('type',Reaction::LIKE)->pluck('reactable_id');
        $dislikedPublicationIds = Reaction::query()->where('user_id',$user->id)->where('reactable_type',$publicationMorph)->where('type',Reaction::DISLIKE)->pluck('reactable_id');
        $dislikedQuestionIds = Reaction::query()->where('user_id',$user->id)->where('reactable_type',$questionMorph)->where('type',Reaction::DISLIKE)->pluck('reactable_id');
        Publication::query()->with('tags:id')->whereIn('id',$savedPublicationIds->merge($likedPublicationIds)->unique())->get(['id','author_id'])->each(function (Publication $p) use (&$tagIds,&$authorIds) { $tagIds = $tagIds->merge($p->tags->pluck('id')); if ($p->author_id) $authorIds->push($p->author_id); });
        IssueQuestion::query()->with('tags:id')->whereIn('id',$savedQuestionIds->merge($likedQuestionIds)->unique())->get(['id','author_id'])->each(function (IssueQuestion $q) use (&$tagIds,&$authorIds) { $tagIds = $tagIds->merge($q->tags->pluck('id')); if ($q->author_id) $authorIds->push($q->author_id); });
        $profile['tag_ids'] = $tagIds->map(fn ($id)=>(int)$id)->filter()->unique()->values()->all();
        $profile['author_ids'] = $authorIds->map(fn ($id)=>(int)$id)->filter(fn (int $id)=>$id !== $user->id)->unique()->values()->all();
        $profile['saved_publication_ids'] = $savedPublicationIds->map(fn ($id)=>(int)$id)->values()->all(); $profile['saved_question_ids'] = $savedQuestionIds->map(fn ($id)=>(int)$id)->values()->all();
        $profile['liked_publication_ids'] = $likedPublicationIds->map(fn ($id)=>(int)$id)->values()->all(); $profile['liked_question_ids'] = $likedQuestionIds->map(fn ($id)=>(int)$id)->values()->all();
        $profile['disliked_publication_ids'] = $dislikedPublicationIds->map(fn ($id)=>(int)$id)->values()->all(); $profile['disliked_question_ids'] = $dislikedQuestionIds->map(fn ($id)=>(int)$id)->values()->all();
        $profile['signals_count'] = count($profile['tag_ids']) + count($profile['author_ids']) + count($profile['saved_publication_ids']) + count($profile['saved_question_ids']) + count($profile['liked_publication_ids']) + count($profile['liked_question_ids']);
        return $profile;
    }

    /** @param array<string,mixed> $profile */
    public function publicationRecommendationScore(Publication $p, array $profile, ?User $user): int
    {
        $tagEventBoost = $p->tags->pluck('id')->sum(fn ($id) => (int) ($profile['tag_weights'][(int) $id] ?? 0));
        $authorEventBoost = (int) ($profile['author_weights'][(int) $p->author_id] ?? 0);
        $contentTypeBoost = (int) ($profile['content_type_weights']['publication'] ?? 0);
        $seenPenalty = in_array($p->id, $profile['seen_publication_ids'], true) ? -12 : 0;

        return $this->publicationScore($p) + ($p->tags->pluck('id')->intersect($profile['tag_ids'])->count()*35) + (in_array((int)$p->author_id,$profile['author_ids'],true)?28:0) + (in_array($p->id,$profile['saved_publication_ids'],true)?8:0) + (in_array($p->id,$profile['liked_publication_ids'],true)?6:0) + $tagEventBoost + $authorEventBoost + $contentTypeBoost + $seenPenalty + ($user && (int)$p->author_id === (int)$user->id ? -18 : 0);
    }

    /** @param array<string,mixed> $profile */
    public function questionRecommendationScore(IssueQuestion $q, array $profile, ?User $user): int
    {
        $tagEventBoost = $q->tags->pluck('id')->sum(fn ($id) => (int) ($profile['tag_weights'][(int) $id] ?? 0));
        $authorEventBoost = (int) ($profile['author_weights'][(int) $q->author_id] ?? 0);
        $contentTypeBoost = (int) ($profile['content_type_weights']['question'] ?? 0);
        $seenPenalty = in_array($q->id, $profile['seen_question_ids'], true) ? -12 : 0;

        return $this->questionScore($q) + ($q->tags->pluck('id')->intersect($profile['tag_ids'])->count()*35) + (in_array((int)$q->author_id,$profile['author_ids'],true)?28:0) + (in_array($q->id,$profile['saved_question_ids'],true)?8:0) + (in_array($q->id,$profile['liked_question_ids'],true)?6:0) + $tagEventBoost + $authorEventBoost + $contentTypeBoost + $seenPenalty + (! $q->is_solved && (int)($q->answers_count ?? 0)===0 ? 18 : 0) + ($user && (int)$q->author_id === (int)$user->id ? -18 : 0);
    }

    /**
     * @param array<string,mixed> $profile
     */
    private function applyEventSignals(array &$profile, ?User $user, ?string $guestId): int
    {
        $events = RecommendationEvent::query()
            ->when(
                $user,
                fn (Builder $builder) => $builder->where('user_id', $user->id)->where('created_at', '>=', now()->subDays(30)),
                fn (Builder $builder) => $guestId
                    ? $builder->where('guest_id', $guestId)->where('created_at', '>=', now()->subDays(7))
                    : $builder->whereRaw('1 = 0'),
            )
            ->latest()
            ->limit(300)
            ->get();

        if ($events->isEmpty()) {
            return 0;
        }

        $publicationIds = $events->where('target_type', RecommendationEvent::TARGET_PUBLICATION)->pluck('target_id')->filter()->unique()->values();
        $questionIds = $events->where('target_type', RecommendationEvent::TARGET_QUESTION)->pluck('target_id')->filter()->unique()->values();

        $publications = Publication::query()->with('tags:id')->whereIn('id', $publicationIds)->get(['id', 'author_id'])->keyBy('id');
        $questions = IssueQuestion::query()->with('tags:id')->whereIn('id', $questionIds)->get(['id', 'author_id'])->keyBy('id');

        foreach ($events as $event) {
            $weight = (int) $event->weight;
            $targetId = (int) $event->target_id;

            if ($event->target_type === RecommendationEvent::TARGET_PUBLICATION && $targetId > 0) {
                if ($event->event_type === RecommendationEvent::EVENT_VIEW) {
                    $profile['seen_publication_ids'][] = $targetId;
                }

                if ($event->event_type === RecommendationEvent::EVENT_HIDE) {
                    $profile['hidden_publication_ids'][] = $targetId;
                }

                if ($event->event_type === RecommendationEvent::EVENT_DISLIKE) {
                    $profile['disliked_publication_ids'][] = $targetId;
                }

                $profile['content_type_weights']['publication'] = ($profile['content_type_weights']['publication'] ?? 0) + $weight;
                $publication = $publications->get($targetId);
                if ($publication) {
                    $this->addEventEntityWeights($profile, $publication->tags->pluck('id')->all(), $publication->author_id, $weight);
                }
            }

            if ($event->target_type === RecommendationEvent::TARGET_QUESTION && $targetId > 0) {
                if ($event->event_type === RecommendationEvent::EVENT_VIEW) {
                    $profile['seen_question_ids'][] = $targetId;
                }

                if ($event->event_type === RecommendationEvent::EVENT_HIDE) {
                    $profile['hidden_question_ids'][] = $targetId;
                }

                if ($event->event_type === RecommendationEvent::EVENT_DISLIKE) {
                    $profile['disliked_question_ids'][] = $targetId;
                }

                $profile['content_type_weights']['question'] = ($profile['content_type_weights']['question'] ?? 0) + $weight;
                $question = $questions->get($targetId);
                if ($question) {
                    $this->addEventEntityWeights($profile, $question->tags->pluck('id')->all(), $question->author_id, $weight);
                }
            }

            if ($event->target_type === RecommendationEvent::TARGET_TAG && $targetId > 0) {
                $profile['tag_weights'][$targetId] = ($profile['tag_weights'][$targetId] ?? 0) + $weight;
                $profile['tag_ids'][] = $targetId;
            }

            if ($event->target_type === RecommendationEvent::TARGET_USER && $targetId > 0) {
                $profile['author_weights'][$targetId] = ($profile['author_weights'][$targetId] ?? 0) + $weight;
                $profile['author_ids'][] = $targetId;
            }
        }

        foreach (['tag_ids', 'author_ids', 'disliked_publication_ids', 'disliked_question_ids', 'hidden_publication_ids', 'hidden_question_ids', 'seen_publication_ids', 'seen_question_ids'] as $key) {
            $profile[$key] = collect($profile[$key])->map(fn ($id) => (int) $id)->filter()->unique()->values()->all();
        }

        $profile['signals_count'] += $events->count();

        return $events->count();
    }

    /**
     * @param array<string,mixed> $profile
     * @param array<int,int> $tagIds
     */
    private function addEventEntityWeights(array &$profile, array $tagIds, ?int $authorId, int $weight): void
    {
        foreach ($tagIds as $tagId) {
            $tagId = (int) $tagId;
            $profile['tag_weights'][$tagId] = ($profile['tag_weights'][$tagId] ?? 0) + $weight;
            $profile['tag_ids'][] = $tagId;
        }

        if ($authorId) {
            $profile['author_weights'][(int) $authorId] = ($profile['author_weights'][(int) $authorId] ?? 0) + $weight;
            $profile['author_ids'][] = (int) $authorId;
        }
    }

    /** @param Collection<string,array<string,mixed>> $semanticByKey */
    private function semanticBoost(string $type, int $id, Collection $semanticByKey): int
    {
        $candidate = $semanticByKey->get($type . ':' . $id);

        if (! $candidate) {
            return 0;
        }

        return (int) round(((float) ($candidate['score'] ?? 0.0)) * 30);
    }

    /** @param Collection<string,array<string,mixed>> $semanticByKey */
    private function recommendationReason(string $type, int $id, Collection $semanticByKey): ?string
    {
        $candidate = $semanticByKey->get($type . ':' . $id);

        return $candidate ? (string) ($candidate['reason'] ?? 'Связано с вашими интересами по смыслу') : null;
    }

    /** @param array<string,mixed> $profile */
    private function publicationReason(Publication $p, array $profile, ?User $user): string
    { $matched = $p->tags->filter(fn (Tag $t)=>in_array($t->id,$profile['tag_ids'],true))->pluck('name')->take(3); if ($matched->isNotEmpty()) return 'Совпадает с вашими темами: #'.$matched->implode(', #'); if (in_array((int)$p->author_id,$profile['author_ids'],true)) return 'Автор связан с вашими подписками и сохранёнными материалами'; if ($user && (int)$p->author_id === (int)$user->id) return 'Ваш материал остаётся заметным в сообществе'; return 'Материал набирает реакции, комментарии и сохранения'; }

    /** @param array<string,mixed> $profile */
    private function questionReason(IssueQuestion $q, array $profile, ?User $user): string
    { $matched = $q->tags->filter(fn (Tag $t)=>in_array($t->id,$profile['tag_ids'],true))->pluck('name')->take(3); if ($matched->isNotEmpty()) return 'Вопрос по вашим темам: #'.$matched->implode(', #'); if (! $q->is_solved && (int)($q->answers_count ?? 0)===0) return 'На вопрос ещё можно дать первый ответ и получить репутацию'; if (in_array((int)$q->author_id,$profile['author_ids'],true)) return 'Автор связан с вашими подписками и сохранёнными материалами'; if ($q->is_solved) return 'Можно изучить принятое решение'; return 'Вопрос активно обсуждается в сообществе'; }

    /** @param array<string,mixed> $profile @return array<int,array<string,mixed>> */
    private function matchedTagsPayload(array $profile): array
    { return empty($profile['tag_ids']) ? [] : Tag::query()->whereIn('id',$profile['tag_ids'])->orderBy('name')->limit(12)->get(['id','name','slug','color'])->map(fn (Tag $t)=>['id'=>$t->id,'name'=>$t->name,'slug'=>$t->slug,'color'=>$t->color])->all(); }

    private function publicationScore(Publication $p): int { return (int) round($this->rankingService->score($p)); }
    private function questionScore(IssueQuestion $q): int
    { return ((int)($q->period_answers_count ?? 0)*8)+((int)($q->period_likes_count ?? 0)*5)+((int)($q->period_saved_count ?? 0)*6)+((int)($q->answers_count ?? 0)*4)+((int)($q->likes_count ?? 0)*2)+((int)($q->saved_items_count ?? 0)*2)+min(30,(int)floor(((int)($q->views_count ?? 0))/10))+($q->is_solved?10:0)+($q->published_at?->greaterThan(now()->subDays(3))?6:0); }
}
