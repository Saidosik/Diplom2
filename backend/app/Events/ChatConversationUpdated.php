<?php

namespace App\Events;

use App\Http\Resources\Chat\ChatConversationResource;
use App\Models\ChatConversation;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ChatConversationUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public ChatConversation $conversation)
    {
        $this->conversation->loadMissing(['participants.user', 'lastMessage.sender', 'lastMessage.attachments']);
    }

    public function broadcastOn(): array
    {
        return $this->conversation->activeParticipants()
            ->pluck('user_id')
            ->map(fn ($id) => new PrivateChannel('users.' . $id))
            ->all();
    }

    public function broadcastAs(): string
    {
        return 'chat.conversation.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'conversation' => (new ChatConversationResource($this->conversation))->resolve(),
        ];
    }
}
