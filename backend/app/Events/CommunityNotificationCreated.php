<?php

namespace App\Events;

use App\Http\Resources\Community\CommunityNotificationResource;
use App\Models\CommunityNotification;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CommunityNotificationCreated implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(public CommunityNotification $notification)
    {
        $this->notification->loadMissing('actor');
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('users.' . $this->notification->user_id)];
    }

    public function broadcastAs(): string
    {
        return 'notification.created';
    }

    public function broadcastWith(): array
    {
        return [
            'notification' => (new CommunityNotificationResource($this->notification))->resolve(),
        ];
    }
}
