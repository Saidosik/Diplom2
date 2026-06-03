<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContentAttachmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $file = $this->whenLoaded('userFile');

        return [
            'id' => $this->id,
            'user_file_id' => $this->user_file_id,
            'sort_order' => (int) $this->sort_order,
            'title' => $file?->title,
            'original_name' => $file?->original_name,
            'mime_type' => $file?->mime_type,
            'size' => (int) ($file?->size ?? 0),
            'kind' => $file?->kind,
            'visibility' => $file?->visibility,
            'download_url' => $file ? "/api/laravel-file/content-attachments/{$this->id}/download" : null,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
