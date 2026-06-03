<?php

namespace App\Events;

use App\Models\Solution;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SolutionCheckProgressed implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    /**
     * @param array<string, mixed> $payload
     */
    public function __construct(
        public Solution $solution,
        public array $payload = [],
    ) {}

    public function broadcastOn(): Channel
    {
        return new Channel('solutions.' . $this->solution->id);
    }

    public function broadcastAs(): string
    {
        return 'solution.progressed';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $this->solution->loadMissing('results');

        return array_merge([
            'solution_id' => $this->solution->id,
            'status' => $this->solution->status,
            'passed_tests' => $this->solution->results->where('status', 'passed')->count(),
            'failed_tests' => $this->solution->results->where('status', '!=', 'passed')->count(),
            'checked_tests' => $this->solution->results->count(),
            'updated_at' => now()->toISOString(),
        ], $this->payload);
    }
}
