<?php

namespace App\Http\Resources\User;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class UserFileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $canDownload = $request->user() && ((int) $request->user()->id === (int) $this->user_id || $this->visibility === 'public');

        return [
            'id' => $this->id,
            'title' => $this->title,
            'original_name' => $this->original_name,
            'mime_type' => $this->mime_type,
            'size' => (int) $this->size,
            'kind' => $this->kind,
            'visibility' => $this->visibility,
            'download_url' => $canDownload ? "/api/laravel-file/me/files/{$this->id}/download" : null,
            'metadata' => $this->metadata ?? [],
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
