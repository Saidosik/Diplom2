<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'ai_chat_session_id',
    'ai_chat_message_id',
    'original_name',
    'mime_type',
    'extension',
    'size',
    'disk',
    'path',
    'extracted_text',
    'metadata',
])]
class AiChatAttachment extends Model
{
    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(AiChatSession::class, 'ai_chat_session_id');
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(AiChatMessage::class, 'ai_chat_message_id');
    }
}
