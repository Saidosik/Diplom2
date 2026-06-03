<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'user_id',
    'code_snippet_id',
    'language',
    'code',
    'stdin',
    'status',
    'stdout',
    'stderr',
    'exit_code',
    'message',
    'execution_time',
    'memory_usage',
    'meta',
    'started_at',
    'finished_at',
])]
class CodeRun extends Model
{
    use SoftDeletes;

    protected function casts(): array
    {
        return [
            'exit_code' => 'integer',
            'execution_time' => 'integer',
            'memory_usage' => 'integer',
            'meta' => 'array',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function snippet(): BelongsTo
    {
        return $this->belongsTo(CodeSnippet::class, 'code_snippet_id');
    }
}
