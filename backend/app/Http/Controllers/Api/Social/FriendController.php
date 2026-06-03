<?php

namespace App\Http\Controllers\Api\Social;

use App\Events\FriendRequestCreated;
use App\Events\FriendshipAccepted;
use App\Http\Controllers\Controller;
use App\Http\Resources\Social\FriendRequestResource;
use App\Http\Resources\Social\FriendshipResource;
use App\Http\Resources\User\UserResource;
use App\Models\FriendRequest;
use App\Models\Friendship;
use App\Models\User;
use App\Services\Community\CommunityActivityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class FriendController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $perPage = min(max((int) $request->query('per_page', 20), 1), 50);

        $friends = Friendship::query()
            ->where(fn ($query) => $query
                ->where('user_one_id', $user->id)
                ->orWhere('user_two_id', $user->id))
            ->with(['userOne', 'userTwo'])
            ->latest('friended_at')
            ->paginate($perPage)
            ->withQueryString();

        return FriendshipResource::collection($friends);
    }

    public function requests(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'incoming' => FriendRequestResource::collection(
                FriendRequest::query()
                    ->where('recipient_id', $user->id)
                    ->where('status', FriendRequest::STATUS_PENDING)
                    ->with(['sender', 'recipient'])
                    ->latest()
                    ->get()
            ),
            'outgoing' => FriendRequestResource::collection(
                FriendRequest::query()
                    ->where('sender_id', $user->id)
                    ->where('status', FriendRequest::STATUS_PENDING)
                    ->with(['sender', 'recipient'])
                    ->latest()
                    ->get()
            ),
        ]);
    }

    public function suggestions(Request $request)
    {
        $user = $request->user();
        $q = trim((string) $request->query('q', ''));
        $limit = min(max((int) $request->query('limit', 12), 1), 30);

        $friendIds = $this->friendIds($user->id);
        $pendingIds = FriendRequest::query()
            ->where('status', FriendRequest::STATUS_PENDING)
            ->where(fn ($query) => $query
                ->where('sender_id', $user->id)
                ->orWhere('recipient_id', $user->id))
            ->get(['sender_id', 'recipient_id'])
            ->flatMap(fn ($request) => [(int) $request->sender_id, (int) $request->recipient_id])
            ->unique()
            ->filter(fn ($id) => (int) $id !== (int) $user->id)
            ->values()
            ->all();

        $users = User::query()
            ->where('id', '!=', $user->id)
            ->whereNotIn('id', array_unique(array_merge($friendIds, $pendingIds)))
            ->when($q !== '', fn ($query) => $query->where(function ($builder) use ($q) {
                $builder->where('name', 'ILIKE', "%{$q}%")
                    ->orWhere('email', 'ILIKE', "%{$q}%")
                    ->orWhere('headline', 'ILIKE', "%{$q}%");
            }))
            ->orderByDesc('reputation_score')
            ->limit($limit)
            ->get();

        return UserResource::collection($users);
    }

    public function send(Request $request, CommunityActivityService $community)
    {
        $data = $request->validate([
            'recipient_id' => ['required', 'integer', Rule::exists('users', 'id')],
            'message' => ['nullable', 'string', 'max:500'],
        ]);

        $sender = $request->user();
        $recipientId = (int) $data['recipient_id'];

        abort_if($recipientId === (int) $sender->id, 422, 'Нельзя добавить в друзья самого себя.');
        abort_if($this->areFriends((int) $sender->id, $recipientId), 422, 'Вы уже друзья.');

        $existing = FriendRequest::query()
            ->where('status', FriendRequest::STATUS_PENDING)
            ->where(function ($query) use ($sender, $recipientId) {
                $query->where(fn ($builder) => $builder->where('sender_id', $sender->id)->where('recipient_id', $recipientId))
                    ->orWhere(fn ($builder) => $builder->where('sender_id', $recipientId)->where('recipient_id', $sender->id));
            })
            ->first();

        abort_if($existing, 422, 'Заявка уже ожидает ответа.');

        $friendRequest = FriendRequest::query()->create([
            'sender_id' => $sender->id,
            'recipient_id' => $recipientId,
            'status' => FriendRequest::STATUS_PENDING,
            'message' => $data['message'] ?? null,
        ])->load(['sender', 'recipient']);

        $community->notify(
            $friendRequest->recipient,
            'friend_request',
            'Новая заявка в друзья',
            "{$sender->name} хочет добавить вас в друзья.",
            '/friends',
            ['friend_request_id' => $friendRequest->id],
            $sender
        );

        broadcast(new FriendRequestCreated($friendRequest))->toOthers();

        return (new FriendRequestResource($friendRequest))->response()->setStatusCode(201);
    }

    public function accept(Request $request, FriendRequest $friendRequest, CommunityActivityService $community)
    {
        abort_unless((int) $friendRequest->recipient_id === (int) $request->user()->id, 403);
        abort_unless($friendRequest->status === FriendRequest::STATUS_PENDING, 422, 'Заявка уже обработана.');

        $friendship = DB::transaction(function () use ($friendRequest) {
            [$one, $two] = Friendship::orderedPair((int) $friendRequest->sender_id, (int) $friendRequest->recipient_id);

            $friendship = Friendship::query()->firstOrCreate([
                'user_one_id' => $one,
                'user_two_id' => $two,
            ], [
                'requested_by_id' => $friendRequest->sender_id,
                'friended_at' => now(),
            ]);

            $friendRequest->update([
                'status' => FriendRequest::STATUS_ACCEPTED,
                'responded_at' => now(),
            ]);

            return $friendship->load(['userOne', 'userTwo']);
        });

        $friendRequest->load(['sender', 'recipient']);

        $community->notify(
            $friendRequest->sender,
            'friend_request_accepted',
            'Заявка в друзья принята',
            "{$friendRequest->recipient->name} принял вашу заявку.",
            '/friends',
            ['friendship_id' => $friendship->id],
            $friendRequest->recipient
        );

        broadcast(new FriendshipAccepted($friendship))->toOthers();

        return new FriendshipResource($friendship);
    }

    public function decline(Request $request, FriendRequest $friendRequest): JsonResponse
    {
        abort_unless((int) $friendRequest->recipient_id === (int) $request->user()->id, 403);
        abort_unless($friendRequest->status === FriendRequest::STATUS_PENDING, 422, 'Заявка уже обработана.');

        $friendRequest->update([
            'status' => FriendRequest::STATUS_DECLINED,
            'responded_at' => now(),
        ]);

        return response()->json(['message' => 'Заявка отклонена.']);
    }

    public function cancel(Request $request, FriendRequest $friendRequest): JsonResponse
    {
        abort_unless((int) $friendRequest->sender_id === (int) $request->user()->id, 403);
        abort_unless($friendRequest->status === FriendRequest::STATUS_PENDING, 422, 'Заявка уже обработана.');

        $friendRequest->update([
            'status' => FriendRequest::STATUS_CANCELLED,
            'responded_at' => now(),
        ]);

        return response()->json(['message' => 'Заявка отменена.']);
    }

    public function destroy(Request $request, Friendship $friendship): JsonResponse
    {
        $user = $request->user();
        abort_unless((int) $friendship->user_one_id === (int) $user->id || (int) $friendship->user_two_id === (int) $user->id, 403);

        $friendship->delete();

        return response()->json(['message' => 'Пользователь удалён из друзей.']);
    }

    private function areFriends(int $firstUserId, int $secondUserId): bool
    {
        [$one, $two] = Friendship::orderedPair($firstUserId, $secondUserId);

        return Friendship::query()
            ->where('user_one_id', $one)
            ->where('user_two_id', $two)
            ->exists();
    }

    private function friendIds(int $userId): array
    {
        return Friendship::query()
            ->where(fn ($query) => $query->where('user_one_id', $userId)->orWhere('user_two_id', $userId))
            ->get(['user_one_id', 'user_two_id'])
            ->map(fn ($friendship) => (int) $friendship->user_one_id === $userId ? (int) $friendship->user_two_id : (int) $friendship->user_one_id)
            ->values()
            ->all();
    }
}
