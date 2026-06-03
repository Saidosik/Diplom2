<?php

namespace App\Http\Controllers\Api\Interaction;

use App\Enums\IssueAnswerStatus;
use App\Enums\IssueQuestionStatus;
use App\Enums\PublicationStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\Interaction\SavedItemResource;
use App\Models\IssueAnswer;
use App\Models\IssueQuestion;
use App\Models\Publication;
use App\Models\SavedItem;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SavedItemController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min(max((int) $request->query('per_page', 12), 1), 50);
        $type = $request->query('type');

        $query = SavedItem::query()
            ->forUser($request->user())
            ->when($type === 'publication', fn ($builder) => $builder->where('saveable_type', (new Publication())->getMorphClass()))
            ->when($type === 'issue_question', fn ($builder) => $builder->where('saveable_type', (new IssueQuestion())->getMorphClass()))
            ->when($type === 'issue_answer', fn ($builder) => $builder->where('saveable_type', (new IssueAnswer())->getMorphClass()))
            ->latest()
            ->with([
                'saveable' => function ($morphTo) use ($request) {
                    $morphTo->morphWith([
                        Publication::class => [
                            'author',
                            'tags',
                            'reactions' => fn ($query) => $query->where('user_id', $request->user()->id),
                        ],
                        IssueQuestion::class => [
                            'author',
                            'tags',
                            'blocks',
                            'reactions' => fn ($query) => $query->where('user_id', $request->user()->id),
                        ],
                        IssueAnswer::class => [
                            'author',
                            'blocks',
                            'question.author',
                            'question.tags',
                        ],
                    ]);
                },
            ]);

        return SavedItemResource::collection($query->paginate($perPage)->withQueryString());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'saveable_type' => ['required', 'string', Rule::in(['publication', 'issue_question', 'issue_answer'])],
            'saveable_id' => ['required', 'integer', 'min:1'],
        ]);

        $target = $this->resolveTarget($data['saveable_type'], (int) $data['saveable_id']);

        $item = SavedItem::query()->updateOrCreate([
            'user_id' => $request->user()->id,
            'saveable_type' => $target->getMorphClass(),
            'saveable_id' => $target->getKey(),
        ]);

        return (new SavedItemResource($item->load('saveable')))
            ->response()
            ->setStatusCode(201);
    }

    public function destroy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'saveable_type' => ['required', 'string', Rule::in(['publication', 'issue_question', 'issue_answer'])],
            'saveable_id' => ['required', 'integer', 'min:1'],
        ]);

        $target = $this->resolveTarget($data['saveable_type'], (int) $data['saveable_id']);

        SavedItem::query()
            ->where('user_id', $request->user()->id)
            ->where('saveable_type', $target->getMorphClass())
            ->where('saveable_id', $target->getKey())
            ->delete();

        return response()->json([
            'message' => 'Материал удалён из сохранённого.',
        ]);
    }

    private function resolveTarget(string $type, int $id): Model
    {
        return match ($type) {
            'publication' => Publication::query()
                ->where('status', PublicationStatus::Published->value)
                ->findOrFail($id),
            'issue_question' => IssueQuestion::query()
                ->where('status', IssueQuestionStatus::Published->value)
                ->findOrFail($id),
            'issue_answer' => IssueAnswer::query()
                ->where('status', IssueAnswerStatus::Published->value)
                ->findOrFail($id),
            default => abort(422, 'Неподдерживаемый тип объекта для сохранения.'),
        };
    }
}
