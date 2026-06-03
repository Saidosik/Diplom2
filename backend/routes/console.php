<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');


Artisan::command('ai:reindex', function () {
    $stats = app(\App\Services\Ai\KnowledgeExtractorService::class)->rebuild();
    $this->info('AI RAG индекс пересобран. Documents: ' . $stats['documents'] . ', chunks: ' . $stats['chunks']);
})->purpose('Rebuild AI RAG knowledge index from platform content');
