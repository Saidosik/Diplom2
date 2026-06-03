<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['chat_conversation_id', 'user_id', 'role', 'last_read_at', 'muted_until', 'joined_at', 'left_at', 'is_typing', 'typing_started_at', 'typing_expires_at'])]
class ChatParticipant extends Model
{
    public const ROLE_OWNER = 'owner';
    public const ROLE_ADMIN = 'admin';
    public const ROLE_MEMBER = 'member';

    protected function casts(): array
    {
        return [
            'last_read_at' => 'datetime',
            'muted_until' => 'datetime',
            'joined_at' => 'datetime',
            'left_at' => 'datetime',
            'is_typing' => 'boolean',
            'typing_started_at' => 'datetime',
            'typing_expires_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(ChatConversation::class, 'chat_conversation_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
