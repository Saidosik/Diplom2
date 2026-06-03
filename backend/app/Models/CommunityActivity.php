<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

#[Fillable([
    'actor_id',
    'type',
    'subject_type',
    'subject_id',
    'target_type',
    'target_id',
    'title',
    'description',
    'link',
    'score',
    'metadata',
])]
class CommunityActivity extends Model
{
    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'score' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    public function target(): MorphTo
    {
        return $this->morphTo();
    }
}
