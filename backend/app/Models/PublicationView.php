<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable('publication_id', 'user_id', 'ip_hash', 'user_agent_hash', 'viewed_at')]
class PublicationView extends Model
{
    protected function casts(): array
    {
        return ['viewed_at' => 'datetime'];
    }

    public function publication(): BelongsTo
    {
        return $this->belongsTo(Publication::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
