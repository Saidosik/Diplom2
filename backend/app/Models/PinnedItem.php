<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

#[Fillable(['user_id','pinnable_type','pinnable_id','position'])]
class PinnedItem extends Model
{
    public function pinnable(): MorphTo { return $this->morphTo(); }
}
