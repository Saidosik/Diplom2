<?php

namespace App\Events;

use App\Http\Resources\Interaction\CommentResource;
use App\Models\Comment;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ContentCommentChanged implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(
        public string $action,
        public string $targetType,
        public int $targetId,
        public ?Comment $comment = null,
    ) {
        $this->comment?->loadMissing(['user', 'repliesRecursive']);
    }

    public function broadcastOn(): array
    {
        return [new Channel("content.{$this->targetType}.{$this->targetId}")];
    }

    public function broadcastAs(): string
    {
        return "comment.{$this->action}";
    }

    public function broadcastWith(): array
    {
        return [
            'action' => $this->action,
            'target_type' => $this->targetType,
            'target_id' => $this->targetId,
            'comment' => $this->comment ? (new CommentResource($this->comment))->resolve() : null,
        ];
    }
}
