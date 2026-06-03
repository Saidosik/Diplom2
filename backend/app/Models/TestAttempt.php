<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['test_id', 'user_id', 'status', 'score', 'max_score', 'submitted_at'])]
class TestAttempt extends Model
{
    use SoftDeletes;
    protected function casts()
    {
        return [
            'status' => 'string',
            'score' => 'integer',
            'max_score' => 'integer',
            'submitted_at' => 'datetime',
        ];
    }

    public function userAnswers(): HasMany
    {
        return $this->hasMany(UserAnswer::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
    public function test(): BelongsTo
    {
        return $this->belongsTo(Test::class);
    }
}
