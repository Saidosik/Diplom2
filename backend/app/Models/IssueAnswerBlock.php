<?php

namespace App\Models;

use App\Enums\IssueBlockType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['issue_answer_id', 'type', 'sort_order', 'content'])]
class IssueAnswerBlock extends Model
{
    protected function casts(): array
    {
        return [
            'type' => IssueBlockType::class,
            'sort_order' => 'integer',
            'content' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function answer(): BelongsTo
    {
        return $this->belongsTo(IssueAnswer::class, 'issue_answer_id');
    }
}
