<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphToMany;

#[Fillable(['name', 'slug', 'description', 'color', 'status'])]
class Tag extends Model
{
    public const STATUS_ACTIVE = 'active';
    public const STATUS_INACTIVE = 'inactive';
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

    public function scopeWithUsageCounts(Builder $query): Builder
    {
        return $query->withCount([
            'publications as publications_count',
            'issueQuestions as questions_count',
        ])->selectSub(function ($query) {
            $query->from('taggables')
                ->selectRaw('count(*)')
                ->whereColumn('taggables.tag_id', 'tags.id');
        }, 'total_usage_count');
    }

    public function loadUsageCounts(): self
    {
        $this->loadCount([
            'publications as publications_count',
            'issueQuestions as questions_count',
        ]);

        $this->setAttribute('total_usage_count', (int) $this->publications_count + (int) $this->questions_count);

        return $this;
    }
}
