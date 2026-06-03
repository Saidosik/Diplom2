<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'source_type',
    'source_id',
    'title',
    'url',
    'status',
    'content_hash',
    'language',
    'tags',
    'metadata',
    'indexed_at',
    'source_updated_at',
    'last_error',
    'chunks_count',
    'embedding_provider',
    'embedding_model',
    'embedding_dimensions',
    'reindexed_by_id',
])]
class AiKnowledgeDocument extends Model
{
    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'metadata' => 'array',
            'indexed_at' => 'datetime',
            'source_updated_at' => 'datetime',
            'chunks_count' => 'integer',
            'embedding_dimensions' => 'integer',
        ];
    }

    public function chunks(): HasMany
    {
        return $this->hasMany(AiKnowledgeChunk::class);
    }
}
