<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CourseEnrollmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'course_id' => $this->course_id,
            'status' => $this->status,

            'course' => CourseResource::make(
                $this->whenLoaded('course')
            ),

            'last_lesson' => $this->whenLoaded('lastLesson', fn () => [
                'id' => $this->lastLesson->id,
                'name' => $this->lastLesson->name,
                'slug' => $this->lastLesson->slug,
            ]),

            'last_lesson_block' => $this->whenLoaded('lastLessonBlock', fn () => [
                'id' => $this->lastLessonBlock->id,
                'name' => $this->lastLessonBlock->name,
                'type' => $this->lastLessonBlock->type,
            ]),

            'started_at' => $this->started_at?->toISOString(),
            'completed_at' => $this->completed_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
