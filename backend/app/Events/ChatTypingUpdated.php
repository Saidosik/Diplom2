<?php

namespace App\Events;

use App\Http\Resources\User\UserResource;
use App\Models\ChatConversation;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ChatTypingUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public ChatConversation $conversation,
        public User $user,
        public bool $isTyping,
    ) {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('chats.' . $this->conversation->id)];
    }

    public function broadcastAs(): string
    {
        return 'chat.typing.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'conversation_id' => $this->conversation->id,
            'user_id' => $this->user->id,
            'user' => (new UserResource($this->user))->resolve(),
            'is_typing' => $this->isTyping,
            'typing_expires_at' => $this->isTyping ? now()->addSeconds(8)->toISOString() : null,
        ];
    }
}
