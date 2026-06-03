<?php

namespace App\Http\Controllers\Api\Community;

use App\Http\Controllers\Controller;
use App\Http\Resources\Issue\IssueQuestionResource;
use App\Http\Resources\PublicationResource;
use App\Models\Comment;
use App\Models\IssueQuestion;
use App\Models\Publication;
use App\Models\Reaction;
use App\Models\Tag;
use App\Models\User;
use App\Services\Community\CommunityActivityService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommunityOverviewController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $popularPublications = Publication::query()
            ->published()
            ->with(['author', 'tags'])
            ->withCount([
                'comments',
                'savedItems',
                'reactions as likes_count' => fn (Builder $query) => $query->where('type', Reaction::LIKE),
            ])
            ->orderByRaw('((select count(*) from reactions where reactions.reactable_type = ? and reactions.reactable_id = publications.id and reactions.type = ?) * 3 + (select count(*) from comments where comments.commentable_type = ? and comments.commentable_id = publications.id) * 2 + (select count(*) from saved_items where saved_items.saveable_type = ? and saved_items.saveable_id = publications.id) * 2) desc', ['publication', Reaction::LIKE, 'publication', 'publication'])
            ->latest('published_at')
            ->limit(4)
            ->get();

        $actualQuestions = IssueQuestion::query()
            ->published()
            ->with(['author', 'tags'])
            ->withCount([
                'answers' => fn ($builder) => $builder->published(),
                'reactions as likes_count' => fn (Builder $query) => $query->where('type', Reaction::LIKE),
                'reactions as dislikes_count' => fn (Builder $query) => $query->where('type', Reaction::DISLIKE),
            ])
            ->where('is_solved', false)
            ->latest('published_at')
            ->limit(5)
            ->get();

        $unansweredCount = IssueQuestion::query()
            ->published()
            ->doesntHave('answers')
            ->count();

        $topUsers = User::query()
            ->select(['id', 'name', 'role', 'avatar', 'headline', 'reputation_score'])
            ->withCount([
                'publications' => fn ($builder) => $builder->published(),
                'issueQuestions' => fn ($builder) => $builder->published(),
                'issueAnswers' => fn ($builder) => $builder->published(),
            ])
            ->orderByDesc('reputation_score')
            ->limit(6)
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => $user->role,
                'headline' => $user->headline,
                'reputation_score' => (int) ($user->reputation_score ?? 0),
                'reputation_level' => CommunityActivityService::reputationLevel((int) ($user->reputation_score ?? 0)),
                'stats' => [
                    'publications_count' => (int) $user->publications_count,
                    'questions_count' => (int) $user->issue_questions_count,
                    'answers_count' => (int) $user->issue_answers_count,
                ],
            ]);

        $popularTags = Tag::query()
            ->withCount(['publications', 'issueQuestions'])
            ->get()
            ->sortByDesc(fn (Tag $tag) => (int) $tag->publications_count + (int) $tag->issue_questions_count)
            ->take(10)
            ->map(fn (Tag $tag) => [
                'id' => $tag->id,
                'name' => $tag->name,
                'slug' => $tag->slug,
                'color' => $tag->color,
                'usage_count' => (int) $tag->publications_count + (int) $tag->issue_questions_count,
            ])
            ->values();

        return response()->json([
            'stats' => [
                'publications_count' => Publication::query()->published()->count(),
                'questions_count' => IssueQuestion::query()->published()->count(),
                'solved_questions_count' => IssueQuestion::query()->published()->where('is_solved', true)->count(),
                'unanswered_questions_count' => $unansweredCount,
                'comments_count' => Comment::query()->published()->count(),
                'members_count' => User::query()->count(),
            ],
            'popular_publications' => PublicationResource::collection($popularPublications),
            'actual_questions' => IssueQuestionResource::collection($actualQuestions),
            'top_users' => $topUsers,
            'popular_tags' => $popularTags,
        ]);
    }
}
