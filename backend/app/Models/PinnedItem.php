<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

#[Fillable(['user_id','pinnable_type','pinnable_id','title_override','description_override','position','visibility'])]
class PinnedItem extends Model
{
    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function pinnable(): MorphTo
    {
        return $this->morphTo();
    }

    public function isPublic(): bool
    {
        return ($this->visibility ?? 'public') === 'public';
    }
}
