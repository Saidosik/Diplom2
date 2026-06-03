<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'lesson_block_id' => $this->lesson_block_id,
            'name' => $this->name,
            'description' => $this->description,
            'sort_order' => $this->sort_order,
            'status' => $this->status,

            'questions' => QuestionResource::collection(
                $this->whenLoaded('questions')
            ),

            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
