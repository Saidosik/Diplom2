<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

#[Fillable([
    'user_id',
    'reactable_type',
    'reactable_id',
    'type',
])]
class Reaction extends Model
{
    public const LIKE = 'like';
    public const DISLIKE = 'dislike';

    public static function types(): array
    {
        return [self::LIKE, self::DISLIKE];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reactable(): MorphTo
    {
        return $this->morphTo();
    }
}
