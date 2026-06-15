<?php

namespace App\Models;

use App\Enums\PublicationStatus;
use App\Enums\PublicationType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable('author_id',
        'type',
        'title',
        'slug',
        'excerpt',
        'status',
        'cover_image_path',
        'reading_time_minutes',
        'views_count',
        'published_at',)]

class Publication extends Model
{
    use SoftDeletes;

    protected function casts(): array
    {
        return [
            'type' => PublicationType::class,
            'status' => PublicationStatus::class,
            'published_at' => 'datetime',
            'reading_time_minutes' => 'integer',
            'views_count' => 'integer',
        ];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function blocks(): HasMany
    {
        return $this->hasMany(PublicationBlock::class)
            ->orderBy('sort_order');
    }

    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable')->withTimestamps();
    }

    public function comments(): MorphMany
    {
        return $this->morphMany(Comment::class, 'commentable');
    }

    public function reactions(): MorphMany
    {
        return $this->morphMany(Reaction::class, 'reactable');
    }

    public function reports(): MorphMany
    {
        return $this->morphMany(Report::class, 'reportable');
    }

    public function savedItems(): MorphMany
    {
        return $this->morphMany(SavedItem::class, 'saveable');
    }

    public function views(): HasMany
    {
        return $this->hasMany(PublicationView::class);
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(ContentAttachment::class, 'attachable')->orderBy('sort_order');
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', PublicationStatus::Published->value);
    }

    public function isPublished(): bool
    {
        return $this->status === PublicationStatus::Published;
    }

    public function isAuthor(?User $user): bool
    {
        return $user !== null && $this->author_id === $user->id;
    }
}
