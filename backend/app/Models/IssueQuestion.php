<?php

namespace App\Models;

use App\Enums\IssueQuestionStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'author_id',
    'title',
    'slug',
    'excerpt',
    'status',
    'is_solved',
    'accepted_answer_id',
    'views_count',
    'published_at',
])]
class IssueQuestion extends Model
{
    use SoftDeletes;

    protected function casts(): array
    {
        return [
            'status' => IssueQuestionStatus::class,
            'is_solved' => 'boolean',
            'views_count' => 'integer',
            'published_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function blocks(): HasMany
    {
        return $this->hasMany(IssueBlock::class)->orderBy('sort_order');
    }

    public function answers(): HasMany
    {
        return $this->hasMany(IssueAnswer::class)->latest('is_accepted')->oldest();
    }

    public function acceptedAnswer(): BelongsTo
    {
        return $this->belongsTo(IssueAnswer::class, 'accepted_answer_id');
    }

    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable')->withTimestamps();
    }

    public function reactions(): MorphMany
    {
        return $this->morphMany(Reaction::class, 'reactable');
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

    public function attachments(): MorphMany
    {
        return $this->morphMany(ContentAttachment::class, 'attachable')->orderBy('sort_order');
    }


    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', IssueQuestionStatus::Published->value);
    }

    public function isPublished(): bool
    {
        return $this->status === IssueQuestionStatus::Published;
    }

    public function isAuthor(?User $user): bool
    {
        return $user !== null && $this->author_id === $user->id;
    }
}
