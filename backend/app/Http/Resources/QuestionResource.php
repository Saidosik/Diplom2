<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuestionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'test_id' => $this->test_id,
            'sort_order' => $this->sort_order,
            'type' => $this->type,
            'status' => $this->status,
            'content' => $this->content,

            'answer_options' => AnswerOptionResource::collection(
                $this->whenLoaded('answerOptions')
            ),

            'answer' => new AuthorAnswerResource(
                $this->whenLoaded('answer')
            ),

            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
