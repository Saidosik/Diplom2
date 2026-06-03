<?php

namespace App\Events;

use App\Http\Resources\Chat\ChatMessageResource;
use App\Models\ChatMessage;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ChatMessageCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public ChatMessage $message)
    {
        $this->message->loadMissing(['sender', 'attachments']);
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('chats.' . $this->message->chat_conversation_id)];
    }

    public function broadcastAs(): string
    {
        return 'chat.message.created';
    }

    public function broadcastWith(): array
    {
        return [
            'conversation_id' => $this->message->chat_conversation_id,
            'message' => (new ChatMessageResource($this->message))->resolve(),
        ];
    }
}
