<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'ai_knowledge_document_id',
    'source_type',
    'source_id',
    'chunk_index',
    'title',
    'content',
    'search_text',
    'content_hash',
    'embedding',
    'embedding_vector',
    'token_count',
    'embedding_provider',
    'embedding_model',
    'embedding_dimensions',
    'metadata',
    'indexed_at',
])]
class AiKnowledgeChunk extends Model
{
    protected function casts(): array
    {
        return [
            'embedding' => 'array',
            'embedding_vector' => 'array',
            'metadata' => 'array',
            'token_count' => 'integer',
            'embedding_dimensions' => 'integer',
            'indexed_at' => 'datetime',
        ];
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(AiKnowledgeDocument::class, 'ai_knowledge_document_id');
    }
}
