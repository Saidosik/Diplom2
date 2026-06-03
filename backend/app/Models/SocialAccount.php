<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(
    'user_id',
    'provider',
    'provider_id',
    'email',
    'name',
    'avatar',
    'access_token',
    'refresh_token',
    'expires_at',
)]
#[Hidden(
    'access_token',
    'refresh_token',
)]
class SocialAccount extends Model
{
    protected $casts = [
        'expires_at' => 'datetime',
    ];

    public function user() : BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
