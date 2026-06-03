<?php

namespace App\Http\Resources\Playground;

use App\Http\Resources\User\PublicProfileResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CodeSnippetResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'language' => $this->language,
            'snippet_type' => $this->snippet_type ?? 'snippet',
            'code' => $this->code,
            'stdin' => $this->stdin,
            'visibility' => $this->visibility,
            'status' => $this->status,
            'last_run_status' => $this->last_run_status,
            'last_run_at' => $this->last_run_at?->toISOString(),
            'author' => $this->whenLoaded('user', fn () => new PublicProfileResource($this->user)),
            'runs_count' => $this->whenCounted('runs'),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
