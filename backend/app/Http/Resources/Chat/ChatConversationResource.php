<?php

namespace App\Http\Resources\Chat;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ChatConversationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $participant = null;
        if ($request->user() && $this->relationLoaded('participants')) {
            $participant = $this->participants->firstWhere('user_id', $request->user()->id);
        }

        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $this->displayTitle($request),
            'description' => $this->description,
            'avatar' => $this->avatar,
            'avatar_url' => $this->avatar ? Storage::disk('public')->url($this->avatar) : null,
            'participants' => ChatParticipantResource::collection($this->whenLoaded('participants')),
            'last_message' => $this->whenLoaded('lastMessage', fn () => $this->lastMessage ? new ChatMessageResource($this->lastMessage) : null),
            'last_message_at' => $this->last_message_at?->toISOString(),
            'unread_count' => (int) ($this->unread_count ?? 0),
            'my_role' => $participant?->role,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    private function displayTitle(Request $request): ?string
    {
        if ($this->type === 'group') {
            return $this->title;
        }

        if (! $request->user() || ! $this->relationLoaded('participants')) {
            return $this->title;
        }

        $other = $this->participants
            ->filter(fn ($participant) => (int) $participant->user_id !== (int) $request->user()->id)
            ->first();

        return $other?->user?->name ?? $this->title ?? 'Личный чат';
    }
}
