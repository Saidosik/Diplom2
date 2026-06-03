<?php

namespace App\Http\Resources\Community;

use App\Models\CodeSnippet;
use App\Models\Comment;
use App\Models\IssueAnswer;
use App\Models\IssueQuestion;
use App\Models\Publication;
use App\Models\ReputationEvent;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class CommunityActivityResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $this->title,
            'description' => $this->description,
            'link' => $this->link,
            'score' => (int) ($this->score ?? 0),
            'metadata' => $this->metadata ?? [],
            'actor' => $this->whenLoaded('actor', fn () => $this->userPayload($this->actor)),
            'subject' => $this->whenLoaded('subject', fn () => $this->modelPayload($this->subject)),
            'target' => $this->whenLoaded('target', fn () => $this->modelPayload($this->target)),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function modelPayload(?Model $model): ?array
    {
        if (! $model) {
            return null;
        }

        if ($model instanceof Publication) {
            return [
                'type' => 'publication',
                'id' => $model->id,
                'title' => $model->title,
                'slug' => $model->slug,
                'href' => "/publications/{$model->slug}",
            ];
        }

        if ($model instanceof IssueQuestion) {
            return [
                'type' => 'issue_question',
                'id' => $model->id,
                'title' => $model->title,
                'slug' => $model->slug,
                'href' => "/questions/{$model->slug}",
            ];
        }

        if ($model instanceof IssueAnswer) {
            $model->loadMissing('question');
            return [
                'type' => 'issue_answer',
                'id' => $model->id,
                'title' => $model->question?->title,
                'href' => $model->question?->slug ? "/questions/{$model->question->slug}#answer-{$model->id}" : null,
            ];
        }

        if ($model instanceof Comment) {
            return [
                'type' => 'comment',
                'id' => $model->id,
            ];
        }

        if ($model instanceof CodeSnippet) {
            return [
                'type' => 'code_snippet',
                'id' => $model->id,
                'title' => $model->title,
                'language' => $model->language,
                'href' => "/playground?snippet={$model->id}",
            ];
        }

        if ($model instanceof User) {
            return $this->userPayload($model) + ['type' => 'user', 'href' => "/users/{$model->id}"];
        }

        if ($model instanceof Tag) {
            return [
                'type' => 'tag',
                'id' => $model->id,
                'title' => $model->name,
                'slug' => $model->slug,
                'href' => "/tags/{$model->slug}",
            ];
        }

        if ($model instanceof ReputationEvent) {
            return [
                'type' => 'reputation_event',
                'id' => $model->id,
                'title' => $model->reason,
                'points' => (int) $model->points,
            ];
        }

        return [
            'type' => $model->getMorphClass(),
            'id' => $model->getKey(),
        ];
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
            'reputation_score' => (int) ($user->reputation_score ?? 0),
            'avatar' => $user->avatar,
            'avatar_url' => $user->avatar ? Storage::disk('public')->url($user->avatar) : null,
        ];
    }
}
