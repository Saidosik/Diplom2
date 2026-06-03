<?php

namespace App\Http\Resources;

use App\Http\Resources\Coding\CodingTaskResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LessonBlockResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'lesson_id' => $this->lesson_id,
            'name' => $this->name,
            'description' => $this->description,
            'type' => $this->type,
            'sort_order' => $this->sort_order,
            'status' => $this->status,
            'comments_count' => $this->whenCounted('comments'),
            'test' => new TestResource(
                $this->whenLoaded('test')
            ),
            'coding_task' => new CodingTaskResource(
                $this->whenLoaded('codingTask')
            ),
            'contents' => LessonBlockContentResource::collection(
                $this->whenLoaded('contents')
            ),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
