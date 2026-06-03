<?php

namespace App\Http\Resources\Interaction;

use App\Http\Resources\Issue\IssueAnswerResource;
use App\Http\Resources\Issue\IssueQuestionResource;
use App\Http\Resources\PublicationResource;
use App\Models\IssueAnswer;
use App\Models\IssueQuestion;
use App\Models\Publication;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

class SavedItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $saveable = $this->whenLoaded('saveable');

        return [
            'id' => $this->id,
            'saveable_type' => $this->normalizeType((string) $this->saveable_type),
            'saveable_id' => $this->saveable_id,
            'item' => $this->resolveItemResource($saveable, $request),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    private function normalizeType(string $type): string
    {
        if ($type === Publication::class || Str::endsWith($type, '\\Publication')) {
            return 'publication';
        }

        if ($type === IssueQuestion::class || Str::endsWith($type, '\\IssueQuestion')) {
            return 'issue_question';
        }

        if ($type === IssueAnswer::class || Str::endsWith($type, '\\IssueAnswer')) {
            return 'issue_answer';
        }

        return $type;
    }

    private function resolveItemResource(mixed $saveable, Request $request): mixed
    {
        if ($saveable instanceof Publication) {
            return (new PublicationResource($saveable))->toArray($request);
        }

        if ($saveable instanceof IssueQuestion) {
            return (new IssueQuestionResource($saveable))->toArray($request);
        }

        if ($saveable instanceof IssueAnswer) {
            return (new IssueAnswerResource($saveable))->toArray($request);
        }

        return null;
    }
}
