<?php

namespace App\Http\Controllers\Api\Tag;

use App\Enums\IssueQuestionStatus;
use App\Enums\PublicationStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\Issue\IssueQuestionResource;
use App\Http\Resources\Issue\TagResource;
use App\Http\Resources\PublicationResource;
use App\Models\IssueQuestion;
use App\Models\Publication;
use App\Models\Reaction;
use App\Models\Tag;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class TagController extends Controller
{

    public function index(Request $request)
    {
        $search = trim((string) $request->query('search'));

        $query = Tag::query()
            ->where('status', 'active')
            ->withCount([
                'publications as publications_count' => fn (Builder $query) => $query->where('status', PublicationStatus::Published->value),
                'issueQuestions as questions_count' => fn (Builder $query) => $query->where('status', IssueQuestionStatus::Published->value),
            ]);

        if ($search !== '') {
            $query->where(function (Builder $builder) use ($search) {
                $builder->where('name', 'ilike', "%{$search}%")
                    ->orWhere('slug', 'ilike', "%{$search}%")
                    ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        $tags = $query
            ->orderByDesc('publications_count')
            ->orderByDesc('questions_count')
            ->orderBy('name')
            ->limit(60)
            ->get();

        return TagResource::collection($tags);
    }

    public function show(Request $request, Tag $tag)
    {
        abort_if($tag->status !== 'active', 404);

        $search = trim((string) $request->query('search'));
        $perPage = min(max((int) $request->query('per_page', 8), 1), 30);

        $tag->loadCount([
            'publications as publications_count' => fn (Builder $query) => $query->where('status', PublicationStatus::Published->value),
            'issueQuestions as questions_count' => fn (Builder $query) => $query->where('status', IssueQuestionStatus::Published->value),
        ]);

        $publicationQuery = Publication::query()
            ->published()
            ->whereHas('tags', fn (Builder $builder) => $builder->whereKey($tag->id))
            ->with(['author', 'tags'])
            ->withCount([
                'comments',
                'savedItems',
                'reactions as likes_count' => fn (Builder $query) => $query->where('type', Reaction::LIKE),
                'reactions as dislikes_count' => fn (Builder $query) => $query->where('type', Reaction::DISLIKE),
            ]);

        $questionQuery = IssueQuestion::query()
            ->published()
            ->whereHas('tags', fn (Builder $builder) => $builder->whereKey($tag->id))
            ->with(['author', 'tags'])
            ->withCount([
                'answers' => fn ($builder) => $builder->published(),
                'reactions as likes_count' => fn (Builder $query) => $query->where('type', Reaction::LIKE),
                'reactions as dislikes_count' => fn (Builder $query) => $query->where('type', Reaction::DISLIKE),
            ]);

        if ($search !== '') {
            $publicationQuery->where(function (Builder $builder) use ($search) {
                $builder->where('title', 'ilike', "%{$search}%")
                    ->orWhere('excerpt', 'ilike', "%{$search}%");
            });

            $questionQuery->where(function (Builder $builder) use ($search) {
                $builder->where('title', 'ilike', "%{$search}%")
                    ->orWhere('excerpt', 'ilike', "%{$search}%");
            });
        }

        $popularPublications = (clone $publicationQuery)
            ->orderByDesc('likes_count')
            ->orderByDesc('comments_count')
            ->limit(3)
            ->get();

        $popularQuestions = (clone $questionQuery)
            ->orderByDesc('answers_count')
            ->orderByDesc('views_count')
            ->limit(3)
            ->get();

        return response()->json([
            'data' => new TagResource($tag),
            'publications' => PublicationResource::collection(
                $publicationQuery->latest('published_at')->paginate($perPage, ['*'], 'page')
            )->response()->getData(true),
            'questions' => IssueQuestionResource::collection(
                $questionQuery->latest('published_at')->limit($perPage)->get()
            )->response()->getData(true),
            'popular_publications' => PublicationResource::collection($popularPublications)->response()->getData(true)['data'] ?? [],
            'popular_questions' => IssueQuestionResource::collection($popularQuestions)->response()->getData(true)['data'] ?? [],
        ]);
    }
}
