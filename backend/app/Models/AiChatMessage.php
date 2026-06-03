<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'ai_chat_session_id',
    'user_id',
    'role',
    'content',
    'sources',
    'metadata',
])]
class AiChatMessage extends Model
{
    protected function casts(): array
    {
        return [
            'sources' => 'array',
            'metadata' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(AiChatSession::class, 'ai_chat_session_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(AiChatAttachment::class, 'ai_chat_message_id');
    }
}

