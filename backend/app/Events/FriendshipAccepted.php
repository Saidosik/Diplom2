<?php

namespace App\Events;

use App\Http\Resources\Social\FriendshipResource;
use App\Models\Friendship;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FriendshipAccepted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Friendship $friendship)
    {
        $this->friendship->loadMissing(['userOne', 'userTwo']);
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('users.' . $this->friendship->user_one_id),
            new PrivateChannel('users.' . $this->friendship->user_two_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'friendship.accepted';
    }

    public function broadcastWith(): array
    {
        return [
            'friendship' => (new FriendshipResource($this->friendship))->resolve(),
        ];
    }
}
