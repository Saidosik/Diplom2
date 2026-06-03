<?php

namespace App\Http\Controllers\Api\Publication;

use App\Enums\PublicationStatus;
use App\Enums\PublicationType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Publication\IndexPublicationRequest;
use App\Http\Requests\Publication\StorePublicationRequest;
use App\Http\Requests\Publication\UpdatePublicationRequest;
use App\Http\Resources\PublicationResource;
use App\Models\Publication;
use App\Models\Reaction;
use App\Models\Tag;
use App\Models\ContentAttachment;
use App\Models\UserFile;
use App\Services\Community\CommunityActivityService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PublicationController extends Controller
{
    public function index(IndexPublicationRequest $request)
    {
        $query = Publication::query()
            ->published()
            ->with(['author', 'tags'])
            ->withCount([
                'comments',
                'savedItems',
                'reactions as likes_count' => fn (Builder $query) => $query->where('type', Reaction::LIKE),
                'reactions as dislikes_count' => fn (Builder $query) => $query->where('type', Reaction::DISLIKE),
            ]);

        if ($search = trim((string) $request->query('search'))) {
            $query->where(function ($builder) use ($search) {
                $builder->where('title', 'ilike', "%{$search}%")
                    ->orWhere('excerpt', 'ilike', "%{$search}%");
            });
        }

        if ($type = $request->query('type')) {
            if (in_array($type, PublicationType::values(), true)) {
                $query->where('type', $type);
            }
        }

        if ($tag = trim((string) $request->query('tag'))) {
            $tagSlug = Str::slug($tag);
            $query->whereHas('tags', function (Builder $builder) use ($tag, $tagSlug) {
                $builder->where('slug', $tag)
                    ->when($tagSlug !== '', fn (Builder $query) => $query->orWhere('slug', $tagSlug))
                    ->orWhere('name', 'ilike', $tag);
            });
        }


        match ((string) $request->query('sort', 'latest')) {
            'popular' => $query->orderByDesc('likes_count')->orderByDesc('comments_count')->latest('published_at'),
            'discussed' => $query->orderByDesc('comments_count')->latest('published_at'),
            'saved' => $query->orderByDesc('saved_items_count')->latest('published_at'),
            default => $query->latest('published_at'),
        };

        $perPage = min(max((int) $request->query('per_page', 12), 1), 50);

        return PublicationResource::collection($query->paginate($perPage));
    }

    public function myIndex(Request $request)
    {
        $query = Publication::query()
            ->where('author_id', $request->user()->id)
            ->with(['author', 'tags'])
            ->withCount([
                'comments',
                'savedItems',
                'reactions as likes_count' => fn (Builder $query) => $query->where('type', Reaction::LIKE),
                'reactions as dislikes_count' => fn (Builder $query) => $query->where('type', Reaction::DISLIKE),
            ])
            ->latest('updated_at');

        if ($status = $request->query('status')) {
            if (in_array($status, PublicationStatus::values(), true)) {
                $query->where('status', $status);
            }
        }

        $perPage = min(max((int) $request->query('per_page', 12), 1), 50);

        return PublicationResource::collection($query->paginate($perPage));
    }

    public function show(Request $request, string $publication)
    {
        $query = Publication::query()
            ->published()
            ->with(['author', 'tags', 'blocks', 'attachments.userFile'])
            ->withCount([
                'comments',
                'savedItems',
                'reactions as likes_count' => fn (Builder $query) => $query->where('type', Reaction::LIKE),
                'reactions as dislikes_count' => fn (Builder $query) => $query->where('type', Reaction::DISLIKE),
            ])
            ->where('slug', $publication)
            ->firstOrFail();

        return new PublicationResource($query);
    }

    public function showMineBySlug(Request $request, string $publication)
    {
        $query = Publication::query()
            ->where('slug', $publication)
            ->where(function (Builder $builder) use ($request) {
                $builder->where('status', PublicationStatus::Published->value)
                    ->orWhere('author_id', $request->user()->id);
            })
            ->with(['author', 'tags', 'blocks', 'attachments.userFile'])
            ->with(['reactions' => fn ($builder) => $builder->where('user_id', $request->user()->id)])
            ->with(['savedItems' => fn ($builder) => $builder->where('user_id', $request->user()->id)])
            ->withCount([
                'comments',
                'savedItems',
                'reactions as likes_count' => fn (Builder $query) => $query->where('type', Reaction::LIKE),
                'reactions as dislikes_count' => fn (Builder $query) => $query->where('type', Reaction::DISLIKE),
            ])
            ->firstOrFail();

        return new PublicationResource($query);
    }

    public function edit(Request $request, Publication $publication)
    {
        $this->authorizePublication($request, $publication);

        return new PublicationResource(
            $publication->load(['author', 'tags', 'blocks', 'attachments.userFile'])
                ->load(['savedItems' => fn ($builder) => $builder->where('user_id', $request->user()->id)])
                ->loadCount([
                    'comments',
                'savedItems',
                    'reactions as likes_count' => fn (Builder $query) => $query->where('type', Reaction::LIKE),
                    'reactions as dislikes_count' => fn (Builder $query) => $query->where('type', Reaction::DISLIKE),
                ])
        );
    }

    public function store(StorePublicationRequest $request, CommunityActivityService $community)
    {
        $publication = DB::transaction(function () use ($request) {
            $data = $request->validated();
            $status = PublicationStatus::from($data['status']);

            $publication = Publication::query()->create([
                'author_id' => $request->user()->id,
                'type' => $data['type'],
                'status' => $data['status'],
                'title' => $data['title'],
                'slug' => $this->makeUniqueSlug($data['slug'] ?? $data['title']),
                'excerpt' => $this->normalizeExcerpt($data),
                'cover_image_path' => $data['cover_image_path'] ?? null,
                'reading_time_minutes' => $this->resolveReadingTime($data),
                'published_at' => $status === PublicationStatus::Published ? now() : null,
            ]);

            $this->syncBlocks($publication, $data['blocks']);
            $this->syncTags($publication, $data['tags'] ?? []);
            $this->syncAttachments($publication, $data['attachment_ids'] ?? [], (int) $request->user()->id);

            return $publication;
        });

        app(\App\Services\Ai\AiIndexingDispatcher::class)->queue('publication', (int) $publication->id, false, $request->user()->id);

        if ($publication->status === PublicationStatus::Published) {
            $community->record(
                $request->user(),
                CommunityActivityService::ACTIVITY_PUBLICATION_CREATED,
                $publication,
                null,
                ['publication_id' => $publication->id, 'type' => $publication->type?->value ?? $publication->type],
                "{$request->user()->name} опубликовал материал",
                $publication->title,
                "/publications/{$publication->slug}",
                12
            );

            $community->awardReputation(
                $request->user(),
                10,
                CommunityActivityService::REASON_PUBLICATION_CREATED,
                $publication
            );

            $community->notifySubscribers(
                $request->user(),
                'author_publication',
                'Новая публикация автора',
                "{$request->user()->name} опубликовал новый материал: {$publication->title}",
                "/publications/{$publication->slug}",
                ['publication_id' => $publication->id],
                $request->user()
            );
        }

        return (new PublicationResource($publication->load(['author', 'tags', 'blocks', 'attachments.userFile'])))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdatePublicationRequest $request, Publication $publication, CommunityActivityService $community)
    {
        $this->authorizePublication($request, $publication);

        $publication = DB::transaction(function () use ($request, $publication) {
            $data = $request->validated();
            $status = PublicationStatus::from($data['status']);

            $publication->update([
                'type' => $data['type'],
                'status' => $data['status'],
                'title' => $data['title'],
                'slug' => $this->makeUniqueSlug($data['slug'] ?? $publication->slug ?? $data['title'], $publication->id),
                'excerpt' => $this->normalizeExcerpt($data),
                'cover_image_path' => $data['cover_image_path'] ?? null,
                'reading_time_minutes' => $this->resolveReadingTime($data),
                'published_at' => $status === PublicationStatus::Published
                    ? ($publication->published_at ?? now())
                    : null,
            ]);

            $this->syncBlocks($publication, $data['blocks']);
            $this->syncTags($publication, $data['tags'] ?? []);
            $this->syncAttachments($publication, $data['attachment_ids'] ?? [], (int) $request->user()->id);

            return $publication;
        });

        app(\App\Services\Ai\AiIndexingDispatcher::class)->queue('publication', (int) $publication->id, true, $request->user()->id);

        if ($publication->status === PublicationStatus::Published && $publication->wasChanged('published_at')) {
            $community->record(
                $request->user(),
                CommunityActivityService::ACTIVITY_PUBLICATION_CREATED,
                $publication,
                null,
                ['publication_id' => $publication->id, 'type' => $publication->type?->value ?? $publication->type],
                "{$request->user()->name} опубликовал материал",
                $publication->title,
                "/publications/{$publication->slug}",
                12
            );

            $community->notifySubscribers(
                $request->user(),
                'author_publication',
                'Автор опубликовал материал',
                "{$request->user()->name} опубликовал материал: {$publication->title}",
                "/publications/{$publication->slug}",
                ['publication_id' => $publication->id],
                $request->user()
            );
        }

        return new PublicationResource($publication->load(['author', 'tags', 'blocks', 'attachments.userFile']));
    }

    public function destroy(Request $request, Publication $publication): JsonResponse
    {
        $this->authorizePublication($request, $publication);

        $publication->delete();
        app(\App\Services\Ai\AiIndexingDispatcher::class)->queue('publication', (int) $publication->id, true, $request->user()->id);

        return response()->json([
            'message' => 'Публикация удалена.',
        ]);
    }

    private function authorizePublication(Request $request, Publication $publication): void
    {
        $user = $request->user();

        abort_unless(
            $user && ($publication->author_id === $user->id || $user->isAdmin()),
            403,
            'Нет доступа к этой публикации.'
        );
    }

    /**
     * @param array<int, array<string, mixed>> $blocks
     */
    private function syncBlocks(Publication $publication, array $blocks): void
    {
        $publication->blocks()->delete();

        foreach (array_values($blocks) as $index => $block) {
            $publication->blocks()->create([
                'type' => $block['type'],
                'sort_order' => $block['sort_order'] ?? $index,
                'content' => $block['content'] ?? [],
            ]);
        }
    }

    /**
     * @param array<int, string> $tags
     */
    private function syncTags(Publication $publication, array $tags): void
    {
        $tagIds = collect($tags)
            ->map(fn ($tag) => trim((string) $tag))
            ->filter()
            ->unique(fn ($tag) => Str::lower($tag))
            ->take(10)
            ->map(function (string $name) {
                $slug = $this->makeUniqueTagSlug($name);

                return Tag::query()->firstOrCreate(
                    ['slug' => $slug],
                    ['name' => $name, 'status' => 'active']
                )->id;
            })
            ->values()
            ->all();

        $publication->tags()->sync($tagIds);
    }

    /**
     * @param array<int, int|string> $fileIds
     */
    private function syncAttachments(Publication $publication, array $fileIds, int $userId): void
    {
        $ids = collect($fileIds)
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->unique()
            ->take(12)
            ->values();

        $publication->attachments()->delete();

        if ($ids->isEmpty()) {
            return;
        }

        $files = UserFile::query()
            ->where('user_id', $userId)
            ->whereIn('id', $ids->all())
            ->get()
            ->keyBy('id');

        foreach ($ids as $index => $fileId) {
            if (! $files->has($fileId)) {
                continue;
            }

            $publication->attachments()->create([
                'user_id' => $userId,
                'user_file_id' => $fileId,
                'sort_order' => $index,
            ]);
        }
    }

    private function makeUniqueSlug(string $value, ?int $ignoreId = null): string
    {
        $base = Str::slug($value);

        if ($base === '') {
            $base = 'publication-' . now()->format('YmdHis');
        }

        $slug = $base;
        $counter = 2;

        while (
            Publication::query()
                ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
                ->where('slug', $slug)
                ->withTrashed()
                ->exists()
        ) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }

    private function makeUniqueTagSlug(string $value): string
    {
        $base = Str::slug($value);

        if ($base === '') {
            $base = 'tag-' . Str::random(8);
        }

        return $base;
    }

    /**
     * @param array<string, mixed> $data
     */
    private function normalizeExcerpt(array $data): ?string
    {
        $excerpt = trim((string) ($data['excerpt'] ?? ''));

        if ($excerpt !== '') {
            return $excerpt;
        }

        foreach ($data['blocks'] ?? [] as $block) {
            $text = trim((string) Arr::get($block, 'content.text', ''));

            if ($text !== '') {
                return Str::limit(strip_tags($text), 260);
            }
        }

        return null;
    }

    /**
     * @param array<string, mixed> $data
     */
    private function resolveReadingTime(array $data): int
    {
        $minutes = (int) ($data['reading_time_minutes'] ?? 0);

        if ($minutes > 0) {
            return min($minutes, 999);
        }

        return $this->calculateReadingTime($data['blocks'] ?? []);
    }

    /**
     * @param array<int, array<string, mixed>> $blocks
     */
    private function calculateReadingTime(array $blocks): int
    {
        $text = collect($blocks)
            ->map(fn ($block) => $this->flattenText($block['content'] ?? []))
            ->implode(' ');

        preg_match_all('/[\p{L}\p{N}_]+/u', strip_tags($text), $matches);

        $words = count($matches[0] ?? []);

        return max(1, (int) ceil($words / 180));
    }

    /**
     * @param mixed $value
     */
    private function flattenText($value): string
    {
        if (is_string($value) || is_numeric($value)) {
            return (string) $value;
        }

        if (!is_array($value)) {
            return '';
        }

        return collect($value)
            ->map(fn ($item) => $this->flattenText($item))
            ->implode(' ');
    }
}
