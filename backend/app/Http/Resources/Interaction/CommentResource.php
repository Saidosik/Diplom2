<?php

namespace App\Http\Resources\Interaction;

use App\Models\IssueAnswer;
use App\Models\IssueQuestion;
use App\Models\Publication;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class CommentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'commentable_type' => $this->commentable_type,
            'commentable_id' => $this->commentable_id,
            'parent_id' => $this->parent_id,
            'content' => $this->content,
            'status' => $this->status,
            'is_owner' => $request->user()?->id === $this->user_id,
            'can_manage' => $this->canManage($request),
            'reports_count' => (int) ($this->reports_count ?? 0),
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'role' => $this->user->role,
                'avatar' => $this->user->avatar,
                'avatar_url' => $this->user->avatar
                    ? Storage::disk('public')->url($this->user->avatar)
                    : null,
            ]),
            'target' => $this->whenLoaded('commentable', fn () => $this->targetSummary()),
            'replies' => CommentResource::collection(
                $this->relationLoaded('repliesRecursive')
                    ? $this->repliesRecursive
                    : $this->whenLoaded('replies')
            ),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function targetSummary(): ?array
    {
        $target = $this->commentable;

        if ($target instanceof Publication) {
            return [
                'type' => 'publication',
                'id' => $target->id,
                'title' => $target->title,
                'href' => '/publications/' . $target->slug,
            ];
        }

        if ($target instanceof IssueQuestion) {
            return [
                'type' => 'issue_question',
                'id' => $target->id,
                'title' => $target->title,
                'href' => '/questions/' . $target->slug,
            ];
        }

        if ($target instanceof IssueAnswer) {
            $question = $target->relationLoaded('question') ? $target->question : $target->question()->first();

            return [
                'type' => 'issue_answer',
                'id' => $target->id,
                'title' => $question?->title ?? 'Ответ на вопрос',
                'href' => $question?->slug ? '/questions/' . $question->slug . '#answer-' . $target->id : '/questions',
            ];
        }

        return null;
    }

    private function canManage(Request $request): bool
    {
        $user = $request->user();

        return $user !== null && ($user->id === $this->user_id || $user->isAdmin());
    }
}
