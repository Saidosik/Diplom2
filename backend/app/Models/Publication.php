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
        'cover_file_id',
        'cover_alt_text',
        'cover_caption',
        'reading_time_minutes',
        'last_autosaved_at',
        'editor_state',
        'autosave_version',
        'seo_title',
        'seo_description',
        'canonical_url',
        'og_image_file_id',
        'og_image_path',
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
            'last_autosaved_at' => 'datetime',
            'editor_state' => 'array',
            'autosave_version' => 'integer',
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

    public function versions(): HasMany
    {
        return $this->hasMany(PublicationVersion::class)->latest('version_number');
    }

    public function studioAttachments(): HasMany
    {
        return $this->hasMany(PublicationAttachment::class)->orderBy('sort_order');
    }

    public function snippets(): HasMany
    {
        return $this->hasMany(PublicationSnippet::class)->orderBy('sort_order');
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
