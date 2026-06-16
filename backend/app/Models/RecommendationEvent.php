<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'guest_id',
    'event_type',
    'target_type',
    'target_id',
    'context',
    'metadata',
    'weight',
    'ip_hash',
    'user_agent_hash',
])]
class RecommendationEvent extends Model
{
    public const EVENT_VIEW = 'view';
    public const EVENT_CLICK = 'click';
    public const EVENT_LONG_VIEW = 'long_view';
    public const EVENT_SAVE = 'save';
    public const EVENT_LIKE = 'like';
    public const EVENT_DISLIKE = 'dislike';
    public const EVENT_COMMENT = 'comment';
    public const EVENT_SEARCH = 'search';
    public const EVENT_HIDE = 'hide';
    public const EVENT_OPEN_TAG = 'open_tag';
    public const EVENT_OPEN_AUTHOR = 'open_author';

    public const TARGET_PUBLICATION = 'publication';
    public const TARGET_QUESTION = 'question';
    public const TARGET_TAG = 'tag';
    public const TARGET_USER = 'user';

    public const WEIGHTS = [
        self::EVENT_VIEW => 2,
        self::EVENT_CLICK => 5,
        self::EVENT_LONG_VIEW => 10,
        self::EVENT_SAVE => 30,
        self::EVENT_LIKE => 25,
        self::EVENT_COMMENT => 18,
        self::EVENT_SEARCH => 8,
        self::EVENT_OPEN_TAG => 10,
        self::EVENT_OPEN_AUTHOR => 10,
        self::EVENT_HIDE => -40,
        self::EVENT_DISLIKE => -60,
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'weight' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public static function eventTypes(): array
    {
        return array_keys(self::WEIGHTS);
    }

    public static function targetTypes(): array
    {
        return [self::TARGET_PUBLICATION, self::TARGET_QUESTION, self::TARGET_TAG, self::TARGET_USER];
    }

    public static function weightFor(string $eventType): int
    {
        return self::WEIGHTS[$eventType] ?? 0;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
