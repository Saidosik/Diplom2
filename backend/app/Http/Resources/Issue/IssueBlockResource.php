<?php

namespace App\Http\Resources\Issue;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class IssueBlockResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type?->value,
            'type_label' => $this->type?->label(),
            'sort_order' => $this->sort_order,
            'content' => $this->content ?? [],
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
