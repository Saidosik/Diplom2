<?php

namespace App\Http\Resources\User;

use App\Models\Comment;
use App\Models\IssueAnswer;
use App\Models\IssueQuestion;
use App\Models\Publication;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class PublicProfileResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'role' => $this->role,
            'avatar' => $this->avatar,
            'avatar_url' => $this->avatarUrl(),
            'cover_url' => $this->cover_url,
            'headline' => $this->headline,
            'bio' => $this->bio,
            'location' => $this->location,
            'direction' => $this->direction,
            'website_url' => $this->website_url,
            'github_url' => $this->github_url,
            'profile_visibility' => $this->profile_visibility ?? 'public',
            'show_friends_publicly' => (bool) ($this->show_friends_publicly ?? true),
            'show_files_publicly' => (bool) ($this->show_files_publicly ?? true),
            'show_activity_publicly' => (bool) ($this->show_activity_publicly ?? true),
            'is_profile_private' => ($this->profile_visibility ?? 'public') === 'private',
            'can_view_full_profile' => (bool) ($this->can_view_full_profile ?? true),
            'is_email_verified' => $this->hasVerifiedEmail(),
            'reputation_score' => (int) ($this->reputation_score ?? 0),
            'reputation_level' => method_exists($this->resource, 'reputationLevel') ? $this->reputationLevel() : null,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'stats' => ($this->can_view_full_profile ?? true) ? [
                'publications_count' => (int) ($this->publications_count ?? 0),
                'questions_count' => (int) ($this->issue_questions_count ?? 0),
                'answers_count' => (int) ($this->issue_answers_count ?? 0),
                'accepted_answers_count' => (int) ($this->accepted_answers_count ?? 0),
                'comments_count' => (int) ($this->comments_count ?? 0),
            ] : [
                'publications_count' => 0,
                'questions_count' => 0,
                'answers_count' => 0,
                'accepted_answers_count' => 0,
                'comments_count' => 0,
            ],
        ];
    }

    public static function withPublicCounts($query)
    {
        return $query->withCount([
            'publications' => fn ($builder) => $builder->published(),
            'issueQuestions' => fn ($builder) => $builder->published(),
            'issueAnswers' => fn ($builder) => $builder
                ->published()
                ->whereHas('question', fn ($question) => $question->published()),
            'issueAnswers as accepted_answers_count' => fn ($builder) => $builder
                ->published()
                ->where('is_accepted', true)
                ->whereHas('question', fn ($question) => $question->published()),
            'comments' => fn ($builder) => $builder
                ->published()
                ->where(function ($query) {
                    $query->whereHasMorph('commentable', [Publication::class], fn ($target) => $target->published())
                        ->orWhereHasMorph('commentable', [IssueQuestion::class], fn ($target) => $target->published())
                        ->orWhereHasMorph('commentable', [IssueAnswer::class], fn ($target) => $target
                            ->published()
                            ->whereHas('question', fn ($question) => $question->published()));
                }),
        ]);
    }

    private function avatarUrl(): ?string
    {
        if (! $this->avatar) {
            return null;
        }

        if (filter_var($this->avatar, FILTER_VALIDATE_URL)) {
            return $this->avatar;
        }

        return Storage::disk('public')->url($this->avatar);
    }
}
