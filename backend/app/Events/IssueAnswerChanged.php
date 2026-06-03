<?php

namespace App\Events;

use App\Http\Resources\Issue\IssueAnswerResource;
use App\Models\IssueAnswer;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class IssueAnswerChanged implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(public string $action, public IssueAnswer $answer)
    {
        $this->answer->loadMissing(['author', 'blocks', 'question']);
    }

    public function broadcastOn(): array
    {
        return [new Channel('content.issue_question.' . $this->answer->issue_question_id)];
    }

    public function broadcastAs(): string
    {
        return "answer.{$this->action}";
    }

    public function broadcastWith(): array
    {
        return [
            'action' => $this->action,
            'question_id' => $this->answer->issue_question_id,
            'answer' => (new IssueAnswerResource($this->answer))->resolve(),
        ];
    }
}
