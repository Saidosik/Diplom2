<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

#[Fillable([
    'user_id',
    'reportable_type',
    'reportable_id',
    'reason',
    'details',
    'status',
])]
class Report extends Model
{
    public const STATUS_NEW = 'new';
    public const STATUS_REVIEWED = 'reviewed';
    public const STATUS_REJECTED = 'rejected';

    public const REASON_SPAM = 'spam';
    public const REASON_OFFENSIVE = 'offensive';
    public const REASON_MISINFORMATION = 'misinformation';
    public const REASON_ABUSE = 'abuse';
    public const REASON_OTHER = 'other';

    public static function reasons(): array
    {
        return [
            self::REASON_SPAM,
            self::REASON_OFFENSIVE,
            self::REASON_MISINFORMATION,
            self::REASON_ABUSE,
            self::REASON_OTHER,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reportable(): MorphTo
    {
        return $this->morphTo();
    }
}
