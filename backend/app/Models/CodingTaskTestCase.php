<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['coding_task_id', 'input', 'output', 'status', 'sort_order'])]

class CodingTaskTestCase extends Model
{
    use SoftDeletes;
    protected function casts()
    {
        return [
            'input' => 'array',
            'output' => 'array',
            'sort_order' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }
    

    public function codingTask() : BelongsTo
    {
        return $this->belongsTo(CodingTask::class);
    }

}
