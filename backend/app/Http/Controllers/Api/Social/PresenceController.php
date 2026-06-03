<?php

namespace App\Http\Controllers\Api\Social;

use App\Events\UserPresenceUpdated;
use App\Http\Controllers\Controller;
use App\Http\Resources\User\UserResource;
use App\Models\Friendship;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PresenceController extends Controller
{
    public function heartbeat(Request $request): UserResource
    {
        $user = $request->user();
        $shouldBroadcast = ! $user->isOnline()
            || $user->presence_updated_at === null
            || $user->presence_updated_at->lessThan(now()->subSeconds(45));

        $user->markOnline();
        $user->refresh();

        if ($shouldBroadcast) {
            broadcast(new UserPresenceUpdated($user))->toOthers();
        }

        return new UserResource($user);
    }

    public function offline(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->markOffline();
        $user->refresh();

        broadcast(new UserPresenceUpdated($user))->toOthers();

        return response()->json(['message' => 'Статус обновлён.', 'user' => (new UserResource($user))->resolve()]);
    }

    public function friends(Request $request)
    {
        $user = $request->user();
        $ids = Friendship::query()
            ->where(fn ($query) => $query
                ->where('user_one_id', $user->id)
                ->orWhere('user_two_id', $user->id))
            ->get(['user_one_id', 'user_two_id'])
            ->map(fn (Friendship $friendship) => (int) $friendship->user_one_id === (int) $user->id ? (int) $friendship->user_two_id : (int) $friendship->user_one_id)
            ->values();

        $friends = User::query()
            ->whereIn('id', $ids)
            ->orderByDesc('last_seen_at')
            ->get();

        return UserResource::collection($friends);
    }
}
