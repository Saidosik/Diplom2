<?php

namespace App\Http\Resources\Chat;

use App\Models\ChatMessage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ChatAttachmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $message = $this->relationLoaded('message') ? $this->message : ChatMessage::query()->find($this->chat_message_id);
        $conversationId = $message?->chat_conversation_id;
        $url = $conversationId
            ? "/api/laravel-file/chats/{$conversationId}/attachments/{$this->id}/download"
            : $this->url();

        return [
            'id' => $this->id,
            'kind' => $this->kind,
            'url' => $url,
            'path' => $this->path,
            'original_name' => $this->original_name,
            'mime_type' => $this->mime_type,
            'size' => (int) $this->size,
            'width' => $this->width,
            'height' => $this->height,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
