<?php

namespace App\Http\Resources\User;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserFileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isOwner = $request->user() && (int) $request->user()->id === (int) $this->user_id;
        $canDownload = $isOwner || $this->visibility === 'public';
        $canPreview = in_array($this->kind, ['image', 'pdf', 'text', 'audio', 'video'], true);
        $previewUrl = $canDownload && $canPreview ? "/api/laravel-file/me/files/{$this->id}/preview" : null;
        $shareUrl = $this->visibility === 'public' ? "/files/{$this->id}" : null;

        return [
            'id' => $this->id,
            'title' => $this->title,
            'original_name' => $this->original_name,
            'mime_type' => $this->mime_type,
            'size' => (int) $this->size,
            'kind' => $this->kind,
            'visibility' => $this->visibility,
            'is_owner' => $isOwner,
            'can_preview' => $canPreview,
            'can_download' => $canDownload,
            'preview_url' => $previewUrl,
            'download_url' => $canDownload ? "/api/laravel-file/me/files/{$this->id}/download" : null,
            'public_url' => $shareUrl,
            'share_url' => $shareUrl,
            'metadata' => $this->metadata ?? [],
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
