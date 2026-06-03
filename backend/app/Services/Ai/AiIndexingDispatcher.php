<?php

namespace App\Services\Ai;

use App\Jobs\ReindexAiKnowledgeSourceJob;
use Illuminate\Support\Facades\DB;

class AiIndexingDispatcher
{
    public function queue(string $sourceType, int $sourceId, bool $force = false, ?int $requestedById = null): void
    {
        if (! (bool) config('ai.indexing.auto_reembed', true)) {
            return;
        }

        $dispatch = fn () => ReindexAiKnowledgeSourceJob::dispatch($sourceType, $sourceId, $force, $requestedById);

        if (DB::transactionLevel() > 0) {
            DB::afterCommit($dispatch);
            return;
        }

        $dispatch();
    }
}
