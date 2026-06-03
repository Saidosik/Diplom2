<?php

namespace App\Jobs;

use App\Services\Ai\KnowledgeExtractorService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ReindexAiKnowledgeSourceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $timeout = 180;

    public function __construct(
        public readonly string $sourceType,
        public readonly int $sourceId,
        public readonly bool $force = false,
        public readonly ?int $requestedById = null,
    ) {
        $this->onQueue((string) config('ai.indexing.queue', 'ai-index'));
    }

    public function handle(KnowledgeExtractorService $extractor): void
    {
        $extractor->reindexSource($this->sourceType, $this->sourceId, $this->force, $this->requestedById);
    }
}
