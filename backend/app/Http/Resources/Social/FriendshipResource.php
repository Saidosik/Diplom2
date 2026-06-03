<?php

namespace App\Http\Resources\Social;

use App\Http\Resources\User\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FriendshipResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $friend = $request->user() ? $this->friendFor($request->user()) : null;

        return [
            'id' => $this->id,
            'friend' => $friend ? new UserResource($friend) : null,
            'user_one_id' => $this->user_one_id,
            'user_two_id' => $this->user_two_id,
            'requested_by_id' => $this->requested_by_id,
            'friended_at' => $this->friended_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
