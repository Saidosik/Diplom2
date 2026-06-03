<?php

namespace App\Http\Controllers\Api\Interaction;

use App\Events\ContentReactionUpdated;
use App\Enums\IssueQuestionStatus;
use App\Enums\PublicationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Interaction\DestroyReactionRequest;
use App\Http\Requests\Interaction\StoreReactionRequest;
use App\Http\Resources\Interaction\ReactionSummaryResource;
use App\Models\IssueQuestion;
use App\Models\Publication;
use App\Models\Reaction;
use App\Services\Community\CommunityActivityService;
use Illuminate\Database\Eloquent\Model;

class ReactionController extends Controller
{
    public function store(StoreReactionRequest $request, CommunityActivityService $community)
    {
        $data = $request->validated();
        $target = $this->resolveTarget($data['reactable_type'], (int) $data['reactable_id']);

        $reaction = Reaction::query()->updateOrCreate(
            [
                'user_id' => $request->user()->id,
                'reactable_type' => $target->getMorphClass(),
                'reactable_id' => $target->getKey(),
            ],
            ['type' => $data['type']]
        );

        if ($reaction->wasRecentlyCreated) {
            $community->record(
                $request->user(),
                CommunityActivityService::ACTIVITY_REACTION_ADDED,
                $reaction,
                $target,
                ['reaction_type' => $data['type'], 'target_type' => $target->getMorphClass(), 'target_id' => $target->getKey()],
                "{$request->user()->name} оценил материал",
                null,
                $community->sourceLink($target),
                $data['type'] === Reaction::LIKE ? 3 : 1
            );
        }

        if ($data['type'] === Reaction::LIKE && $reaction->wasRecentlyCreated && method_exists($target, 'author') && $target->author) {
            $community->awardReputation(
                $target->author,
                2,
                CommunityActivityService::REASON_LIKE_RECEIVED,
                $target,
                $request->user()
            );
        }

        $summary = $this->summary($target, $request->user()->id);
        broadcast(new ContentReactionUpdated($target->getMorphClass(), (int) $target->getKey(), $summary))->toOthers();

        return new ReactionSummaryResource($summary);
    }

    public function destroy(DestroyReactionRequest $request)
    {
        $data = $request->validated();
        $target = $this->resolveTarget($data['reactable_type'], (int) $data['reactable_id']);

        Reaction::query()
            ->where('user_id', $request->user()->id)
            ->where('reactable_type', $target->getMorphClass())
            ->where('reactable_id', $target->getKey())
            ->delete();

        $summary = $this->summary($target, $request->user()->id);
        broadcast(new ContentReactionUpdated($target->getMorphClass(), (int) $target->getKey(), $summary))->toOthers();

        return new ReactionSummaryResource($summary);
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
            default => abort(422, 'Неподдерживаемый тип объекта для реакции.'),
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function summary(Model $target, int $userId): array
    {
        return [
            'likes_count' => $target->reactions()->where('type', Reaction::LIKE)->count(),
            'dislikes_count' => $target->reactions()->where('type', Reaction::DISLIKE)->count(),
            'my_reaction' => $target->reactions()->where('user_id', $userId)->value('type'),
        ];
    }
}
