<?php

namespace App\Http\Controllers\Api\Issue;

use App\Events\IssueAnswerChanged;
use App\Enums\IssueAnswerStatus;
use App\Enums\IssueQuestionStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Issue\StoreIssueAnswerRequest;
use App\Http\Requests\Issue\UpdateIssueAnswerRequest;
use App\Http\Resources\Issue\IssueAnswerResource;
use App\Models\IssueAnswer;
use App\Models\IssueQuestion;
use App\Services\Community\CommunityActivityService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class IssueAnswerController extends Controller
{
    public function myIndex(Request $request)
    {
        $query = IssueAnswer::query()
            ->where('author_id', $request->user()->id)
            ->with(['author', 'blocks', 'question'])
            ->with(['savedItems' => fn (Builder $builder) => $builder->where('user_id', $request->user()->id)])
            ->withCount(['comments', 'savedItems'])
            ->latest();

        $perPage = min(max((int) $request->query('per_page', 10), 1), 50);

        return IssueAnswerResource::collection($query->paginate($perPage));
    }

    public function store(StoreIssueAnswerRequest $request, IssueQuestion $issueQuestion, CommunityActivityService $community)
    {
        abort_unless(
            $issueQuestion->status === IssueQuestionStatus::Published,
            403,
            'Нельзя отвечать на неопубликованный вопрос.'
        );

        $answer = DB::transaction(function () use ($request, $issueQuestion) {
            $data = $request->validated();

            $answer = IssueAnswer::query()->create([
                'issue_question_id' => $issueQuestion->id,
                'author_id' => $request->user()->id,
                'status' => $data['status'] ?? IssueAnswerStatus::Published->value,
            ]);

            $this->syncBlocks($answer, $data['blocks']);

            return $answer;
        });

        $issueQuestion->loadMissing('author');

        if (! $issueQuestion->is_solved) {
            $issueQuestion->touch();
        }

        $community->record(
            $request->user(),
            CommunityActivityService::ACTIVITY_ANSWER_CREATED,
            $answer,
            $issueQuestion,
            ['question_id' => $issueQuestion->id, 'answer_id' => $answer->id],
            "{$request->user()->name} добавил ответ",
            $issueQuestion->title,
            "/questions/{$issueQuestion->slug}#answer-{$answer->id}",
            8
        );

        $community->awardReputation(
            $request->user(),
            5,
            CommunityActivityService::REASON_ANSWER_CREATED,
            $answer,
            $request->user()
        );

        if ($issueQuestion->author) {
            $community->notify(
                $issueQuestion->author,
                'question_answered',
                'Новый ответ на вопрос',
                "{$request->user()->name} ответил на вопрос «{$issueQuestion->title}».",
                "/questions/{$issueQuestion->slug}",
                ['question_id' => $issueQuestion->id, 'answer_id' => $answer->id],
                $request->user()
            );
        }

        $community->notifySubscribers(
            $issueQuestion,
            'question_answered',
            'Новый ответ в подписанном вопросе',
            "В вопросе «{$issueQuestion->title}» появился новый ответ.",
            "/questions/{$issueQuestion->slug}",
            ['question_id' => $issueQuestion->id, 'answer_id' => $answer->id],
            $request->user()
        );

        app(\App\Services\Ai\AiIndexingDispatcher::class)->queue('answer', (int) $answer->id, false, $request->user()->id);

        $answer->load(['author', 'blocks', 'question'])->loadCount(['comments', 'savedItems']);
        broadcast(new IssueAnswerChanged('created', $answer))->toOthers();

        return (new IssueAnswerResource($answer))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateIssueAnswerRequest $request, IssueAnswer $issueAnswer)
    {
        $this->authorizeAnswer($request, $issueAnswer);

        $answer = DB::transaction(function () use ($request, $issueAnswer) {
            $data = $request->validated();

            $issueAnswer->update([
                'status' => $data['status'] ?? $issueAnswer->status,
            ]);

            $this->syncBlocks($issueAnswer, $data['blocks']);

            return $issueAnswer;
        });

        app(\App\Services\Ai\AiIndexingDispatcher::class)->queue('answer', (int) $answer->id, true, $request->user()->id);

        $answer->load(['author', 'blocks', 'question'])->loadCount(['comments', 'savedItems']);
        broadcast(new IssueAnswerChanged('updated', $answer))->toOthers();

        return new IssueAnswerResource($answer); 
    }

    public function destroy(Request $request, IssueAnswer $issueAnswer): JsonResponse
    {
        $this->authorizeAnswer($request, $issueAnswer);

        $issueAnswer->loadMissing(['author', 'blocks', 'question']);

        DB::transaction(function () use ($issueAnswer) {
            $question = $issueAnswer->question;

            if ($question?->accepted_answer_id === $issueAnswer->id) {
                $question->update([
                    'accepted_answer_id' => null,
                    'is_solved' => false,
                ]);
            }

            $issueAnswer->delete();
        });

        app(\App\Services\Ai\AiIndexingDispatcher::class)->queue('answer', (int) $issueAnswer->id, true, $request->user()->id);
        broadcast(new IssueAnswerChanged('deleted', $issueAnswer))->toOthers();

        return response()->json([
            'message' => 'Ответ удалён.',
        ]);
    }

    private function authorizeAnswer(Request $request, IssueAnswer $answer): void
    {
        $user = $request->user();

        abort_unless(
            $user && ($answer->author_id === $user->id || $user->isAdmin()),
            403,
            'Нет доступа к этому ответу.'
        );
    }

    /**
     * @param array<int, array<string, mixed>> $blocks
     */
    private function syncBlocks(IssueAnswer $answer, array $blocks): void
    {
        $answer->blocks()->delete();

        foreach (array_values($blocks) as $index => $block) {
            $answer->blocks()->create([
                'type' => $block['type'],
                'sort_order' => $block['sort_order'] ?? $index,
                'content' => $block['content'] ?? [],
            ]);
        }
    }
}
