<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiModelConfig extends Model
{
    protected $fillable = [
        'provider',
        'model_id',
        'name',
        'description',
        'category',
        'modality',
        'context_length',
        'input_modalities',
        'output_modalities',
        'supported_parameters',
        'pricing',
        'metadata',
        'is_available',
        'enabled',
        'use_for_chat',
        'use_for_embeddings',
        'use_for_rerank',
        'default_for_chat',
        'default_for_embeddings',
        'default_for_rerank',
        'system_prompt',
        'temperature',
        'max_tokens',
        'dimensions',
        'sort_order',
        'last_seen_at',
    ];

    protected function casts(): array
    {
        return [
            'context_length' => 'integer',
            'input_modalities' => 'array',
            'output_modalities' => 'array',
            'supported_parameters' => 'array',
            'pricing' => 'array',
            'metadata' => 'array',
            'is_available' => 'boolean',
            'enabled' => 'boolean',
            'use_for_chat' => 'boolean',
            'use_for_embeddings' => 'boolean',
            'use_for_rerank' => 'boolean',
            'default_for_chat' => 'boolean',
            'default_for_embeddings' => 'boolean',
            'default_for_rerank' => 'boolean',
            'temperature' => 'float',
            'max_tokens' => 'integer',
            'dimensions' => 'integer',
            'sort_order' => 'integer',
            'last_seen_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function isChatModel(): bool
    {
        return $this->use_for_chat || str_contains((string) $this->modality, 'text');
    }

    public function isEmbeddingModel(): bool
    {
        if ($this->use_for_embeddings) {
            return true;
        }

        $text = mb_strtolower($this->model_id . ' ' . $this->name . ' ' . $this->modality);

        return str_contains($text, 'embed') || str_contains($text, 'embedding');
    }
}
