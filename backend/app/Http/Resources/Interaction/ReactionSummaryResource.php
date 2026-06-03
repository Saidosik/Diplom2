<?php

namespace App\Http\Resources\Interaction;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReactionSummaryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'likes_count' => (int) ($this['likes_count'] ?? 0),
            'dislikes_count' => (int) ($this['dislikes_count'] ?? 0),
            'my_reaction' => $this['my_reaction'] ?? null,
        ];
    }
}
