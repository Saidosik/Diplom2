<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id','achievement_id','unlocked_at','progress','metadata'])]
class UserAchievement extends Model
{
    protected function casts(): array { return ['unlocked_at' => 'datetime', 'progress' => 'integer', 'metadata' => 'array']; }
    public function achievement(): BelongsTo { return $this->belongsTo(Achievement::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
