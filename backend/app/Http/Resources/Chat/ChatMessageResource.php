<?php

namespace App\Http\Resources\Chat;

use App\Http\Resources\User\UserResource;
use App\Models\ChatParticipant;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ChatMessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $readers = collect();
        $activeReadersTarget = 0;

        if ($this->created_at && $this->chat_conversation_id) {
            $participants = ChatParticipant::query()
                ->where('chat_conversation_id', $this->chat_conversation_id)
                ->whereNull('left_at')
                ->where('user_id', '!=', $this->sender_id)
                ->with('user')
                ->get();

            $activeReadersTarget = $participants->count();
            $readers = $participants
                ->filter(fn (ChatParticipant $participant) => $participant->last_read_at !== null && $participant->last_read_at->greaterThanOrEqualTo($this->created_at))
                ->values();
        }

        return [
            'id' => $this->id,
            'conversation_id' => $this->chat_conversation_id,
            'sender' => $this->sender ? new UserResource($this->sender) : null,
            'type' => $this->type,
            'body' => $this->body,
            'metadata' => $this->metadata ?? [],
            'attachments' => ChatAttachmentResource::collection($this->whenLoaded('attachments')),
            'read_by' => ChatParticipantResource::collection($readers),
            'read_by_count' => $readers->count(),
            'read_by_user_ids' => $readers->pluck('user_id')->map(fn ($id) => (int) $id)->values()->all(),
            'is_read_by_everyone' => $activeReadersTarget > 0 && $readers->count() >= $activeReadersTarget,
            'active_readers_target' => $activeReadersTarget,
            'edited_at' => $this->edited_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
