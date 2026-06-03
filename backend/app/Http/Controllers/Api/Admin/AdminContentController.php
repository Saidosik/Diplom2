<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\IssueAnswerStatus;
use App\Enums\IssueQuestionStatus;
use App\Enums\PublicationStatus;
use App\Http\Controllers\Controller;
use App\Models\Comment;
use App\Models\IssueAnswer;
use App\Models\IssueQuestion;
use App\Models\Publication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class AdminContentController extends Controller
{
    public function publications(Request $request): JsonResponse
    {
        $validated = $request->validate($this->listRules(PublicationStatus::values()));
        $query = Publication::withTrashed()
            ->with(['author', 'tags'])
            ->withCount(['comments', 'reports', 'reactions', 'savedItems'])
            ->latest();

        $this->applyStatusFilter($query, $validated);
        $this->applySearch($query, $validated, ['title', 'excerpt', 'slug']);

        return $this->paginated($query->paginate((int) ($validated['per_page'] ?? 20)), fn ($item) => $this->serializePublication($item));
    }

    public function updatePublication(Request $request, int $publication): JsonResponse
    {
        $model = Publication::withTrashed()->findOrFail($publication);
        $data = $request->validate(['status' => ['required', Rule::in(PublicationStatus::values())]]);
        $model->update(['status' => $data['status']]);
        app(\App\Services\Ai\AiIndexingDispatcher::class)->queue('publication', (int) $model->id, true, auth()->id());

        return response()->json(['data' => $this->serializePublication($model->fresh(['author', 'tags']))]);
    }

    public function destroyPublication(int $publication): JsonResponse
    {
        $model = Publication::query()->findOrFail($publication);
        $model->delete();
        app(\App\Services\Ai\AiIndexingDispatcher::class)->queue('publication', (int) $model->id, true, auth()->id());
        $model = Publication::withTrashed()->with(['author', 'tags'])->findOrFail($publication);

        return response()->json(['data' => $this->serializePublication($model)]);
    }

    public function restorePublication(int $publication): JsonResponse
    {
        $model = Publication::withTrashed()->findOrFail($publication);
        $model->restore();
        app(\App\Services\Ai\AiIndexingDispatcher::class)->queue('publication', (int) $model->id, true, auth()->id());

        return response()->json(['data' => $this->serializePublication($model->fresh(['author', 'tags']))]);
    }

    public function questions(Request $request): JsonResponse
    {
        $validated = $request->validate($this->listRules(IssueQuestionStatus::values()));
        $query = IssueQuestion::withTrashed()
            ->with(['author', 'tags'])
            ->withCount(['answers', 'comments', 'reports', 'reactions', 'savedItems'])
            ->latest();

        $this->applyStatusFilter($query, $validated);
        $this->applySearch($query, $validated, ['title', 'excerpt', 'slug']);

        return $this->paginated($query->paginate((int) ($validated['per_page'] ?? 20)), fn ($item) => $this->serializeQuestion($item));
    }

    public function updateQuestion(Request $request, int $question): JsonResponse
    {
        $model = IssueQuestion::withTrashed()->findOrFail($question);
        $data = $request->validate(['status' => ['required', Rule::in(IssueQuestionStatus::values())]]);
        $model->update(['status' => $data['status']]);
        app(\App\Services\Ai\AiIndexingDispatcher::class)->queue('question', (int) $model->id, true, auth()->id());

        return response()->json(['data' => $this->serializeQuestion($model->fresh(['author', 'tags']))]);
    }

    public function destroyQuestion(int $question): JsonResponse
    {
        $model = IssueQuestion::query()->findOrFail($question);
        $model->delete();
        app(\App\Services\Ai\AiIndexingDispatcher::class)->queue('question', (int) $model->id, true, auth()->id());
        $model = IssueQuestion::withTrashed()->with(['author', 'tags'])->findOrFail($question);

        return response()->json(['data' => $this->serializeQuestion($model)]);
    }

    public function restoreQuestion(int $question): JsonResponse
    {
        $model = IssueQuestion::withTrashed()->findOrFail($question);
        $model->restore();
        app(\App\Services\Ai\AiIndexingDispatcher::class)->queue('question', (int) $model->id, true, auth()->id());

        return response()->json(['data' => $this->serializeQuestion($model->fresh(['author', 'tags']))]);
    }

    public function answers(Request $request): JsonResponse
    {
        $validated = $request->validate($this->listRules(IssueAnswerStatus::values()));
        $query = IssueAnswer::query()
            ->with(['author', 'question'])
            ->withCount(['comments', 'reports'])
            ->latest();

        if (! empty($validated['status']) && $validated['status'] !== 'all') {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['q'])) {
            $search = trim($validated['q']);
            $query->where(function ($builder) use ($search) {
                $builder->whereHas('question', fn ($q) => $q->where('title', 'ILIKE', "%{$search}%"))
                    ->orWhereHas('blocks', fn ($blocks) => $blocks->whereRaw('content::text ILIKE ?', ["%{$search}%"]));
            });
        }

        return $this->paginated($query->paginate((int) ($validated['per_page'] ?? 20)), fn ($item) => $this->serializeAnswer($item));
    }

    public function updateAnswer(Request $request, int $answer): JsonResponse
    {
        $model = IssueAnswer::query()->findOrFail($answer);
        $data = $request->validate(['status' => ['required', Rule::in(IssueAnswerStatus::values())]]);
        $model->update(['status' => $data['status']]);
        app(\App\Services\Ai\AiIndexingDispatcher::class)->queue('answer', (int) $model->id, true, auth()->id());

        return response()->json(['data' => $this->serializeAnswer($model->fresh(['author', 'question']))]);
    }

    public function comments(Request $request): JsonResponse
    {
        $validated = $request->validate($this->listRules([Comment::STATUS_PUBLISHED, Comment::STATUS_HIDDEN]));
        $query = Comment::withTrashed()
            ->with(['user', 'commentable'])
            ->withCount(['reports', 'replies'])
            ->latest();

        $this->applyStatusFilter($query, $validated);
        $this->applySearch($query, $validated, ['content']);

        return $this->paginated($query->paginate((int) ($validated['per_page'] ?? 20)), fn ($item) => $this->serializeComment($item));
    }

    public function updateComment(Request $request, int $comment): JsonResponse
    {
        $model = Comment::withTrashed()->findOrFail($comment);
        $data = $request->validate(['status' => ['required', Rule::in([Comment::STATUS_PUBLISHED, Comment::STATUS_HIDDEN])]]);
        $model->update(['status' => $data['status']]);

        return response()->json(['data' => $this->serializeComment($model->fresh(['user', 'commentable']))]);
    }

    public function destroyComment(int $comment): JsonResponse
    {
        $model = Comment::query()->findOrFail($comment);
        $model->delete();
        $model = Comment::withTrashed()->with(['user', 'commentable'])->findOrFail($comment);

        return response()->json(['data' => $this->serializeComment($model)]);
    }

    public function restoreComment(int $comment): JsonResponse
    {
        $model = Comment::withTrashed()->findOrFail($comment);
        $model->restore();

        return response()->json(['data' => $this->serializeComment($model->fresh(['user', 'commentable']))]);
    }

    private function listRules(array $allowedStatuses): array
    {
        return [
            'q' => ['nullable', 'string', 'max:160'],
            'status' => ['nullable', Rule::in([...$allowedStatuses, 'all'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }

    private function applyStatusFilter($query, array $validated): void
    {
        if (($validated['status'] ?? 'all') !== 'all') {
            $query->where('status', $validated['status']);
        }
    }

    private function applySearch($query, array $validated, array $columns): void
    {
        if (empty($validated['q'])) {
            return;
        }

        $search = trim($validated['q']);
        $query->where(function ($builder) use ($columns, $search) {
            foreach ($columns as $index => $column) {
                $method = $index === 0 ? 'where' : 'orWhere';
                $builder->{$method}($column, 'ILIKE', "%{$search}%");
            }
        });
    }

    private function paginated(LengthAwarePaginator $paginator, callable $mapper): JsonResponse
    {
        return response()->json([
            'data' => collect($paginator->items())->map($mapper)->values(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    private function serializeAuthor($user): ?array
    {
        if (! $user) {
            return null;
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'avatar_url' => $user->avatar ? Storage::disk('public')->url($user->avatar) : null,
        ];
    }

    private function serializePublication(Publication $item): array
    {
        return [
            'id' => $item->id,
            'type' => 'publication',
            'title' => $item->title,
            'slug' => $item->slug,
            'excerpt' => $item->excerpt,
            'status' => $item->status?->value ?? $item->status,
            'href' => '/publications/' . $item->slug,
            'author' => $this->serializeAuthor($item->author),
            'tags' => $item->relationLoaded('tags') ? $item->tags->map(fn ($tag) => ['id' => $tag->id, 'name' => $tag->name, 'slug' => $tag->slug, 'color' => $tag->color])->values() : [],
            'counts' => [
                'comments' => (int) ($item->comments_count ?? 0),
                'reports' => (int) ($item->reports_count ?? 0),
                'reactions' => (int) ($item->reactions_count ?? 0),
                'saved' => (int) ($item->saved_items_count ?? 0),
            ],
            'published_at' => $item->published_at?->toISOString(),
            'deleted_at' => $item->deleted_at?->toISOString(),
            'created_at' => $item->created_at?->toISOString(),
            'updated_at' => $item->updated_at?->toISOString(),
        ];
    }

    private function serializeQuestion(IssueQuestion $item): array
    {
        return [
            'id' => $item->id,
            'type' => 'issue_question',
            'title' => $item->title,
            'slug' => $item->slug,
            'excerpt' => $item->excerpt,
            'status' => $item->status?->value ?? $item->status,
            'href' => '/questions/' . $item->slug,
            'author' => $this->serializeAuthor($item->author),
            'tags' => $item->relationLoaded('tags') ? $item->tags->map(fn ($tag) => ['id' => $tag->id, 'name' => $tag->name, 'slug' => $tag->slug, 'color' => $tag->color])->values() : [],
            'counts' => [
                'answers' => (int) ($item->answers_count ?? 0),
                'comments' => (int) ($item->comments_count ?? 0),
                'reports' => (int) ($item->reports_count ?? 0),
                'reactions' => (int) ($item->reactions_count ?? 0),
                'saved' => (int) ($item->saved_items_count ?? 0),
            ],
            'published_at' => $item->published_at?->toISOString(),
            'deleted_at' => $item->deleted_at?->toISOString(),
            'created_at' => $item->created_at?->toISOString(),
            'updated_at' => $item->updated_at?->toISOString(),
        ];
    }

    private function serializeAnswer(IssueAnswer $item): array
    {
        return [
            'id' => $item->id,
            'type' => 'issue_answer',
            'status' => $item->status?->value ?? $item->status,
            'is_accepted' => (bool) $item->is_accepted,
            'is_ai_generated' => (bool) $item->is_ai_generated,
            'question' => $item->question ? ['id' => $item->question->id, 'title' => $item->question->title, 'slug' => $item->question->slug, 'href' => '/questions/' . $item->question->slug] : null,
            'author' => $this->serializeAuthor($item->author),
            'counts' => [
                'comments' => (int) ($item->comments_count ?? 0),
                'reports' => (int) ($item->reports_count ?? 0),
            ],
            'created_at' => $item->created_at?->toISOString(),
            'updated_at' => $item->updated_at?->toISOString(),
        ];
    }

    private function serializeComment(Comment $item): array
    {
        return [
            'id' => $item->id,
            'type' => 'comment',
            'content' => $item->content,
            'status' => $item->status,
            'target' => AdminReportController::targetSummary($item->commentable),
            'author' => $this->serializeAuthor($item->user),
            'counts' => [
                'reports' => (int) ($item->reports_count ?? 0),
                'replies' => (int) ($item->replies_count ?? 0),
            ],
            'deleted_at' => $item->deleted_at?->toISOString(),
            'created_at' => $item->created_at?->toISOString(),
            'updated_at' => $item->updated_at?->toISOString(),
        ];
    }
}
