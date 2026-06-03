<?php

namespace App\Http\Resources\Chat;

use App\Http\Resources\User\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ChatParticipantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'role' => $this->role,
            'user' => new UserResource($this->whenLoaded('user')),
            'last_read_at' => $this->last_read_at?->toISOString(),
            'muted_until' => $this->muted_until?->toISOString(),
            'joined_at' => $this->joined_at?->toISOString(),
            'left_at' => $this->left_at?->toISOString(),
            'is_typing' => (bool) ($this->is_typing ?? false),
            'typing_started_at' => $this->typing_started_at?->toISOString(),
            'typing_expires_at' => $this->typing_expires_at?->toISOString(),
        ];
    }
}
