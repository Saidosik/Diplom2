<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'inbox_enabled',
    'email_enabled',
    'notify_answers',
    'notify_comments',
    'notify_comment_replies',
    'notify_author_posts',
    'notify_subscriptions',
    'notify_moderation',
    'notify_reputation',
])]
class NotificationSetting extends Model
{
    protected function casts(): array
    {
        return [
            'inbox_enabled' => 'boolean',
            'email_enabled' => 'boolean',
            'notify_answers' => 'boolean',
            'notify_comments' => 'boolean',
            'notify_comment_replies' => 'boolean',
            'notify_author_posts' => 'boolean',
            'notify_subscriptions' => 'boolean',
            'notify_moderation' => 'boolean',
            'notify_reputation' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
