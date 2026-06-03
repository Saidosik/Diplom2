<?php

namespace App\Http\Controllers\Api\Chat;

use App\Events\ChatConversationUpdated;
use App\Events\ChatMessageCreated;
use App\Events\ChatReadUpdated;
use App\Events\ChatTypingUpdated;
use App\Http\Controllers\Controller;
use App\Http\Resources\Chat\ChatConversationResource;
use App\Http\Resources\Chat\ChatMessageResource;
use App\Models\ChatAttachment;
use App\Models\ChatConversation;
use App\Models\ChatMessage;
use App\Models\ChatParticipant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ChatController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $perPage = min(max((int) $request->query('per_page', 20), 1), 50);

        $conversations = ChatConversation::query()
            ->whereHas('activeParticipants', fn ($query) => $query->where('user_id', $user->id))
            ->with(['participants.user', 'lastMessage.sender', 'lastMessage.attachments'])
            ->withCount(['messages as unread_count' => function ($query) use ($user) {
                $query->where('sender_id', '!=', $user->id)
                    ->whereColumn('chat_messages.created_at', '>', DB::raw("COALESCE((select last_read_at from chat_participants where chat_participants.chat_conversation_id = chat_messages.chat_conversation_id and chat_participants.user_id = {$user->id} limit 1), '1970-01-01')"));
            }])
            ->orderByDesc('last_message_at')
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString();

        return ChatConversationResource::collection($conversations);
    }

    public function show(Request $request, ChatConversation $conversation)
    {
        $this->authorizeParticipant($request, $conversation);

        $conversation->load(['participants.user', 'lastMessage.sender', 'lastMessage.attachments']);
        $conversation->unread_count = $this->unreadCount($conversation, $request->user());

        return new ChatConversationResource($conversation);
    }

    public function messages(Request $request, ChatConversation $conversation)
    {
        $this->authorizeParticipant($request, $conversation);

        $perPage = min(max((int) $request->query('per_page', 30), 1), 100);

        $messages = ChatMessage::query()
            ->where('chat_conversation_id', $conversation->id)
            ->with(['sender', 'attachments'])
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        return ChatMessageResource::collection($messages);
    }

    public function direct(Request $request)
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', Rule::exists('users', 'id')],
        ]);

        $user = $request->user();
        $otherId = (int) $data['user_id'];
        abort_if($otherId === (int) $user->id, 422, 'Нельзя создать чат с самим собой.');

        $key = $this->directKey((int) $user->id, $otherId);

        $conversation = DB::transaction(function () use ($user, $otherId, $key) {
            $conversation = ChatConversation::query()->firstOrCreate([
                'direct_key' => $key,
            ], [
                'type' => ChatConversation::TYPE_DIRECT,
                'owner_id' => $user->id,
                'last_message_at' => now(),
            ]);

            ChatParticipant::query()->firstOrCreate([
                'chat_conversation_id' => $conversation->id,
                'user_id' => $user->id,
            ], [
                'role' => ChatParticipant::ROLE_MEMBER,
                'joined_at' => now(),
            ]);

            ChatParticipant::query()->firstOrCreate([
                'chat_conversation_id' => $conversation->id,
                'user_id' => $otherId,
            ], [
                'role' => ChatParticipant::ROLE_MEMBER,
                'joined_at' => now(),
            ]);

            return $conversation;
        });

        $conversation->load(['participants.user', 'lastMessage.sender', 'lastMessage.attachments']);
        $conversation->unread_count = $this->unreadCount($conversation, $user);

        return new ChatConversationResource($conversation);
    }

    public function group(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:1000'],
            'participant_ids' => ['array', 'max:50'],
            'participant_ids.*' => ['integer', Rule::exists('users', 'id')],
        ]);

        $user = $request->user();
        $participantIds = collect($data['participant_ids'] ?? [])
            ->push($user->id)
            ->unique()
            ->values();

        $conversation = DB::transaction(function () use ($data, $user, $participantIds) {
            $conversation = ChatConversation::query()->create([
                'type' => ChatConversation::TYPE_GROUP,
                'owner_id' => $user->id,
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'last_message_at' => now(),
            ]);

            foreach ($participantIds as $participantId) {
                ChatParticipant::query()->create([
                    'chat_conversation_id' => $conversation->id,
                    'user_id' => $participantId,
                    'role' => (int) $participantId === (int) $user->id ? ChatParticipant::ROLE_OWNER : ChatParticipant::ROLE_MEMBER,
                    'joined_at' => now(),
                ]);
            }

            return $conversation;
        });

        $conversation->load(['participants.user', 'lastMessage.sender', 'lastMessage.attachments']);
        broadcast(new ChatConversationUpdated($conversation))->toOthers();

        return (new ChatConversationResource($conversation))->response()->setStatusCode(201);
    }

    public function storeMessage(Request $request, ChatConversation $conversation)
    {
        $this->authorizeParticipant($request, $conversation);

        $allowedMimes = implode(',', config('community_security.uploads.chat.allowed_mimetypes', []));
        $maxFiles = (int) config('community_security.uploads.chat.max_files', 5);
        $maxFileKb = (int) config('community_security.uploads.chat.max_file_kb', 10240);

        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:5000'],
            'attachments' => ['nullable', 'array', 'max:' . $maxFiles],
            'attachments.*' => ['file', 'mimetypes:' . $allowedMimes, 'max:' . $maxFileKb],
        ], [
            'attachments.max' => "За одно сообщение можно прикрепить не более {$maxFiles} файлов.",
            'attachments.*.mimetypes' => 'Тип файла не разрешён для загрузки в чат.',
            'attachments.*.max' => "Размер одного файла не должен превышать {$maxFileKb} КБ.",
        ]);

        $files = $request->file('attachments', []);
        abort_if(trim((string) ($data['body'] ?? '')) === '' && count($files) === 0, 422, 'Сообщение не может быть пустым.');

        $message = DB::transaction(function () use ($request, $conversation, $data, $files) {
            $message = ChatMessage::query()->create([
                'chat_conversation_id' => $conversation->id,
                'sender_id' => $request->user()->id,
                'type' => count($files) > 0 ? ChatMessage::TYPE_FILE : ChatMessage::TYPE_TEXT,
                'body' => $data['body'] ?? null,
                'metadata' => [],
            ]);

            foreach ($files as $file) {
                $path = $file->store("chat/{$conversation->id}", 'local');
                [$width, $height] = $this->imageSize($file->getRealPath(), (string) $file->getMimeType());

                ChatAttachment::query()->create([
                    'chat_message_id' => $message->id,
                    'user_id' => $request->user()->id,
                    'disk' => 'local',
                    'path' => $path,
                    'original_name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize() ?: 0,
                    'kind' => $this->attachmentKind((string) $file->getMimeType()),
                    'width' => $width,
                    'height' => $height,
                    'metadata' => [],
                ]);
            }

            $conversation->forceFill([
                'last_message_id' => $message->id,
                'last_message_at' => now(),
            ])->save();

            ChatParticipant::query()
                ->where('chat_conversation_id', $conversation->id)
                ->where('user_id', $request->user()->id)
                ->update(['last_read_at' => now()]);

            return $message->load(['sender', 'attachments']);
        });

        broadcast(new ChatMessageCreated($message))->toOthers();
        broadcast(new ChatConversationUpdated($conversation->fresh(['participants.user', 'lastMessage.sender', 'lastMessage.attachments'])))->toOthers();

        return (new ChatMessageResource($message))->response()->setStatusCode(201);
    }


    public function downloadAttachment(Request $request, ChatConversation $conversation, ChatAttachment $attachment)
    {
        $this->authorizeParticipant($request, $conversation);

        $attachment->loadMissing('message');
        abort_unless($attachment->message && (int) $attachment->message->chat_conversation_id === (int) $conversation->id, 404);

        $disk = $attachment->disk ?: 'local';
        abort_unless(Storage::disk($disk)->exists($attachment->path), 404, 'Файл не найден.');

        $path = Storage::disk($disk)->path($attachment->path);
        $filename = str_replace(['"', "\r", "\n"], '', $attachment->original_name ?: basename($attachment->path));

        return response()->file($path, [
            'Content-Type' => $attachment->mime_type ?: 'application/octet-stream',
            'Content-Disposition' => 'inline; filename="' . $filename . '"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, max-age=300',
        ]);
    }

    public function updateMessage(Request $request, ChatConversation $conversation, ChatMessage $message)
    {
        $this->authorizeParticipant($request, $conversation);
        abort_unless((int) $message->chat_conversation_id === (int) $conversation->id, 404);
        abort_unless((int) $message->sender_id === (int) $request->user()->id, 403);

        $data = $request->validate([
            'body' => ['required', 'string', 'max:10000'],
        ]);

        $message->update([
            'body' => $data['body'],
            'edited_at' => now(),
        ]);

        $message->load(['sender', 'attachments']);
        broadcast(new ChatMessageCreated($message))->toOthers();

        return new ChatMessageResource($message);
    }

    public function destroyMessage(Request $request, ChatConversation $conversation, ChatMessage $message): JsonResponse
    {
        $this->authorizeParticipant($request, $conversation);
        abort_unless((int) $message->chat_conversation_id === (int) $conversation->id, 404);
        abort_unless((int) $message->sender_id === (int) $request->user()->id || $this->isOwner($conversation, $request->user()), 403);

        $message->delete();

        return response()->json(['message' => 'Сообщение удалено.']);
    }

    public function markRead(Request $request, ChatConversation $conversation): JsonResponse
    {
        $this->authorizeParticipant($request, $conversation);

        $participant = ChatParticipant::query()
            ->where('chat_conversation_id', $conversation->id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $participant->forceFill([
            'last_read_at' => now(),
            'is_typing' => false,
            'typing_started_at' => null,
            'typing_expires_at' => null,
        ])->save();

        $participant->load('user');
        broadcast(new ChatReadUpdated($conversation, $participant))->toOthers();
        broadcast(new ChatTypingUpdated($conversation, $request->user(), false))->toOthers();

        return response()->json([
            'message' => 'Диалог отмечен прочитанным.',
            'participant' => $participant,
        ]);
    }

    public function typing(Request $request, ChatConversation $conversation): JsonResponse
    {
        $this->authorizeParticipant($request, $conversation);

        $data = $request->validate([
            'is_typing' => ['sometimes', 'boolean'],
        ]);

        $isTyping = (bool) ($data['is_typing'] ?? true);

        ChatParticipant::query()
            ->where('chat_conversation_id', $conversation->id)
            ->where('user_id', $request->user()->id)
            ->update([
                'is_typing' => $isTyping,
                'typing_started_at' => $isTyping ? now() : null,
                'typing_expires_at' => $isTyping ? now()->addSeconds(8) : null,
            ]);

        broadcast(new ChatTypingUpdated($conversation, $request->user(), $isTyping))->toOthers();

        return response()->json([
            'message' => $isTyping ? 'Статус набора включён.' : 'Статус набора выключен.',
            'is_typing' => $isTyping,
            'typing_expires_at' => $isTyping ? now()->addSeconds(8)->toISOString() : null,
        ]);
    }

    public function addParticipants(Request $request, ChatConversation $conversation)
    {
        $this->authorizeParticipant($request, $conversation);
        abort_unless($conversation->type === ChatConversation::TYPE_GROUP, 422, 'Участников можно добавлять только в групповой чат.');
        abort_unless($this->isOwner($conversation, $request->user()), 403);

        $data = $request->validate([
            'participant_ids' => ['required', 'array', 'min:1', 'max:50'],
            'participant_ids.*' => ['integer', Rule::exists('users', 'id')],
        ]);

        foreach (array_unique($data['participant_ids']) as $participantId) {
            ChatParticipant::query()->updateOrCreate([
                'chat_conversation_id' => $conversation->id,
                'user_id' => $participantId,
            ], [
                'role' => ChatParticipant::ROLE_MEMBER,
                'joined_at' => now(),
                'left_at' => null,
            ]);
        }

        $conversation->load(['participants.user', 'lastMessage.sender', 'lastMessage.attachments']);
        broadcast(new ChatConversationUpdated($conversation))->toOthers();

        return new ChatConversationResource($conversation);
    }

    public function leave(Request $request, ChatConversation $conversation): JsonResponse
    {
        $this->authorizeParticipant($request, $conversation);

        ChatParticipant::query()
            ->where('chat_conversation_id', $conversation->id)
            ->where('user_id', $request->user()->id)
            ->update(['left_at' => now()]);

        return response()->json(['message' => 'Вы вышли из чата.']);
    }

    private function authorizeParticipant(Request $request, ChatConversation $conversation): void
    {
        abort_unless($conversation->activeParticipants()->where('user_id', $request->user()->id)->exists(), 403, 'Нет доступа к чату.');
    }

    private function isOwner(ChatConversation $conversation, User $user): bool
    {
        return ChatParticipant::query()
            ->where('chat_conversation_id', $conversation->id)
            ->where('user_id', $user->id)
            ->whereIn('role', [ChatParticipant::ROLE_OWNER, ChatParticipant::ROLE_ADMIN])
            ->whereNull('left_at')
            ->exists();
    }

    private function directKey(int $first, int $second): string
    {
        return $first < $second ? "{$first}:{$second}" : "{$second}:{$first}";
    }

    private function unreadCount(ChatConversation $conversation, User $user): int
    {
        $participant = ChatParticipant::query()
            ->where('chat_conversation_id', $conversation->id)
            ->where('user_id', $user->id)
            ->first();

        return ChatMessage::query()
            ->where('chat_conversation_id', $conversation->id)
            ->where('sender_id', '!=', $user->id)
            ->when($participant?->last_read_at, fn ($query) => $query->where('created_at', '>', $participant->last_read_at))
            ->count();
    }

    private function attachmentKind(string $mime): string
    {
        return match (true) {
            str_starts_with($mime, 'image/') => 'image',
            str_starts_with($mime, 'video/') => 'video',
            str_starts_with($mime, 'audio/') => 'audio',
            str_contains($mime, 'pdf') => 'pdf',
            default => 'file',
        };
    }

    private function imageSize(?string $path, string $mime): array
    {
        if (! $path || ! str_starts_with($mime, 'image/')) {
            return [null, null];
        }

        $size = @getimagesize($path);

        return $size ? [(int) $size[0], (int) $size[1]] : [null, null];
    }
}
