<?php

namespace App\Http\Resources\Social;

use App\Http\Resources\User\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FriendRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status,
            'message' => $this->message,
            'sender' => new UserResource($this->whenLoaded('sender')),
            'recipient' => new UserResource($this->whenLoaded('recipient')),
            'responded_at' => $this->responded_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
