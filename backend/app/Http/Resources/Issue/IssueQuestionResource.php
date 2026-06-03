<?php

namespace App\Http\Resources\Issue;

use App\Http\Resources\ContentAttachmentResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class IssueQuestionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'excerpt' => $this->excerpt,
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'workflow_status' => $this->workflowStatus(),
            'workflow_status_label' => $this->workflowStatusLabel(),
            'is_solved' => (bool) $this->is_solved,
            'accepted_answer_id' => $this->accepted_answer_id,
            'views_count' => (int) $this->views_count,
            'answers_count' => $this->whenCounted('answers'),
            'likes_count' => (int) ($this->likes_count ?? 0),
            'dislikes_count' => (int) ($this->dislikes_count ?? 0),
            'saved_count' => (int) ($this->saved_items_count ?? $this->savedItems_count ?? 0),
            'my_reaction' => $this->myReaction(),
            'is_saved' => $this->isSaved($request),
            'is_owner' => $request->user()?->id === $this->author_id,
            'can_accept_answer' => $this->canAcceptAnswer($request),
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
            'tags' => TagResource::collection($this->whenLoaded('tags')),
            'blocks' => IssueBlockResource::collection($this->whenLoaded('blocks')),
            'answers' => IssueAnswerResource::collection($this->whenLoaded('answers')),
            'attachments' => ContentAttachmentResource::collection($this->whenLoaded('attachments')),
            'published_at' => $this->published_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    private function workflowStatus(): string
    {
        if ($this->status?->value === 'hidden') {
            return 'moderation';
        }

        if ($this->status?->value === 'closed') {
            return 'closed';
        }

        if ((bool) $this->is_solved) {
            return 'solved';
        }

        if ((int) ($this->answers_count ?? 0) > 0 || ($this->relationLoaded('answers') && $this->answers->isNotEmpty())) {
            return 'has_answers';
        }

        return 'open';
    }

    private function workflowStatusLabel(): string
    {
        return match ($this->workflowStatus()) {
            'solved' => 'Решён',
            'has_answers' => 'Есть ответы',
            'closed' => 'Закрыт',
            'moderation' => 'На модерации',
            default => 'Открыт',
        };
    }

    private function canAcceptAnswer(Request $request): bool
    {
        $user = $request->user();

        return $user !== null && ($user->id === $this->author_id || $user->isAdmin());
    }

    private function myReaction(): ?string
    {
        if (!$this->relationLoaded('reactions')) {
            return null;
        }

        return $this->reactions->first()?->type;
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
