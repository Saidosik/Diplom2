<?php

namespace App\Http\Resources\Community;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationSettingResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'inbox_enabled' => (bool) $this->inbox_enabled,
            'email_enabled' => (bool) $this->email_enabled,
            'notify_answers' => (bool) $this->notify_answers,
            'notify_comments' => (bool) $this->notify_comments,
            'notify_comment_replies' => (bool) $this->notify_comment_replies,
            'notify_author_posts' => (bool) $this->notify_author_posts,
            'notify_subscriptions' => (bool) $this->notify_subscriptions,
            'notify_moderation' => (bool) $this->notify_moderation,
            'notify_reputation' => (bool) $this->notify_reputation,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
