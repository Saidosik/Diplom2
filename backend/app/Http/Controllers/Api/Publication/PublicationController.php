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
use App\Models\PublicationView;
use App\Models\Reaction;
use App\Models\Tag;
use App\Models\ContentAttachment;
use App\Models\UserFile;
use App\Models\PublicationVersion;
use App\Models\PublicationTemplate;
use App\Models\PublicationLock;
use App\Models\PublicationAiSuggestion;
use App\Services\PublicationQualityAnalyzer;
use App\Services\PublicationMarkdownConverter;
use App\Services\Community\CommunityActivityService;
use App\Services\PublicationRankingService;
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


        if ($period = (string) $request->query('period', '')) {
            if (in_array($period, ['day', 'week', 'month'], true)) {
                $query->where('published_at', '>=', match ($period) {
                    'day' => now()->subDay(),
                    'month' => now()->subMonth(),
                    default => now()->subWeek(),
                });
            }
        }

        match ((string) $request->query('sort', 'latest')) {
            'popular' => $query->orderByDesc('likes_count')->orderByDesc('comments_count')->orderByDesc('views_count')->latest('published_at'),
            'discussed' => $query->orderByDesc('comments_count')->latest('published_at'),
            'rating' => $query->orderByDesc('likes_count')->orderBy('dislikes_count')->latest('published_at'),
            'views' => $query->orderByDesc('views_count')->latest('published_at'),
            'saved' => $query->orderByDesc('saved_items_count')->latest('published_at'),
            default => $query->latest('published_at'),
        };

        $perPage = min(max((int) $request->query('per_page', 12), 1), 50);

        return PublicationResource::collection($query->paginate($perPage));
    }

    public function recordView(Request $request, string $publication): JsonResponse
    {
        $publicationModel = Publication::query()->published()->where('slug', $publication)->firstOrFail();
        $user = $request->user();

        if ($user && (int) $user->id === (int) $publicationModel->author_id) {
            return response()->json(['views_count' => (int) $publicationModel->views_count, 'counted' => false, 'reason' => 'author_view']);
        }

        $ipHash = hash('sha256', (string) $request->ip());
        $uaHash = hash('sha256', substr((string) $request->userAgent(), 0, 255));
        $threshold = now()->subHours(6);

        $recent = PublicationView::query()
            ->where('publication_id', $publicationModel->id)
            ->where('viewed_at', '>=', $threshold)
            ->where(function (Builder $builder) use ($user, $ipHash, $uaHash) {
                if ($user) {
                    $builder->where('user_id', $user->id);
                } else {
                    $builder->where('ip_hash', $ipHash)->where('user_agent_hash', $uaHash);
                }
            })
            ->exists();

        if (! $recent) {
            PublicationView::query()->create([
                'publication_id' => $publicationModel->id,
                'user_id' => $user?->id,
                'ip_hash' => $ipHash,
                'user_agent_hash' => $uaHash,
                'viewed_at' => now(),
            ]);
            $publicationModel->increment('views_count');
            $publicationModel->refresh();
        }

        return response()->json(['views_count' => (int) $publicationModel->views_count, 'counted' => ! $recent]);
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
                'cover_file_id' => $data['cover_file_id'] ?? null,
                'cover_alt_text' => $data['cover_alt_text'] ?? null,
                'cover_caption' => $data['cover_caption'] ?? null,
                'seo_title' => $data['seo_title'] ?? null,
                'seo_description' => $data['seo_description'] ?? null,
                'canonical_url' => $data['canonical_url'] ?? null,
                'reading_time_minutes' => $this->resolveReadingTime($data),
                'published_at' => $status === PublicationStatus::Published ? now() : null,
            ]);

            $this->syncBlocks($publication, $data['blocks']);
            $this->syncTags($publication, $data['tags'] ?? []);
            $this->syncAttachments($publication, $data['attachment_ids'] ?? [], (int) $request->user()->id);

            return $publication;
        });

        $this->createVersion($publication, (int) $request->user()->id, $publication->status === PublicationStatus::Published ? 'Публикация' : 'Ручное сохранение');

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
                'cover_file_id' => $data['cover_file_id'] ?? null,
                'cover_alt_text' => $data['cover_alt_text'] ?? null,
                'cover_caption' => $data['cover_caption'] ?? null,
                'seo_title' => $data['seo_title'] ?? null,
                'seo_description' => $data['seo_description'] ?? null,
                'canonical_url' => $data['canonical_url'] ?? null,
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

        $this->createVersion($publication, (int) $request->user()->id, $publication->status === PublicationStatus::Published ? 'Публикация' : 'Ручное сохранение');

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


    public function createDraftIfNotExists(Request $request)
    {
        $draft = Publication::query()->firstOrCreate(
            ['author_id' => $request->user()->id, 'status' => PublicationStatus::Draft->value, 'title' => 'Новый черновик'],
            ['type' => PublicationType::Article->value, 'slug' => $this->makeUniqueSlug('new-draft'), 'excerpt' => null, 'reading_time_minutes' => 1, 'editor_state' => ['blocks' => []], 'autosave_version' => 0]
        );
        return new PublicationResource($draft->load(['author','tags','blocks','attachments.userFile']));
    }

    public function autosave(Request $request, Publication $publication)
    {
        $this->authorizePublication($request, $publication);
        $data = $request->validate(['autosave_version'=>['required','integer','min:0'],'editor_state'=>['required','array'],'title'=>['nullable','string','max:180'],'excerpt'=>['nullable','string','max:1000'],'blocks'=>['nullable','array'],'tags'=>['nullable','array']]);
        if ((int)$data['autosave_version'] !== (int)$publication->autosave_version) {
            return response()->json(['message'=>'Конфликт версии','current_version'=>$publication->autosave_version], 409);
        }
        $publication->fill(['title'=>$data['title'] ?: $publication->title, 'excerpt'=>$data['excerpt'] ?? $publication->excerpt, 'editor_state'=>$data['editor_state'], 'autosave_version'=>$publication->autosave_version + 1, 'last_autosaved_at'=>now()])->save();
        if (!empty($data['blocks'])) $this->syncBlocks($publication, $data['blocks']);
        if (array_key_exists('tags',$data)) $this->syncTags($publication, $data['tags'] ?? []);
        return response()->json(['data'=>['id'=>$publication->id,'autosave_version'=>$publication->autosave_version,'last_autosaved_at'=>$publication->last_autosaved_at]]);
    }

    public function drafts(Request $request) { return PublicationResource::collection(Publication::query()->where('author_id',$request->user()->id)->where('status',PublicationStatus::Draft->value)->with(['author','tags','blocks'])->latest('updated_at')->paginate(24)); }
    public function duplicateDraft(Request $request, Publication $publication) { $this->authorizePublication($request,$publication); $copy=$publication->replicate(['slug','published_at']); $copy->title=$publication->title.' — копия'; $copy->slug=$this->makeUniqueSlug($copy->title); $copy->status=PublicationStatus::Draft->value; $copy->published_at=null; $copy->save(); foreach($publication->blocks as $b) $copy->blocks()->create($b->only(['type','sort_order','content'])); return new PublicationResource($copy->load(['author','tags','blocks'])); }
    public function publishDraft(Request $request, Publication $publication, CommunityActivityService $community) { $this->authorizePublication($request,$publication); $check=$this->prepublishCheck($request,$publication)->getData(true); if(!empty($check['blockers'])) return response()->json($check,422); $publication->update(['status'=>PublicationStatus::Published->value,'published_at'=>$publication->published_at ?? now()]); $this->createVersion($publication,(int)$request->user()->id,'Публикация черновика'); return new PublicationResource($publication->load(['author','tags','blocks'])); }

    public function versions(Request $request, Publication $publication) { $this->authorizePublication($request,$publication); return response()->json(['data'=>$publication->versions()->get()]); }
    public function version(Request $request, Publication $publication, int $version) { $this->authorizePublication($request,$publication); return response()->json(['data'=>$publication->versions()->where('version_number',$version)->firstOrFail()]); }
    public function restoreVersion(Request $request, Publication $publication, int $version) { $this->authorizePublication($request,$publication); $v=$publication->versions()->where('version_number',$version)->firstOrFail(); $publication->update(['title'=>$v->title,'excerpt'=>$v->excerpt,'cover_image_path'=>$v->cover_image_path,'editor_state'=>$v->editor_state]); $this->syncBlocks($publication, $v->editor_state['blocks'] ?? []); $this->syncTags($publication, $v->tags ?? []); return new PublicationResource($publication->load(['author','tags','blocks'])); }

    public function analyzeQuality(Request $request, PublicationQualityAnalyzer $analyzer) { return response()->json($analyzer->analyze($request->all())); }
    public function prepublishCheck(Request $request, Publication $publication, ?PublicationQualityAnalyzer $analyzer=null) { $this->authorizePublication($request,$publication); $analyzer ??= app(PublicationQualityAnalyzer::class); $payload=['title'=>$publication->title,'excerpt'=>$publication->excerpt,'tags'=>$publication->tags()->pluck('name')->all(),'blocks'=>$publication->blocks()->get()->map->only(['type','content'])->all()]; $quality=$analyzer->analyze($payload); return response()->json(['blockers'=>$quality['blockers'],'warnings'=>$quality['warnings'],'suggestions'=>$quality['suggestions'],'summary'=>['quality_score'=>$quality['score'],'attachments'=>$publication->attachments()->count()]]); }
    public function exportMarkdown(Request $request, Publication $publication, PublicationMarkdownConverter $converter) { $this->authorizePublication($request,$publication); return response($converter->export(['title'=>$publication->title,'blocks'=>$publication->blocks()->get()->map->only(['type','content'])->all()]),200,['Content-Type'=>'text/markdown']); }
    public function importMarkdown(Request $request, PublicationMarkdownConverter $converter) { $data=$request->validate(['markdown'=>['required','string']]); return response()->json(['data'=>['blocks'=>$converter->import($data['markdown'])]]); }

    public function templates(Request $request) { $this->seedSystemTemplates(); return response()->json(['data'=>PublicationTemplate::query()->where(fn($q)=>$q->where('is_system',true)->orWhere('user_id',$request->user()->id))->latest('is_system')->get()]); }
    public function storeTemplate(Request $request) { $d=$request->validate(['title'=>'required|string|max:120','description'=>'nullable|string','category'=>'nullable|string','blocks_schema'=>'required|array','tags'=>'nullable|array']); $d['user_id']=$request->user()->id; $d['slug']=$this->makeUniqueTagSlug($d['title']); return response()->json(['data'=>PublicationTemplate::create($d)],201); }
    public function destroyTemplate(Request $request, PublicationTemplate $template) { abort_unless(!$template->is_system && $template->user_id===$request->user()->id,403); $template->delete(); return response()->json(['message'=>'Шаблон удалён.']); }
    public function applyTemplate(Request $request, PublicationTemplate $template) { abort_unless($template->is_system || $template->user_id===$request->user()->id,403); return response()->json(['data'=>['blocks'=>$template->blocks_schema,'tags'=>$template->tags ?? []]]); }

    public function acquireLock(Request $request, Publication $publication) { $this->authorizePublication($request,$publication); $lock=PublicationLock::updateOrCreate(['publication_id'=>$publication->id],['user_id'=>$request->user()->id,'locked_until'=>now()->addMinutes(2)]); return response()->json(['data'=>$lock]); }
    public function releaseLock(Request $request, Publication $publication) { PublicationLock::where('publication_id',$publication->id)->where('user_id',$request->user()->id)->delete(); return response()->json(['message'=>'Lock released']); }

    public function aiCopilot(Request $request) { $d=$request->validate(['publication_id'=>'nullable|integer','type'=>'required|string','payload'=>'nullable|array']); $payload=['text'=>'AI Copilot подготовил черновую рекомендацию для действия '.$d['type'],'patch'=>$d['payload'] ?? []]; $s=PublicationAiSuggestion::create(['publication_id'=>$d['publication_id']??null,'user_id'=>$request->user()->id,'type'=>$d['type'],'payload'=>$payload]); return response()->json(['data'=>$s],201); }
    public function resolveAiSuggestion(Request $request, PublicationAiSuggestion $suggestion) { abort_unless($suggestion->user_id===$request->user()->id,403); $d=$request->validate(['status'=>'required|in:accepted,rejected']); $suggestion->update(['status'=>$d['status']]); return response()->json(['data'=>$suggestion]); }

    private function createVersion(Publication $publication, int $userId, string $summary): PublicationVersion { $num=(int)$publication->versions()->max('version_number')+1; return PublicationVersion::create(['publication_id'=>$publication->id,'user_id'=>$userId,'title'=>$publication->title,'excerpt'=>$publication->excerpt,'tags'=>$publication->tags()->pluck('name')->all(),'editor_state'=>['blocks'=>$publication->blocks()->get()->map->only(['type','sort_order','content'])->all()],'cover_image_path'=>$publication->cover_image_path,'attachment_ids'=>$publication->attachments()->pluck('user_file_id')->all(),'version_number'=>$num,'change_summary'=>$summary]); }
    private function seedSystemTemplates(): void { foreach(['Статья','Гайд','Туториал','Разбор ошибки','DevOps runbook','Laravel guide','API documentation','Q&A recap','Сравнение технологий','Чеклист'] as $title) PublicationTemplate::firstOrCreate(['user_id'=>null,'slug'=>$this->makeUniqueTagSlug($title)],['title'=>$title,'category'=>'system','is_system'=>true,'blocks_schema'=>[['type'=>'heading','sort_order'=>0,'content'=>['text'=>$title,'level'=>2]],['type'=>'paragraph','sort_order'=>1,'content'=>['text'=>'Ключевая идея материала.']]],'tags'=>[]]); }

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
