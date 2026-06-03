<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['chat_conversation_id', 'sender_id', 'type', 'body', 'metadata', 'edited_at'])]
class ChatMessage extends Model
{
    use SoftDeletes;

    public const TYPE_TEXT = 'text';
    public const TYPE_FILE = 'file';
    public const TYPE_SYSTEM = 'system';

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'edited_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(ChatConversation::class, 'chat_conversation_id');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(ChatAttachment::class);
    }
}
