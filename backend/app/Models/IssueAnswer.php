<?php

namespace App\Models;

use App\Enums\IssueAnswerStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'issue_question_id',
    'author_id',
    'status',
    'is_accepted',
    'is_ai_generated',
    'ai_model',
    'ai_sources',
    'ai_feedback_score',
])]
class IssueAnswer extends Model
{
    use SoftDeletes;

    protected function casts(): array
    {
        return [
            'status' => IssueAnswerStatus::class,
            'is_accepted' => 'boolean',
            'is_ai_generated' => 'boolean',
            'ai_sources' => 'array',
            'ai_feedback_score' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(IssueQuestion::class, 'issue_question_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function blocks(): HasMany
    {
        return $this->hasMany(IssueAnswerBlock::class)->orderBy('sort_order');
    }

    public function comments(): MorphMany
    {
        return $this->morphMany(Comment::class, 'commentable');
    }

    public function reports(): MorphMany
    {
        return $this->morphMany(Report::class, 'reportable');
    }

    public function savedItems(): MorphMany
    {
        return $this->morphMany(SavedItem::class, 'saveable');
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', IssueAnswerStatus::Published->value);
    }

    public function isAuthor(?User $user): bool
    {
        return $user !== null && $this->author_id === $user->id;
    }
}
