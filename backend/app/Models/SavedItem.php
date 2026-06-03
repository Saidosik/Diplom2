<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

#[Fillable([
    'user_id',
    'saveable_type',
    'saveable_id',
])]
class SavedItem extends Model
{
    public const TYPE_PUBLICATION = 'publication';
    public const TYPE_ISSUE_QUESTION = 'issue_question';
    public const TYPE_ISSUE_ANSWER = 'issue_answer';

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function saveable(): MorphTo
    {
        return $this->morphTo();
    }

    public function scopeForUser(Builder $query, User $user): Builder
    {
        return $query->where('user_id', $user->id);
    }
}
