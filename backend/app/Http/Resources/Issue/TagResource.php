<?php

namespace App\Http\Resources\Issue;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TagResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'color' => $this->color,
            'status' => $this->status,
            'publications_count' => (int) ($this->publications_count ?? 0),
            'questions_count' => (int) ($this->questions_count ?? $this->issue_questions_count ?? 0),
        ];
    }
}
