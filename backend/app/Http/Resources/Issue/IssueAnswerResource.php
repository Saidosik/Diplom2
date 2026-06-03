<?php

namespace App\Http\Resources\Issue;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class IssueAnswerResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'issue_question_id' => $this->issue_question_id,
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'is_accepted' => (bool) $this->is_accepted,
            'is_ai_generated' => (bool) ($this->is_ai_generated ?? false),
            'ai_model' => $this->ai_model,
            'ai_sources' => $this->ai_sources ?? [],
            'ai_feedback_score' => (int) ($this->ai_feedback_score ?? 0),
            'comments_count' => (int) ($this->comments_count ?? 0),
            'is_saved' => $this->isSaved($request),
            'is_owner' => $request->user()?->id === $this->author_id,
            'can_manage' => $this->canManage($request),
            'author' => $this->whenLoaded('author', fn () => [
                'id' => $this->author->id,
                'name' => $this->author->name,
                'role' => $this->author->role,
                'reputation_score' => (int) ($this->author->reputation_score ?? 0),
                'reputation_level' => method_exists($this->author, 'reputationLevel') ? $this->author->reputationLevel() : null,
                'avatar' => $this->author->avatar,
                'avatar_url' => $this->author->avatar
                    ? Storage::disk('public')->url($this->author->avatar)
                    : null,
            ]),
            'question' => $this->whenLoaded('question', fn () => [
                'id' => $this->question->id,
                'title' => $this->question->title,
                'slug' => $this->question->slug,
            ]),
            'blocks' => IssueAnswerBlockResource::collection($this->whenLoaded('blocks')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    private function canManage(Request $request): bool
    {
        $user = $request->user();

        return $user !== null && ($user->id === $this->author_id || $user->isAdmin());
    }


    private function isSaved(Request $request): bool
    {
        $user = $request->user();

        if (!$user) {
            return false;
        }

        if ($this->relationLoaded('savedItems')) {
            return $this->savedItems->where('user_id', $user->id)->isNotEmpty();
        }

        return $this->savedItems()->where('user_id', $user->id)->exists();
    }

}
