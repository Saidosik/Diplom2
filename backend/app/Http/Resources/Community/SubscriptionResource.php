<?php

namespace App\Http\Resources\Community;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubscriptionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'subscribable_type' => $this->subscribable_type,
            'subscribable_id' => $this->subscribable_id,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
