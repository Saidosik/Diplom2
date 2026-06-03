<?php

namespace App\Models;

use App\Enums\IssueBlockType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['issue_question_id', 'type', 'sort_order', 'content'])]
class IssueBlock extends Model
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

    public function question(): BelongsTo
    {
        return $this->belongsTo(IssueQuestion::class, 'issue_question_id');
    }
}
