<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_one_id', 'user_two_id', 'requested_by_id', 'friended_at'])]
class Friendship extends Model
{
    protected function casts(): array
    {
        return [
            'friended_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function userOne(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_one_id');
    }

    public function userTwo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_two_id');
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_id');
    }

    public function friendFor(User $user): ?User
    {
        if ((int) $this->user_one_id === (int) $user->id) {
            return $this->userTwo;
        }

        if ((int) $this->user_two_id === (int) $user->id) {
            return $this->userOne;
        }

        return null;
    }

    public static function orderedPair(int $firstUserId, int $secondUserId): array
    {
        return $firstUserId < $secondUserId
            ? [$firstUserId, $secondUserId]
            : [$secondUserId, $firstUserId];
    }
}
