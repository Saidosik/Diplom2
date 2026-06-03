<?php

namespace App\Http\Controllers\Api\Community;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use App\Models\Tag;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InterestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $tagMorph = (new Tag())->getMorphClass();

        $selectedIds = Subscription::query()
            ->where('user_id', $user->id)
            ->where('subscribable_type', $tagMorph)
            ->pluck('subscribable_id')
            ->map(fn ($id) => (int) $id)
            ->values();

        $tags = Tag::query()
            ->where('status', 'active')
            ->withCount([
                'publications' => fn (Builder $builder) => $builder->published(),
                'issueQuestions' => fn (Builder $builder) => $builder->published(),
            ])
            ->orderByDesc('publications_count')
            ->orderByDesc('issue_questions_count')
            ->orderBy('name')
            ->limit(120)
            ->get()
            ->map(fn (Tag $tag) => [
                'id' => $tag->id,
                'name' => $tag->name,
                'slug' => $tag->slug,
                'description' => $tag->description,
                'color' => $tag->color,
                'usage_count' => (int) ($tag->publications_count + $tag->issue_questions_count),
                'is_selected' => $selectedIds->contains((int) $tag->id),
            ])
            ->values();

        return response()->json([
            'data' => [
                'tags' => $tags,
                'selected_tag_ids' => $selectedIds,
                'selected_count' => $selectedIds->count(),
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tag_ids' => ['array', 'max:40'],
            'tag_ids.*' => ['integer', 'exists:tags,id'],
        ]);

        $user = $request->user();
        $tagMorph = (new Tag())->getMorphClass();
        $tagIds = collect($validated['tag_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->values();

        Subscription::query()
            ->where('user_id', $user->id)
            ->where('subscribable_type', $tagMorph)
            ->delete();

        $now = now();
        $rows = $tagIds->map(fn (int $tagId) => [
            'user_id' => $user->id,
            'subscribable_type' => $tagMorph,
            'subscribable_id' => $tagId,
            'created_at' => $now,
            'updated_at' => $now,
        ])->all();

        if ($rows !== []) {
            Subscription::query()->insert($rows);
        }

        return $this->index($request);
    }
}
