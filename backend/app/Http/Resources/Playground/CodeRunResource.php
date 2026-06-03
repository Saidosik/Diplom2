<?php

namespace App\Http\Resources\Playground;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CodeRunResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'snippet_id' => $this->code_snippet_id,
            'language' => $this->language,
            'code' => $this->code,
            'stdin' => $this->stdin,
            'status' => $this->status,
            'stdout' => $this->stdout,
            'stderr' => $this->stderr,
            'exit_code' => $this->exit_code,
            'message' => $this->message,
            'execution_time' => (int) ($this->execution_time ?? 0),
            'memory_usage' => (int) ($this->memory_usage ?? 0),
            'meta' => $this->meta ?? [],
            'snippet' => $this->whenLoaded('snippet', fn () => new CodeSnippetResource($this->snippet)),
            'started_at' => $this->started_at?->toISOString(),
            'finished_at' => $this->finished_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
