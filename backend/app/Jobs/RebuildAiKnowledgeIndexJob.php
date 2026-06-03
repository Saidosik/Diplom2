<?php

namespace App\Jobs;

use App\Services\Ai\KnowledgeExtractorService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class RebuildAiKnowledgeIndexJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 900;

    public function __construct(
        public readonly bool $force = true,
        public readonly ?int $requestedById = null,
    ) {
        $this->onQueue((string) config('ai.indexing.queue', 'ai-index'));
    }

    public function handle(KnowledgeExtractorService $extractor): void
    {
        $extractor->rebuild($this->force, $this->requestedById);
    }
}
