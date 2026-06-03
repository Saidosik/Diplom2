<?php

namespace App\Events;

use App\Http\Resources\Playground\CodeRunResource;
use App\Models\CodeRun;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CodeRunFinished implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(public CodeRun $run)
    {
        $this->run->loadMissing('snippet');
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('users.' . $this->run->user_id)];
    }

    public function broadcastAs(): string
    {
        return 'playground.run.finished';
    }

    public function broadcastWith(): array
    {
        return [
            'run' => (new CodeRunResource($this->run))->resolve(),
        ];
    }
}
