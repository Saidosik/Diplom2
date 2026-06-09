<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\IssueQuestionStatus;
use App\Enums\PublicationStatus;
use App\Http\Controllers\Controller;
use App\Models\IssueQuestion;
use App\Models\Publication;
use App\Models\Tag;
use App\Support\TagColor;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminTagController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', Rule::in(['all', 'active', 'inactive'])],
            'readability' => ['nullable', Rule::in(['all', 'good', 'acceptable', 'poor'])],
            'usage' => ['nullable', Rule::in(['all', 'used', 'unused'])],
            'sort' => ['nullable', Rule::in(['name', 'publications', 'questions', 'popularity', 'updated_at'])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $totals = $this->contentTotals();
        $query = Tag::query()->withUsageCounts();

        $search = trim((string) ($validated['q'] ?? ''));
        if ($search !== '') {
            $query->where(function (Builder $builder) use ($search) {
                $builder->where('name', 'ilike', "%{$search}%")
                    ->orWhere('slug', 'ilike', "%{$search}%")
                    ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        if (($validated['status'] ?? 'all') !== 'all') {
            $query->where('status', $validated['status']);
        }

        $sort = $validated['sort'] ?? 'popularity';
        $direction = $validated['direction'] ?? 'desc';
        match ($sort) {
            'publications' => $query->orderBy('publications_count', $direction),
            'questions' => $query->orderBy('questions_count', $direction),
            'updated_at' => $query->orderBy('updated_at', $direction),
            'name' => $query->orderBy('name', $direction),
            default => $query->orderBy('total_usage_count', $direction),
        };
        $query->orderBy('name');

        $tags = $query->get()
            ->map(fn (Tag $tag) => $this->serializeTag($tag, $totals['materials']))
            ->filter(function (array $tag) use ($validated) {
                $readability = $validated['readability'] ?? 'all';
                $usage = $validated['usage'] ?? 'all';

                $passesReadability = $readability === 'all'
                    || $tag['readability_light']['status'] === $readability
                    || $tag['readability_dark']['status'] === $readability;
                $passesUsage = $usage === 'all'
                    || ($usage === 'used' && $tag['total_usage_count'] > 0)
                    || ($usage === 'unused' && $tag['total_usage_count'] === 0);

                return $passesReadability && $passesUsage;
            })
            ->values();

        return response()->json([
            'data' => $tags,
            'meta' => [
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => (int) ($validated['per_page'] ?? 100),
                'total' => $tags->count(),
            ],
            'stats' => $this->buildStats($tags, $totals),
        ]);
    }

    public function stats(): JsonResponse
    {
        $totals = $this->contentTotals();
        $tags = Tag::query()->withUsageCounts()->get()->map(fn (Tag $tag) => $this->serializeTag($tag, $totals['materials']))->values();

        return response()->json(['data' => $this->buildStats($tags, $totals)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules());
        $data['slug'] = blank($data['slug'] ?? null) ? Str::slug($data['name']) : $data['slug'];
        $data['color'] = TagColor::normalize($data['color'] ?? null);
        $data['status'] = ($data['is_active'] ?? true) ? 'active' : 'inactive';
        unset($data['is_active']);

        $tag = Tag::query()->create($data)->loadUsageCounts();

        return response()->json(['data' => $this->serializeTag($tag, $this->contentTotals()['materials'])], 201);
    }

    public function update(Request $request, Tag $tag): JsonResponse
    {
        $data = $request->validate($this->rules($tag));
        if (! array_key_exists('slug', $data) || blank($data['slug'])) {
            $data['slug'] = Str::slug($data['name'] ?? $tag->name);
        }
        if (array_key_exists('color', $data)) {
            $data['color'] = TagColor::normalize($data['color']);
        }
        if (array_key_exists('is_active', $data)) {
            $data['status'] = $data['is_active'] ? 'active' : 'inactive';
            unset($data['is_active']);
        }

        $tag->update($data);
        $tag->loadUsageCounts();

        return response()->json(['data' => $this->serializeTag($tag, $this->contentTotals()['materials'])]);
    }

    public function destroy(Request $request, Tag $tag): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403, 'Удалять теги может только администратор.');

        $tag->loadUsageCounts();
        $usage = (int) $tag->publications_count + (int) $tag->questions_count;
        if ($usage > 0) {
            return response()->json([
                'message' => 'Тег связан с материалами. Сначала удалите связи или переназначьте материалы.',
                'usage' => [
                    'publications_count' => (int) $tag->publications_count,
                    'questions_count' => (int) $tag->questions_count,
                ],
            ], 409);
        }

        $tag->delete();

        return response()->json(['message' => 'Тег удалён.']);
    }

    private function rules(?Tag $tag = null): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['nullable', 'string', 'max:140', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('tags', 'slug')->ignore($tag?->id)],
            'description' => ['nullable', 'string', 'max:2000'],
            'color' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    private function serializeTag(Tag $tag, int $materialsTotal): array
    {
        $publications = (int) ($tag->publications_count ?? 0);
        $questions = (int) ($tag->questions_count ?? 0);
        $total = $publications + $questions;
        $readability = TagColor::readability($tag->color);

        return [
            'id' => $tag->id,
            'name' => $tag->name,
            'slug' => $tag->slug,
            'description' => $tag->description,
            'color' => $tag->color ?: TagColor::FALLBACK_COLOR,
            'status' => $tag->status,
            'is_active' => $tag->status === 'active',
            'posts_count' => $publications,
            'publications_count' => $publications,
            'questions_count' => $questions,
            'total_usage_count' => $total,
            'usage_percent' => $materialsTotal > 0 ? round(($total / $materialsTotal) * 100, 1) : 0.0,
            'readability_light' => $readability['light'],
            'readability_dark' => $readability['dark'],
            'created_at' => $tag->created_at?->toISOString(),
            'updated_at' => $tag->updated_at?->toISOString(),
        ];
    }

    private function buildStats($tags, array $totals): array
    {
        $count = $tags->count();
        $used = $tags->where('total_usage_count', '>', 0)->count();
        $active = $tags->where('is_active', true)->count();
        $lightPoor = $tags->where('readability_light.status', 'poor')->count();
        $darkPoor = $tags->where('readability_dark.status', 'poor')->count();
        $readabilityGroups = ['good' => 0, 'acceptable' => 0, 'poor' => 0];
        foreach ($tags as $tag) {
            $readabilityGroups[$this->worstReadability($tag)]++;
        }

        return [
            'totals' => [
                'tags' => $count,
                'active_tags' => $active,
                'inactive_tags' => $count - $active,
                'used_tags' => $used,
                'unused_tags' => $count - $used,
                'poor_light_tags' => $lightPoor,
                'poor_dark_tags' => $darkPoor,
                'avg_publications_per_tag' => $count > 0 ? round($tags->sum('posts_count') / $count, 1) : 0,
                'avg_questions_per_tag' => $count > 0 ? round($tags->sum('questions_count') / $count, 1) : 0,
                'avg_light_contrast' => $count > 0 ? round($tags->avg('readability_light.ratio'), 2) : 0,
                'avg_dark_contrast' => $count > 0 ? round($tags->avg('readability_dark.ratio'), 2) : 0,
                'materials_total' => $totals['materials'],
                'tagged_materials_total' => $tags->sum('total_usage_count'),
                'tagged_materials_percent' => $totals['materials'] > 0 ? round(($tags->sum('total_usage_count') / $totals['materials']) * 100, 1) : 0,
            ],
            'top_publications' => $tags->sortByDesc('posts_count')->take(10)->values(),
            'top_questions' => $tags->sortByDesc('questions_count')->take(10)->values(),
            'top_activity' => $tags->sortByDesc('total_usage_count')->take(10)->values(),
            'active_distribution' => [
                ['name' => 'Активные', 'value' => $active, 'percent' => $count > 0 ? round($active / $count * 100, 1) : 0],
                ['name' => 'Неактивные', 'value' => $count - $active, 'percent' => $count > 0 ? round(($count - $active) / $count * 100, 1) : 0],
            ],
            'readability_distribution' => collect($readabilityGroups)->map(fn ($value, $key) => [
                'name' => match ($key) { 'good' => 'Хорошая', 'acceptable' => 'Допустимая', default => 'Плохая' },
                'value' => $value,
                'percent' => $count > 0 ? round($value / $count * 100, 1) : 0,
            ])->values(),
            'usage_distribution' => $this->usageDistribution($tags),
            'popular_tag' => $tags->sortByDesc('total_usage_count')->first(),
            'problem_tag' => $tags->sortBy(fn ($tag) => min($tag['readability_light']['ratio'], $tag['readability_dark']['ratio']))->first(),
            'needs_color_work' => $tags->filter(fn ($tag) => $tag['readability_light']['status'] === 'poor' || $tag['readability_dark']['status'] === 'poor')->count(),
        ];
    }

    private function contentTotals(): array
    {
        $publications = Publication::query()->where('status', PublicationStatus::Published->value)->count();
        $questions = IssueQuestion::query()->where('status', IssueQuestionStatus::Published->value)->count();

        return ['publications' => $publications, 'questions' => $questions, 'materials' => $publications + $questions];
    }

    private function worstReadability(array $tag): string
    {
        if ($tag['readability_light']['status'] === 'poor' || $tag['readability_dark']['status'] === 'poor') return 'poor';
        if ($tag['readability_light']['status'] === 'acceptable' || $tag['readability_dark']['status'] === 'acceptable') return 'acceptable';
        return 'good';
    }

    private function usageDistribution($tags): array
    {
        $count = $tags->count();
        $groups = ['Часто используемые' => 0, 'Средне используемые' => 0, 'Редко используемые' => 0, 'Неиспользуемые' => 0];
        foreach ($tags as $tag) {
            $usage = $tag['total_usage_count'];
            if ($usage === 0) $groups['Неиспользуемые']++;
            elseif ($usage >= 10) $groups['Часто используемые']++;
            elseif ($usage >= 3) $groups['Средне используемые']++;
            else $groups['Редко используемые']++;
        }

        return collect($groups)->map(fn ($value, $name) => [
            'name' => $name,
            'value' => $value,
            'percent' => $count > 0 ? round($value / $count * 100, 1) : 0,
        ])->values()->all();
    }
}
