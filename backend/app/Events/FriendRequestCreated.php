<?php

namespace App\Events;

use App\Http\Resources\Social\FriendRequestResource;
use App\Models\FriendRequest;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FriendRequestCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public FriendRequest $friendRequest)
    {
        $this->friendRequest->loadMissing(['sender', 'recipient']);
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('users.' . $this->friendRequest->recipient_id)];
    }

    public function broadcastAs(): string
    {
        return 'friend.request.created';
    }

    public function broadcastWith(): array
    {
        return [
            'request' => (new FriendRequestResource($this->friendRequest))->resolve(),
        ];
    }
}
