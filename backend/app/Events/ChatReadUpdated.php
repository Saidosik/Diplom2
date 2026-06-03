<?php

namespace App\Events;

use App\Http\Resources\Chat\ChatParticipantResource;
use App\Models\ChatConversation;
use App\Models\ChatParticipant;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ChatReadUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public ChatConversation $conversation, public ChatParticipant $participant)
    {
        $this->participant->loadMissing('user');
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('chats.' . $this->conversation->id)];
    }

    public function broadcastAs(): string
    {
        return 'chat.read.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'conversation_id' => $this->conversation->id,
            'user_id' => $this->participant->user_id,
            'last_read_at' => $this->participant->last_read_at?->toISOString(),
            'participant' => (new ChatParticipantResource($this->participant))->resolve(),
        ];
    }
}
