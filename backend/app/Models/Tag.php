<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphToMany;

#[Fillable(['name', 'slug', 'description', 'color', 'status'])]
class Tag extends Model
{
    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function issueQuestions(): MorphToMany
    {
        return $this->morphedByMany(IssueQuestion::class, 'taggable');
    }

    public function publications(): MorphToMany
    {
        return $this->morphedByMany(Publication::class, 'taggable');
    }
}
