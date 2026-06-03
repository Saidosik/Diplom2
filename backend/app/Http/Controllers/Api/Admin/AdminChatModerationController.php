<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ChatAttachment;
use App\Models\ChatConversation;
use App\Models\ChatMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class AdminChatModerationController extends Controller
{
    public function conversations(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:160'],
            'type' => ['nullable', Rule::in(['direct', 'group', 'all'])],
            'status' => ['nullable', Rule::in(['active', 'deleted', 'all'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = ChatConversation::withTrashed()
            ->with(['owner', 'participants.user', 'lastMessage.sender'])
            ->withCount(['participants', 'messages'])
            ->latest('last_message_at');

        if (($validated['status'] ?? 'active') === 'deleted') {
            $query->onlyTrashed();
        } elseif (($validated['status'] ?? 'active') === 'active') {
            $query->whereNull('deleted_at');
        }

        if (($validated['type'] ?? 'all') !== 'all') {
            $query->where('type', $validated['type']);
        }

        if (! empty($validated['q'])) {
            $search = trim($validated['q']);
            $query->where(function ($builder) use ($search) {
                $builder->where('title', 'ILIKE', "%{$search}%")
                    ->orWhereHas('participants.user', fn ($users) => $users
                        ->where('name', 'ILIKE', "%{$search}%")
                        ->orWhere('email', 'ILIKE', "%{$search}%"));
            });
        }

        return $this->paginated($query->paginate((int) ($validated['per_page'] ?? 20)), fn ($conversation) => $this->serializeConversation($conversation));
    }

    public function show(int $conversation): JsonResponse
    {
        $model = ChatConversation::withTrashed()
            ->with(['owner', 'participants.user', 'lastMessage.sender'])
            ->withCount(['participants', 'messages'])
            ->findOrFail($conversation);

        return response()->json(['data' => $this->serializeConversation($model, detailed: true)]);
    }

    public function messages(Request $request, int $conversation): JsonResponse
    {
        $model = ChatConversation::withTrashed()->findOrFail($conversation);

        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:160'],
            'status' => ['nullable', Rule::in(['active', 'deleted', 'all'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = ChatMessage::withTrashed()
            ->where('chat_conversation_id', $model->id)
            ->with(['sender', 'attachments'])
            ->latest();

        if (($validated['status'] ?? 'active') === 'deleted') {
            $query->onlyTrashed();
        } elseif (($validated['status'] ?? 'active') === 'active') {
            $query->whereNull('deleted_at');
        }

        if (! empty($validated['q'])) {
            $query->where('body', 'ILIKE', '%' . trim($validated['q']) . '%');
        }

        return $this->paginated($query->paginate((int) ($validated['per_page'] ?? 30)), fn ($message) => $this->serializeMessage($message));
    }

    public function destroyConversation(int $conversation): JsonResponse
    {
        $model = ChatConversation::query()->findOrFail($conversation);
        $model->delete();
        $model = ChatConversation::withTrashed()->with(['owner', 'participants.user'])->findOrFail($conversation);

        return response()->json(['data' => $this->serializeConversation($model)]);
    }

    public function restoreConversation(int $conversation): JsonResponse
    {
        $model = ChatConversation::withTrashed()->findOrFail($conversation);
        $model->restore();

        return response()->json(['data' => $this->serializeConversation($model->fresh(['owner', 'participants.user']))]);
    }

    public function destroyMessage(int $conversation, int $message): JsonResponse
    {
        ChatConversation::withTrashed()->findOrFail($conversation);
        $model = ChatMessage::query()
            ->where('chat_conversation_id', $conversation)
            ->findOrFail($message);
        $model->delete();
        $model = ChatMessage::withTrashed()->with(['sender', 'attachments'])->where('chat_conversation_id', $conversation)->findOrFail($message);

        return response()->json(['data' => $this->serializeMessage($model)]);
    }

    public function restoreMessage(int $conversation, int $message): JsonResponse
    {
        ChatConversation::withTrashed()->findOrFail($conversation);
        $model = ChatMessage::withTrashed()
            ->where('chat_conversation_id', $conversation)
            ->findOrFail($message);
        $model->restore();

        return response()->json(['data' => $this->serializeMessage($model->fresh(['sender', 'attachments']))]);
    }

    private function paginated(LengthAwarePaginator $paginator, callable $mapper): JsonResponse
    {
        return response()->json([
            'data' => collect($paginator->items())->map($mapper)->values(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    private function serializeConversation(ChatConversation $conversation, bool $detailed = false): array
    {
        return [
            'id' => $conversation->id,
            'type' => $conversation->type,
            'title' => $conversation->title,
            'description' => $conversation->description,
            'owner' => $conversation->owner ? AdminUserController::serializeUser($conversation->owner) : null,
            'participants_count' => (int) ($conversation->participants_count ?? ($conversation->relationLoaded('participants') ? $conversation->participants->count() : 0)),
            'messages_count' => (int) ($conversation->messages_count ?? 0),
            'last_message_at' => $conversation->last_message_at?->toISOString(),
            'last_message' => $conversation->lastMessage ? $this->serializeMessage($conversation->lastMessage) : null,
            'participants' => $detailed && $conversation->relationLoaded('participants')
                ? $conversation->participants->map(fn ($participant) => [
                    'id' => $participant->id,
                    'role' => $participant->role,
                    'joined_at' => $participant->joined_at?->toISOString(),
                    'left_at' => $participant->left_at?->toISOString(),
                    'user' => $participant->user ? AdminUserController::serializeUser($participant->user) : null,
                ])->values()
                : [],
            'deleted_at' => $conversation->deleted_at?->toISOString(),
            'created_at' => $conversation->created_at?->toISOString(),
            'updated_at' => $conversation->updated_at?->toISOString(),
        ];
    }

    private function serializeMessage(ChatMessage $message): array
    {
        return [
            'id' => $message->id,
            'conversation_id' => $message->chat_conversation_id,
            'type' => $message->type,
            'body' => $message->body,
            'sender' => $message->sender ? AdminUserController::serializeUser($message->sender) : null,
            'attachments' => $message->relationLoaded('attachments')
                ? $message->attachments->map(fn (ChatAttachment $attachment) => [
                    'id' => $attachment->id,
                    'kind' => $attachment->kind,
                    'original_name' => $attachment->original_name,
                    'mime_type' => $attachment->mime_type,
                    'size' => (int) $attachment->size,
                    'url' => Storage::disk($attachment->disk ?? 'public')->url($attachment->path),
                ])->values()
                : [],
            'edited_at' => $message->edited_at?->toISOString(),
            'deleted_at' => $message->deleted_at?->toISOString(),
            'created_at' => $message->created_at?->toISOString(),
            'updated_at' => $message->updated_at?->toISOString(),
        ];
    }
}
