<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'folder_id', 'title', 'original_name', 'mime_type', 'size', 'disk', 'path', 'kind', 'visibility', 'pinned_at', 'metadata'])]
class UserFile extends Model
{
    protected function casts(): array
    {
        return [
            'size' => 'integer',
            'metadata' => 'array',
            'pinned_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function folder(): BelongsTo
    {
        return $this->belongsTo(UserFileFolder::class, 'folder_id');
    }

    public function isPublic(): bool
    {
        return $this->visibility === 'public';
    }
}
