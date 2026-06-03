<?php

namespace App\Jobs;

use App\Events\CodeRunFinished;
use App\Models\CodeRun;
use App\Services\CodeRunner\DockerCodeRunner;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class RunPlaygroundCodeJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 1;
    public int $timeout = 180;

    public function __construct(public int $codeRunId)
    {
        $this->onQueue('code-runs');
    }

    public function handle(DockerCodeRunner $runner): void
    {
        $run = CodeRun::query()->with('snippet')->findOrFail($this->codeRunId);

        if (! in_array($run->status, ['queued', 'running'], true)) {
            return;
        }

        $run->update([
            'status' => 'running',
            'started_at' => $run->started_at ?? now(),
            'message' => 'Код выполняется в изолированном Docker sandbox.',
        ]);

        try {
            $result = $runner->runSnippet($run->language, $run->code, $run->stdin ?? '');
            $status = $result->status === 'finished' ? 'finished' : $result->status;

            $run->update([
                'status' => $status,
                'stdout' => $result->stdout,
                'stderr' => $result->stderr,
                'exit_code' => $result->exitCode,
                'message' => $result->message,
                'execution_time' => $result->executionTime,
                'memory_usage' => $result->memoryUsage,
                'finished_at' => now(),
            ]);
        } catch (Throwable $exception) {
            $run->update([
                'status' => 'failed',
                'stderr' => $exception->getMessage(),
                'exit_code' => 1,
                'message' => $exception->getMessage(),
                'finished_at' => now(),
            ]);
        }

        $run->loadMissing('snippet');

        if ($run->snippet) {
            $run->snippet->update([
                'last_run_status' => $run->status,
                'last_run_at' => now(),
            ]);
        }

        broadcast(new CodeRunFinished($run->fresh()->load('snippet')));
    }

    public function failed(Throwable $exception): void
    {
        $run = CodeRun::query()->with('snippet')->find($this->codeRunId);

        if (! $run) {
            return;
        }

        $run->update([
            'status' => 'failed',
            'stderr' => $exception->getMessage(),
            'exit_code' => 1,
            'message' => $exception->getMessage(),
            'finished_at' => now(),
        ]);

        if ($run->snippet) {
            $run->snippet->update([
                'last_run_status' => 'failed',
                'last_run_at' => now(),
            ]);
        }

        broadcast(new CodeRunFinished($run->fresh()->load('snippet')));
    }
}
