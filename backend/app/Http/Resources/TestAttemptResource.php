<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TestAttemptResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'test_id' => $this->test_id,
            'user_id' => $this->user_id,

            'score' => $this->score ?? null,
            'max_score' => $this->max_score ?? null,
            'status' => $this->status ?? null,
            'is_passed' => $this->status === 'passed',

            'user_answers' => $this->whenLoaded('userAnswers', function () {
                return $this->userAnswers->map(fn ($answer) => [
                    'id' => $answer->id,
                    'question_id' => $answer->question_id,
                    'status' => $answer->status,
                    'content' => $answer->content,
                ]);
            }),

            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
