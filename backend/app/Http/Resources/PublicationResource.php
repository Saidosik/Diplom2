<?php

namespace App\Http\Resources;

use App\Http\Resources\Issue\TagResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Services\PublicationRankingService;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PublicationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type?->value,
            'content_type' => $this->type?->value,
            'type_label' => $this->type?->label(),
            'content_type_label' => $this->type?->label(),
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'title' => $this->title,
            'slug' => $this->slug,
            'excerpt' => $this->excerpt,
            'cover_image_path' => $this->cover_image_path,
            'cover_image_url' => $this->coverImageUrl(),
            'reading_time_minutes' => $this->reading_time_minutes,
            'reading_time' => $this->reading_time_minutes,
            'views_count' => (int) ($this->views_count ?? 0),
            'rating' => app(PublicationRankingService::class)->rating($this->resource),
            'score' => (float) ($this->score ?? app(PublicationRankingService::class)->score($this->resource)),
            'rank_position' => $this->when(isset($this->rank_position), (int) ($this->rank_position ?? 0)),
            'reason_label' => $this->reason_label ?? app(PublicationRankingService::class)->reasonLabel($this->resource, (string) $request->query('period', 'week')),
            'likes_count' => (int) ($this->likes_count ?? 0),
            'dislikes_count' => (int) ($this->dislikes_count ?? 0),
            'comments_count' => (int) ($this->comments_count ?? 0),
            'saved_count' => (int) ($this->saved_items_count ?? $this->savedItems_count ?? 0),
            'my_reaction' => $this->myReaction(),
            'is_saved' => $this->isSaved($request),
            'is_saved_by_me' => $this->isSaved($request),
            'is_liked_by_me' => $this->myReaction() === 'like',
            'published_at' => $this->published_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'is_owner' => $request->user()?->id === $this->author_id,
            'author' => $this->whenLoaded('author', function () {
                return [
                    'id' => $this->author->id,
                    'name' => $this->author->name,
                    'role' => $this->author->role,
                    'reputation_score' => (int) ($this->author->reputation_score ?? 0),
                    'reputation_level' => method_exists($this->author, 'reputationLevel') ? $this->author->reputationLevel() : null,
                    'avatar' => $this->author->avatar,
                    'avatar_url' => $this->author->avatar
                        ? Storage::disk('public')->url($this->author->avatar)
                        : null,
                ];
            }),
            'tags' => TagResource::collection($this->whenLoaded('tags')),
            'blocks' => PublicationBlockResource::collection($this->whenLoaded('blocks')),
            'attachments' => ContentAttachmentResource::collection($this->whenLoaded('attachments')),
        ];
    }

    private function coverImageUrl(): ?string
    {
        if (!$this->cover_image_path) {
            return null;
        }

        if (Str::startsWith($this->cover_image_path, ['http://', 'https://', '/storage/'])) {
            return $this->cover_image_path;
        }

        return Storage::disk('public')->url($this->cover_image_path);
    }

    private function myReaction(): ?string
    {
        if (!$this->relationLoaded('reactions')) {
            return null;
        }

        return $this->reactions->first()?->type;
    }

    private function isSaved(Request $request): bool
    {
        $user = $request->user();

        if (!$user) {
            return false;
        }

        if ($this->relationLoaded('savedItems')) {
            return $this->savedItems->where('user_id', $user->id)->isNotEmpty();
        }

        return $this->savedItems()->where('user_id', $user->id)->exists();
    }
}
