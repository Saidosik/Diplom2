<?php

namespace App\Http\Controllers\Api\Community;

use App\Enums\IssueAnswerStatus;
use App\Enums\IssueQuestionStatus;
use App\Enums\PublicationStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\Community\SubscriptionResource;
use App\Models\Comment;
use App\Models\IssueAnswer;
use App\Models\IssueQuestion;
use App\Models\Publication;
use App\Models\Subscription;
use App\Models\Tag;
use App\Models\User;
use App\Services\Community\CommunityActivityService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SubscriptionController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min(max((int) $request->query('per_page', 20), 1), 50);

        return SubscriptionResource::collection(
            Subscription::query()
                ->where('user_id', $request->user()->id)
                ->latest()
                ->paginate($perPage)
                ->withQueryString()
        );
    }

    public function store(Request $request, CommunityActivityService $community): SubscriptionResource
    {
        $data = $request->validate([
            'subscribable_type' => ['required', 'string', Rule::in(['user', 'publication', 'issue_question', 'issue_answer', 'comment', 'tag'])],
            'subscribable_id' => ['required', 'integer', 'min:1'],
        ]);

        $target = $this->resolveTarget($data['subscribable_type'], (int) $data['subscribable_id']);

        if ($target instanceof User && $target->id === $request->user()->id) {
            abort(422, 'Нельзя подписаться на самого себя.');
        }

        if ($target instanceof Comment && $target->user_id === $request->user()->id) {
            abort(422, 'Нельзя подписаться на собственный комментарий.');
        }

        $subscription = Subscription::query()->firstOrCreate([
            'user_id' => $request->user()->id,
            'subscribable_type' => $target->getMorphClass(),
            'subscribable_id' => $target->getKey(),
        ]);

        if ($subscription->wasRecentlyCreated) {
            $community->record(
                $request->user(),
                CommunityActivityService::ACTIVITY_SUBSCRIPTION_CREATED,
                $subscription,
                $target,
                ['subscribable_type' => $target->getMorphClass(), 'subscribable_id' => $target->getKey()],
                "{$request->user()->name} оформил подписку",
                null,
                $target instanceof User ? "/users/{$target->id}" : null,
                2
            );
        }

        if ($target instanceof User) {
            $community->notify(
                $target,
                'subscription_created',
                'Новый подписчик',
                "{$request->user()->name} подписался на ваши публикации.",
                "/users/{$request->user()->id}",
                ['subscriber_id' => $request->user()->id],
                $request->user()
            );
        }

        return new SubscriptionResource($subscription);
    }

    public function destroy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subscribable_type' => ['required', 'string', Rule::in(['user', 'publication', 'issue_question', 'issue_answer', 'comment', 'tag'])],
            'subscribable_id' => ['required', 'integer', 'min:1'],
        ]);

        $target = $this->resolveTarget($data['subscribable_type'], (int) $data['subscribable_id']);

        Subscription::query()
            ->where('user_id', $request->user()->id)
            ->where('subscribable_type', $target->getMorphClass())
            ->where('subscribable_id', $target->getKey())
            ->delete();

        return response()->json([
            'message' => 'Подписка удалена.',
        ]);
    }

    public function status(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subscribable_type' => ['required', 'string', Rule::in(['user', 'publication', 'issue_question', 'issue_answer', 'comment', 'tag'])],
            'subscribable_id' => ['required', 'integer', 'min:1'],
        ]);

        $target = $this->resolveTarget($data['subscribable_type'], (int) $data['subscribable_id']);

        return response()->json([
            'is_subscribed' => Subscription::query()
                ->where('user_id', $request->user()->id)
                ->where('subscribable_type', $target->getMorphClass())
                ->where('subscribable_id', $target->getKey())
                ->exists(),
        ]);
    }

    private function resolveTarget(string $type, int $id): Model
    {
        return match ($type) {
            'user' => User::query()->findOrFail($id),
            'publication' => Publication::query()->where('status', PublicationStatus::Published->value)->findOrFail($id),
            'issue_question' => IssueQuestion::query()->where('status', IssueQuestionStatus::Published->value)->findOrFail($id),
            'issue_answer' => IssueAnswer::query()->where('status', IssueAnswerStatus::Published->value)->findOrFail($id),
            'comment' => Comment::query()->published()->findOrFail($id),
            'tag' => Tag::query()->findOrFail($id),
            default => abort(422, 'Неподдерживаемый тип подписки.'),
        };
    }
}
