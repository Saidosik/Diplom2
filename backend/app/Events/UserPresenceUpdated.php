<?php

namespace App\Events;

use App\Http\Resources\User\UserResource;
use App\Models\Friendship;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserPresenceUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public User $user)
    {
    }

    public function broadcastOn(): array
    {
        $friendIds = Friendship::query()
            ->where(fn ($query) => $query
                ->where('user_one_id', $this->user->id)
                ->orWhere('user_two_id', $this->user->id))
            ->get(['user_one_id', 'user_two_id'])
            ->flatMap(fn (Friendship $friendship) => [(int) $friendship->user_one_id, (int) $friendship->user_two_id])
            ->push((int) $this->user->id)
            ->unique()
            ->values();

        return $friendIds->map(fn (int $id) => new PrivateChannel('users.' . $id))->all();
    }

    public function broadcastAs(): string
    {
        return 'presence.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'user' => (new UserResource($this->user))->resolve(),
            'user_id' => $this->user->id,
            'is_online' => $this->user->isOnline(),
            'last_seen_at' => $this->user->last_seen_at?->toISOString(),
            'presence_status' => $this->user->presence_status,
        ];
    }
}
