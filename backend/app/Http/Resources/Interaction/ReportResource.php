<?php

namespace App\Http\Resources\Interaction;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReportResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reportable_type' => $this->reportable_type,
            'reportable_id' => $this->reportable_id,
            'reason' => $this->reason,
            'details' => $this->details,
            'status' => $this->status,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
