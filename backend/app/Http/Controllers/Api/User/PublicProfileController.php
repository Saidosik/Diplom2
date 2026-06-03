<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use App\Http\Resources\Interaction\CommentResource;
use App\Http\Resources\Issue\IssueAnswerResource;
use App\Http\Resources\Issue\IssueQuestionResource;
use App\Http\Resources\PublicationResource;
use App\Http\Resources\User\PublicProfileResource;
use App\Models\Comment;
use App\Models\IssueAnswer;
use App\Models\Publication;
use App\Models\IssueQuestion;
use App\Models\Friendship;
use App\Models\Reaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class PublicProfileController extends Controller
{
    public function show(Request $request, User $user): PublicProfileResource
    {
        $canViewFullProfile = $this->canViewFullProfile($request, $user);

        $query = User::query()->whereKey($user->id);
        if ($canViewFullProfile) {
            $query = PublicProfileResource::withPublicCounts($query);
        }

        $profile = $query->firstOrFail();
        $profile->can_view_full_profile = $canViewFullProfile;

        return new PublicProfileResource($profile);
    }

    public function publications(Request $request, User $user)
    {
        abort_unless($this->canViewFullProfile($request, $user), 403, 'Профиль закрыт пользователем.');

        $perPage = $this->perPage($request, 12);

        $publications = Publication::query()
            ->published()
            ->where('author_id', $user->id)
            ->with(['author', 'tags'])
            ->withCount([
                'comments',
                'savedItems',
                'reactions as likes_count' => fn (Builder $query) => $query->where('type', Reaction::LIKE),
                'reactions as dislikes_count' => fn (Builder $query) => $query->where('type', Reaction::DISLIKE),
            ])
            ->latest('published_at')
            ->paginate($perPage);

        return PublicationResource::collection($publications);
    }

    public function issues(Request $request, User $user)
    {
        abort_unless($this->canViewFullProfile($request, $user), 403, 'Профиль закрыт пользователем.');

        $perPage = $this->perPage($request, 12);

        $questions = \App\Models\IssueQuestion::query()
            ->published()
            ->where('author_id', $user->id)
            ->with(['author', 'tags'])
            ->withCount([
                'answers' => fn ($builder) => $builder->published(),
                'reactions as likes_count' => fn (Builder $query) => $query->where('type', Reaction::LIKE),
                'reactions as dislikes_count' => fn (Builder $query) => $query->where('type', Reaction::DISLIKE),
            ])
            ->latest('published_at')
            ->paginate($perPage);

        return IssueQuestionResource::collection($questions);
    }

    public function answers(Request $request, User $user)
    {
        abort_unless($this->canViewFullProfile($request, $user), 403, 'Профиль закрыт пользователем.');

        $perPage = $this->perPage($request, 10);

        $answers = IssueAnswer::query()
            ->published()
            ->where('author_id', $user->id)
            ->whereHas('question', fn ($question) => $question->published())
            ->with(['author', 'blocks', 'question'])
            ->withCount(['comments', 'savedItems'])
            ->latest()
            ->paginate($perPage);

        return IssueAnswerResource::collection($answers);
    }

    public function comments(Request $request, User $user)
    {
        abort_unless($this->canViewFullProfile($request, $user), 403, 'Профиль закрыт пользователем.');

        $perPage = $this->perPage($request, 10);

        $comments = Comment::query()
            ->published()
            ->where('user_id', $user->id)
            ->where(function ($query) {
                $query->whereHasMorph('commentable', [Publication::class], fn ($target) => $target->published())
                    ->orWhereHasMorph('commentable', [IssueQuestion::class], fn ($target) => $target->published())
                    ->orWhereHasMorph('commentable', [IssueAnswer::class], fn ($target) => $target
                        ->published()
                        ->whereHas('question', fn ($question) => $question->published()));
            })
            ->with(['user', 'commentable'])
            ->withCount('reports')
            ->latest()
            ->paginate($perPage);

        return CommentResource::collection($comments);
    }

    private function canViewFullProfile(Request $request, User $user): bool
    {
        if (! $user->isProfilePrivate()) {
            return true;
        }

        $viewer = $request->user();
        if (! $viewer) {
            return false;
        }

        if ((int) $viewer->id === (int) $user->id || $viewer->isStaff()) {
            return true;
        }

        [$one, $two] = Friendship::orderedPair((int) $viewer->id, (int) $user->id);

        return Friendship::query()
            ->where('user_one_id', $one)
            ->where('user_two_id', $two)
            ->exists();
    }

    private function perPage(Request $request, int $default): int
    {
        return min(max((int) $request->query('per_page', $default), 1), 50);
    }
}
