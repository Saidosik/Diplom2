<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'user_id',
    'title',
    'language',
    'snippet_type',
    'code',
    'stdin',
    'visibility',
    'status',
    'last_run_status',
    'last_run_at',
])]
class CodeSnippet extends Model
{
    use SoftDeletes;

    public const TYPE_SNIPPET = 'snippet';
    public const TYPE_TEMPLATE = 'template';
    public const TYPE_SOLUTION = 'solution';
    public const TYPE_NOTE = 'note';

    public const STATUS_DRAFT = 'draft';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_ARCHIVED = 'archived';

    protected function casts(): array
    {
        return [
            'last_run_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function runs(): HasMany
    {
        return $this->hasMany(CodeRun::class);
    }

    public function isPublic(): bool
    {
        return $this->visibility === 'public' && $this->status === self::STATUS_ACTIVE;
    }

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }
}
