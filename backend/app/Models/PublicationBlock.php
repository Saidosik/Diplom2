<?php

namespace App\Models;

use App\Enums\PublicationBlockType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable('publication_id',
        'type',
        'sort_order',
        'content',)]

class PublicationBlock extends Model
{

    protected function casts(): array
    {
        return [
            'type' => PublicationBlockType::class,
            'content' => 'array',
            'sort_order' => 'integer',
        ];
    }

    public function publication() : BelongsTo
    {
        return $this->belongsTo(Publication::class);
    }
}
