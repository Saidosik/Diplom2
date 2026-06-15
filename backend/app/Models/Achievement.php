<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['key','name','description','icon','category','points','rarity','condition_type','condition_value','is_active'])]
class Achievement extends Model
{
    protected function casts(): array { return ['is_active' => 'boolean', 'points' => 'integer', 'condition_value' => 'integer']; }
}
