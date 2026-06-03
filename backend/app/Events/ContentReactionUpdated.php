<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ContentReactionUpdated implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    /**
     * @param array<string, mixed> $summary
     */
    public function __construct(
        public string $targetType,
        public int $targetId,
        public array $summary,
    ) {}

    public function broadcastOn(): array
    {
        return [new Channel("content.{$this->targetType}.{$this->targetId}")];
    }

    public function broadcastAs(): string
    {
        return 'reaction.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'target_type' => $this->targetType,
            'target_id' => $this->targetId,
            'summary' => $this->summary,
        ];
    }
}
