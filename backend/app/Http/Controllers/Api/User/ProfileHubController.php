<?php

namespace App\Http\Controllers\Api\User;

use App\Enums\IssueAnswerStatus;
use App\Enums\IssueQuestionStatus;
use App\Enums\PublicationStatus;
use App\Http\Controllers\Controller;
use App\Models\ActivityEvent;
use App\Models\ChatConversation;
use App\Models\ChatParticipant;
use App\Models\CodeSnippet;
use App\Models\FriendRequest;
use App\Models\Friendship;
use App\Models\IssueAnswer;
use App\Models\IssueQuestion;
use App\Models\PinnedItem;
use App\Models\Publication;
use App\Models\Reaction;
use App\Models\ReputationEvent;
use App\Models\SavedItem;
use App\Models\User;
use App\Models\UserFile;
use App\Services\Profile\AchievementService;
use App\Services\Profile\ProfilePinService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

class ProfileHubController extends Controller
{
    private const PREVIEW_BYTES = 204800;

    public function me(Request $request, AchievementService $achievements): JsonResponse
    {
        $user = $request->user();
        $this->safeProfileBlock('achievement_recalculate', fn () => $achievements->recalculate($user), null);

        return response()->json($this->dashboard($request, $user, true, $achievements));
    }

    public function public(Request $request, User $user, AchievementService $achievements): JsonResponse
    {
        abort_if($user->isProfilePrivate() && ! $this->isFriendOrSelf($request->user(), $user), 403, 'Профиль закрыт пользователем.');

        return response()->json($this->dashboard($request, $user, false, $achievements));
    }

    public function materials(Request $request, User $user): JsonResponse
    {
        abort_if($user->isProfilePrivate() && ! $this->isFriendOrSelf($request->user(), $user), 403, 'Профиль закрыт пользователем.');

        return response()->json([
            'data' => $this->materialsData($user, (string) $request->query('type', 'all'), false),
        ]);
    }

    public function snippets(Request $request, User $user): JsonResponse
    {
        abort_if($user->isProfilePrivate() && ! $this->isFriendOrSelf($request->user(), $user), 403, 'Профиль закрыт пользователем.');

        return response()->json(['data' => $this->snippetsData($user, false)]);
    }

    public function files(Request $request, User $user): JsonResponse
    {
        abort_if($user->isProfilePrivate() && ! $this->isFriendOrSelf($request->user(), $user), 403, 'Профиль закрыт пользователем.');
        abort_unless($user->show_files_publicly ?? true, 403, 'Пользователь скрыл файлы.');

        return response()->json(['data' => $this->filesData($user, false)]);
    }

    public function friends(Request $request, User $user): JsonResponse
    {
        abort_if($user->isProfilePrivate() && ! $this->isFriendOrSelf($request->user(), $user), 403, 'Профиль закрыт пользователем.');
        abort_unless($user->show_friends_publicly ?? true, 403, 'Пользователь скрыл друзей.');

        return response()->json(['data' => $this->friendsData($user, $request->user())]);
    }

    public function activity(Request $request, User $user): JsonResponse
    {
        abort_if($user->isProfilePrivate() && ! $this->isFriendOrSelf($request->user(), $user), 403, 'Профиль закрыт пользователем.');
        abort_unless($user->show_activity_publicly ?? true, 403, 'Пользователь скрыл активность.');

        return response()->json(['data' => $this->activityData($user, false)]);
    }

    public function achievements(Request $request, User $user, AchievementService $service): JsonResponse
    {
        abort_if($user->isProfilePrivate() && ! $this->isFriendOrSelf($request->user(), $user), 403, 'Профиль закрыт пользователем.');
        $this->safeProfileBlock('achievement_recalculate', fn () => $service->recalculate($user), null);

        return response()->json(['data' => $this->safeProfileBlock('achievements', fn () => $this->achievementsData($user), [])]);
    }

    public function reputation(Request $request, User $user): JsonResponse
    {
        abort_if($user->isProfilePrivate() && ! $this->isFriendOrSelf($request->user(), $user), 403, 'Профиль закрыт пользователем.');

        return response()->json(['data' => $this->reputationData($user)]);
    }

    public function pin(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pinnable_type' => ['required', 'string', Rule::in(['publication', 'issue_question', 'issue_answer', 'code_snippet', 'user_file'])],
            'pinnable_id' => ['required', 'integer', 'min:1'],
            'position' => ['nullable', 'integer', 'min:0', 'max:50'],
            'title_override' => ['nullable', 'string', 'max:255'],
            'description_override' => ['nullable', 'string', 'max:1000'],
            'visibility' => ['nullable', 'string', Rule::in(['public', 'private'])],
        ]);

        $pin = app(ProfilePinService::class)->pin($request->user(), $data['pinnable_type'], (int) $data['pinnable_id'], $data);

        return response()->json(['data' => $this->pinnedItemData($pin->fresh('pinnable'), true)], 201);
    }

    public function unpin(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pinnable_type' => ['required', 'string', Rule::in(['publication', 'issue_question', 'issue_answer', 'code_snippet', 'user_file'])],
            'pinnable_id' => ['required', 'integer', 'min:1'],
        ]);

        app(ProfilePinService::class)->unpin($request->user(), $data['pinnable_type'], (int) $data['pinnable_id']);

        return response()->json(['message' => 'Закреп удалён из профиля.']);
    }

    public function message(Request $request, User $user): JsonResponse
    {
        $viewer = $request->user();
        abort_if((int) $viewer->id === (int) $user->id, 422, 'Нельзя создать чат с самим собой.');

        $ids = [(int) $viewer->id, (int) $user->id];
        sort($ids);
        $key = implode(':', $ids);

        $conversation = DB::transaction(function () use ($viewer, $user, $key) {
            $conversation = ChatConversation::query()->firstOrCreate(
                ['direct_key' => $key],
                ['type' => ChatConversation::TYPE_DIRECT, 'owner_id' => $viewer->id, 'last_message_at' => now()]
            );

            foreach ([$viewer->id, $user->id] as $id) {
                ChatParticipant::query()->firstOrCreate(
                    ['chat_conversation_id' => $conversation->id, 'user_id' => $id],
                    ['role' => ChatParticipant::ROLE_MEMBER, 'joined_at' => now()]
                );
            }

            return $conversation;
        });

        return response()->json(['data' => ['id' => $conversation->id, 'url' => '/chats?conversation=' . $conversation->id]]);
    }

    public function downloadFile(Request $request, User $user, UserFile $userFile): BinaryFileResponse
    {
        $this->assertPublicFileBelongsTo($user, $userFile);

        $disk = $userFile->disk ?: 'local';
        abort_unless(Storage::disk($disk)->exists($userFile->path), 404, 'Файл не найден.');

        $filename = str_replace(['"', "\r", "\n"], '', $userFile->original_name ?: basename($userFile->path));

        return response()->download(Storage::disk($disk)->path($userFile->path), $filename);
    }

    public function previewFile(Request $request, User $user, UserFile $userFile): JsonResponse|BinaryFileResponse
    {
        $this->assertPublicFileBelongsTo($user, $userFile);
        abort_unless($this->canPreview($userFile), 422, 'Предпросмотр недоступен для этого типа файла.');

        $disk = $userFile->disk ?: 'local';
        abort_unless(Storage::disk($disk)->exists($userFile->path), 404, 'Файл не найден.');

        if (in_array($userFile->kind, ['image', 'pdf', 'audio', 'video'], true)) {
            return response()->file(Storage::disk($disk)->path($userFile->path), ['X-Content-Type-Options' => 'nosniff']);
        }

        $stream = Storage::disk($disk)->readStream($userFile->path);
        $content = $stream ? stream_get_contents($stream, self::PREVIEW_BYTES) : '';
        if (is_resource($stream)) {
            fclose($stream);
        }

        return response()->json(['content' => $content, 'truncated' => (int) $userFile->size > self::PREVIEW_BYTES]);
    }

    private function dashboard(Request $request, User $user, bool $owner, AchievementService $service): array
    {
        $viewer = $request->user();
        $canSeeFiles = $owner || ($user->show_files_publicly ?? true);
        $canSeeActivity = $owner || ($user->show_activity_publicly ?? true);

        return [
            'user' => $this->safeProfileBlock('user', fn () => $this->userData($user, $owner), $this->minimalUserData($user, $owner)),
            'stats' => $this->safeProfileBlock('stats', fn () => $this->stats($user), []),
            'completion' => $this->safeProfileBlock('completion', fn () => $service->completion($user), 0),
            'pins' => $this->safeProfileBlock('pins', fn () => $this->pinnedData($user, $owner, 5), []),
            'pinned_items' => $this->safeProfileBlock('pinned_items', fn () => $this->pinnedData($user, $owner, 5), []),
            'materials' => $this->safeProfileBlock('materials', fn () => $this->materialsData($user, 'all', $owner, 10), []),
            'snippets' => $this->safeProfileBlock('snippets', fn () => $this->snippetsData($user, $owner, 8), []),
            'files' => $canSeeFiles ? $this->safeProfileBlock('files', fn () => $this->filesData($user, $owner, 8), []) : [],
            'friends' => $this->safeProfileBlock('friends', fn () => $this->friendsData($user, $viewer, 8), []),
            'activity' => $canSeeActivity ? $this->safeProfileBlock('activity', fn () => $this->activityData($user, $owner, 18), []) : [],
            'achievements' => $this->safeProfileBlock('achievements', fn () => $this->achievementsData($user), []),
            'reputation' => $this->safeProfileBlock('reputation', fn () => $this->reputationData($user), ['score' => (int) ($user->reputation_score ?? 0), 'level' => $user->reputationLevel(), 'events' => []]),
            'saved_summary' => $owner ? $this->safeProfileBlock('saved_summary', fn () => SavedItem::query()->where('user_id', $user->id)->count(), 0) : null,
            'saved_items' => $owner ? $this->safeProfileBlock('saved_items', fn () => $this->savedItemsData($user, 12), []) : [],
            'previews' => $this->safeProfileBlock('previews', fn () => $this->previews($user, $owner, $canSeeFiles, $canSeeActivity), []),
            'relation_state' => $owner ? $this->ownerRelationship() : $this->safeProfileBlock('relationship', fn () => $this->relationship($viewer, $user), $this->guestRelationship()),
            'relationship_to_viewer' => $owner ? $this->ownerRelationship() : $this->safeProfileBlock('relationship', fn () => $this->relationship($viewer, $user), $this->guestRelationship()),
        ];
    }


    private function previews(User $user, bool $owner, bool $canSeeFiles, bool $canSeeActivity): array
    {
        return [
            'latest_publications' => $this->materialsData($user, 'publications', $owner, 3),
            'latest_questions' => $this->materialsData($user, 'questions', $owner, 3),
            'latest_answers' => $this->materialsData($user, 'answers', $owner, 3),
            'snippets_preview' => $this->snippetsData($user, $owner, 3),
            'files_preview' => $canSeeFiles ? $this->filesData($user, $owner, 3) : [],
            'achievements_preview' => array_slice($this->achievementsData($user), 0, 3),
            'activity_preview' => $canSeeActivity ? $this->activityData($user, $owner, 5) : [],
            'reputation_summary' => $this->reputationData($user),
        ];
    }

    private function ownerRelationship(): array
    {
        return ['is_owner' => true, 'is_friend' => false, 'friendship_status' => null, 'incoming_friend_request_id' => null, 'outgoing_friend_request_id' => null, 'is_subscribed' => false, 'is_following' => false, 'can_message' => false, 'can_report' => false];
    }

    private function guestRelationship(): array
    {
        return ['is_owner' => false, 'is_friend' => false, 'friendship_status' => null, 'friend_request_status' => null, 'incoming_friend_request_id' => null, 'outgoing_friend_request_id' => null, 'is_subscribed' => false, 'is_following' => false, 'can_message' => false, 'can_report' => true];
    }

    private function safeProfileBlock(string $block, callable $callback, mixed $fallback): mixed
    {
        try {
            return $callback();
        } catch (Throwable $exception) {
            Log::warning('Profile dashboard block failed', [
                'block' => $block,
                'exception' => $exception::class,
                'message' => $exception->getMessage(),
            ]);

            return $fallback;
        }
    }

    private function minimalUserData(User $user, bool $owner): array
    {
        $data = [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'avatar' => $user->avatar,
            'avatar_url' => $this->avatarUrl($user),
            'headline' => $user->headline,
            'bio' => $user->bio,
            'location' => $user->location,
            'direction' => $user->direction,
            'website_url' => $user->website_url,
            'github_url' => $user->github_url,
            'telegram_url' => $user->telegram_url,
            'profile_visibility' => $user->profile_visibility ?? 'public',
            'reputation_score' => (int) ($user->reputation_score ?? 0),
            'reputation_level' => $user->reputationLevel(),
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
        ];

        if ($owner || ($user->show_email_publicly ?? false)) {
            $data['email'] = $user->email;
        }

        return $data;
    }

    private function userData(User $user, bool $owner): array
    {
        $data = collect($user->toArray())->only([
            'id',
            'name',
            'username',
            'role',
            'avatar',
            'cover_url',
            'headline',
            'bio',
            'location',
            'direction',
            'website_url',
            'github_url',
            'telegram_url',
            'profile_visibility',
            'created_at',
            'updated_at',
            'reputation_score',
        ]);

        if ($owner) {
            $data = $data->merge($user->only([
                'show_friends_publicly',
                'show_files_publicly',
                'show_activity_publicly',
            ]));
        }

        $data->put('avatar_url', $this->avatarUrl($user));
        $data->put('reputation_level', $user->reputationLevel());

        if ($owner || $user->show_email_publicly) {
            $data->put('email', $user->email);
        }

        return $data->all();
    }

    private function stats(User $user): array
    {
        return [
            'reputation' => (int) $user->reputation_score,
            'publications_count' => $user->publications()->published()->count(),
            'questions_count' => $user->issueQuestions()->published()->count(),
            'answers_count' => $user->issueAnswers()->where('status', IssueAnswerStatus::Published->value)->count(),
            'accepted_answers' => $user->issueAnswers()->where('status', IssueAnswerStatus::Published->value)->where('is_accepted', true)->count(),
            'comments_count' => $user->comments()->published()->count(),
            'publications' => $user->publications()->published()->count(),
            'questions' => $user->issueQuestions()->published()->count(),
            'answers' => $user->issueAnswers()->where('status', IssueAnswerStatus::Published->value)->count(),
            'comments' => $user->comments()->published()->count(),
            'snippets' => $user->codeSnippets()->where('visibility', 'public')->where('status', CodeSnippet::STATUS_ACTIVE)->count(),
            'files' => $user->userFiles()->where('visibility', 'public')->count(),
            'pinned' => $user->pinnedItems()->count(),
            'friends' => $this->friendIds($user)->count(),
            'followers' => $user->subscribers()->count(),
            'following' => $user->subscriptions()->count(),
            'saved' => SavedItem::query()->where('user_id', $user->id)->count(),
        ];
    }

    private function materialsData(User $user, string $type = 'all', bool $owner = false, int $limit = 50): array
    {
        $items = collect();

        if ($type === 'all' || $type === 'publications') {
            $items = $items->merge(
                Publication::query()
                    ->published()
                    ->where('author_id', $user->id)
                    ->with('tags')
                    ->withCount([
                        'comments',
                        'savedItems',
                        'reactions as likes_count' => fn (Builder $query) => $query->where('type', Reaction::LIKE),
                    ])
                    ->latest('published_at')
                    ->limit($limit)
                    ->get()
                    ->map(fn (Publication $publication) => [
                        'type' => 'publication',
                        'id' => $publication->id,
                        'title' => $publication->title,
                        'excerpt' => $publication->excerpt,
                        'url' => '/publications/' . $publication->slug,
                        'score' => (int) ($publication->likes_count ?? 0) + (int) ($publication->saved_items_count ?? 0) + (int) ($publication->comments_count ?? 0),
                        'created_at' => $publication->published_at?->toISOString() ?? $publication->created_at?->toISOString(),
                        'tags' => $publication->tags->map(fn ($tag) => ['name' => $tag->name, 'slug' => $tag->slug])->values()->all(),
                        'meta' => [
                            'likes' => (int) ($publication->likes_count ?? 0),
                            'comments' => (int) ($publication->comments_count ?? 0),
                            'saved' => (int) ($publication->saved_items_count ?? 0),
                        ],
                    ])
            );
        }

        if ($type === 'all' || $type === 'questions') {
            $items = $items->merge(
                IssueQuestion::query()
                    ->published()
                    ->where('author_id', $user->id)
                    ->with('tags')
                    ->withCount([
                        'answers',
                        'reactions as likes_count' => fn (Builder $query) => $query->where('type', Reaction::LIKE),
                    ])
                    ->latest('published_at')
                    ->limit($limit)
                    ->get()
                    ->map(fn (IssueQuestion $question) => [
                        'type' => 'issue_question',
                        'id' => $question->id,
                        'title' => $question->title,
                        'excerpt' => $question->excerpt,
                        'url' => '/questions/' . $question->slug,
                        'score' => (int) ($question->likes_count ?? 0) + (int) ($question->answers_count ?? 0),
                        'created_at' => $question->published_at?->toISOString() ?? $question->created_at?->toISOString(),
                        'tags' => $question->tags->map(fn ($tag) => ['name' => $tag->name, 'slug' => $tag->slug])->values()->all(),
                        'meta' => [
                            'likes' => (int) ($question->likes_count ?? 0),
                            'answers' => (int) ($question->answers_count ?? 0),
                            'solved' => (bool) $question->is_solved,
                        ],
                    ])
            );
        }

        if ($type === 'all' || $type === 'answers') {
            $items = $items->merge(
                IssueAnswer::query()
                    ->where('author_id', $user->id)
                    ->where('status', IssueAnswerStatus::Published->value)
                    ->with(['question', 'blocks'])
                    ->latest()
                    ->limit($limit)
                    ->get()
                    ->map(fn (IssueAnswer $answer) => [
                        'type' => 'issue_answer',
                        'id' => $answer->id,
                        'title' => 'Ответ: ' . ($answer->question->title ?? 'вопрос'),
                        'excerpt' => $this->answerExcerpt($answer),
                        'url' => $answer->question?->slug ? '/questions/' . $answer->question->slug . '#answer-' . $answer->id : '/questions',
                        'score' => $answer->is_accepted ? 10 : 0,
                        'created_at' => $answer->created_at?->toISOString(),
                        'meta' => [
                            'accepted' => (bool) $answer->is_accepted,
                        ],
                    ])
            );
        }

        return $items->sortByDesc('created_at')->take($limit)->values()->all();
    }

    private function snippetsData(User $user, bool $owner, int $limit = 50): array
    {
        return CodeSnippet::query()
            ->where('user_id', $user->id)
            ->when(! $owner, fn ($query) => $query->where('visibility', 'public')->where('status', CodeSnippet::STATUS_ACTIVE))
            ->withCount('runs')
            ->latest()
            ->limit($limit)
            ->get(['id', 'title', 'language', 'snippet_type', 'visibility', 'status', 'last_run_status', 'last_run_at', 'created_at', 'updated_at'])
            ->map(fn (CodeSnippet $snippet) => [
                'type' => 'code_snippet',
                'id' => $snippet->id,
                'title' => $snippet->title,
                'language' => $snippet->language,
                'snippet_type' => $snippet->snippet_type,
                'visibility' => $snippet->visibility,
                'status' => $snippet->status,
                'last_run_status' => $snippet->last_run_status,
                'runs_count' => (int) ($snippet->runs_count ?? 0),
                'url' => '/playground?snippet=' . $snippet->id,
                'created_at' => $snippet->created_at?->toISOString(),
                'updated_at' => $snippet->updated_at?->toISOString(),
            ])
            ->values()
            ->all();
    }

    private function filesData(User $user, bool $owner, int $limit = 50): array
    {
        return UserFile::query()
            ->where('user_id', $user->id)
            ->when(! $owner, fn ($query) => $query->where('visibility', 'public'))
            ->with('folder')
            ->orderByRaw('CASE WHEN pinned_at IS NULL THEN 1 ELSE 0 END')
            ->orderByDesc('pinned_at')
            ->latest('id')
            ->limit($limit)
            ->get(['id', 'user_id', 'folder_id', 'title', 'original_name', 'mime_type', 'size', 'kind', 'visibility', 'pinned_at', 'created_at', 'updated_at'])
            ->map(fn (UserFile $file) => $this->fileItemData($file, $owner))
            ->values()
            ->all();
    }

    private function fileItemData(UserFile $file, bool $owner): array
    {
        $canDownload = $owner || $file->visibility === 'public';
        $publicDownloadUrl = '/api/laravel-file/users/' . $file->user_id . '/files/' . $file->id . '/download';
        $publicPreviewUrl = '/api/laravel-file/users/' . $file->user_id . '/files/' . $file->id . '/preview';

        return [
            'type' => 'user_file',
            'id' => $file->id,
            'title' => $file->title ?: $file->original_name,
            'original_name' => $file->original_name,
            'mime_type' => $file->mime_type,
            'size' => (int) $file->size,
            'kind' => $file->kind,
            'visibility' => $file->visibility,
            'is_pinned' => $file->pinned_at !== null,
            'folder' => $file->relationLoaded('folder') && $file->folder ? [
                'id' => $file->folder->id,
                'name' => $file->folder->name,
                'color' => $file->folder->color,
            ] : null,
            'url' => '/files/' . $file->id,
            'download_url' => $canDownload ? ($owner ? '/api/laravel-file/me/files/' . $file->id . '/download' : $publicDownloadUrl) : null,
            'preview_url' => $canDownload && $this->canPreview($file) ? ($owner ? '/api/laravel-file/me/files/' . $file->id . '/preview' : $publicPreviewUrl) : null,
            'created_at' => $file->created_at?->toISOString(),
            'updated_at' => $file->updated_at?->toISOString(),
        ];
    }

    private function friendsData(User $user, ?User $viewer, int $limit = 50): array
    {
        if (! ($user->show_friends_publicly ?? true) && (! $viewer || (int) $viewer->id !== (int) $user->id)) {
            return [];
        }

        $ids = $this->friendIds($user);

        return User::query()
            ->whereIn('id', $ids)
            ->limit($limit)
            ->get(['id', 'name', 'avatar', 'headline', 'reputation_score'])
            ->map(fn (User $friend) => [
                'type' => 'user',
                'id' => $friend->id,
                'title' => $friend->name,
                'name' => $friend->name,
                'headline' => $friend->headline,
                'avatar' => $friend->avatar,
                'avatar_url' => $this->avatarUrl($friend),
                'reputation_score' => (int) $friend->reputation_score,
                'url' => '/users/' . $friend->id,
            ])
            ->values()
            ->all();
    }

    private function activityData(User $user, bool $owner, int $limit = 50): array
    {
        return ActivityEvent::query()
            ->where('user_id', $user->id)
            ->when(! $owner, fn ($query) => $query->where('visibility', 'public'))
            ->latest()
            ->limit($limit)
            ->get()
            ->map(fn (ActivityEvent $event) => [
                'id' => $event->id,
                'type' => $event->type,
                'title' => $event->metadata['title'] ?? $this->activityTitle($event->type),
                'description' => $event->metadata['description'] ?? null,
                'url' => $event->metadata['url'] ?? null,
                'metadata' => $event->metadata,
                'created_at' => $event->created_at?->toISOString(),
            ])
            ->values()
            ->all();
    }

    private function achievementsData(User $user): array
    {
        return $user->achievements()
            ->with('achievement')
            ->get()
            ->map(fn ($userAchievement) => [
                'type' => 'achievement',
                'key' => $userAchievement->achievement->key,
                'id' => $userAchievement->achievement->id,
                'title' => $userAchievement->achievement->name,
                'name' => $userAchievement->achievement->name,
                'description' => $userAchievement->achievement->description,
                'category' => $userAchievement->achievement->category,
                'points' => $userAchievement->achievement->points,
                'rarity' => $userAchievement->achievement->rarity,
                'progress' => $userAchievement->progress,
                'target' => $userAchievement->achievement->condition_value,
                'unlocked_at' => $userAchievement->unlocked_at?->toISOString(),
            ])
            ->values()
            ->all();
    }

    private function reputationData(User $user): array
    {
        return [
            'score' => (int) $user->reputation_score,
            'level' => $user->reputationLevel(),
            'events' => ReputationEvent::query()
                ->where('user_id', $user->id)
                ->latest()
                ->limit(30)
                ->get(['id', 'points', 'reason', 'description', 'created_at'])
                ->map(fn (ReputationEvent $event) => [
                    'id' => $event->id,
                    'type' => 'reputation_event',
                    'title' => $event->description ?: $event->reason,
                    'description' => $event->reason,
                    'points' => (int) $event->points,
                    'created_at' => $event->created_at?->toISOString(),
                ])
                ->values()
                ->all(),
        ];
    }

    private function pinnedData(User $user, bool $owner, int $limit = 8): array
    {
        return PinnedItem::query()
            ->where('user_id', $user->id)
            ->when(! $owner, fn ($query) => $query->where('visibility', 'public'))
            ->with('pinnable')
            ->orderBy('position')
            ->latest('id')
            ->limit($limit)
            ->get()
            ->map(fn (PinnedItem $pin) => $this->pinnedItemData($pin, $owner))
            ->filter()
            ->values()
            ->all();
    }

    private function pinnedItemData(?PinnedItem $pin, bool $owner): ?array
    {
        if (! $pin || ! $pin->pinnable) {
            return null;
        }

        $item = $this->modelToHubItem($pin->pinnable, $owner);

        if (! $item) {
            return null;
        }

        return array_merge($item, [
            'pin_id' => $pin->id,
            'title' => $pin->title_override ?: ($item['title'] ?? null),
            'description' => $pin->description_override ?: ($item['excerpt'] ?? null),
            'position' => (int) $pin->position,
            'visibility' => $pin->visibility ?? 'public',
            'pinned_at' => $pin->created_at?->toISOString(),
        ]);
    }

    private function savedItemsData(User $user, int $limit = 12): array
    {
        return SavedItem::query()
            ->where('user_id', $user->id)
            ->with('saveable')
            ->latest()
            ->limit($limit)
            ->get()
            ->map(function (SavedItem $saved) {
                $item = $this->modelToHubItem($saved->saveable, true);

                return $item ? array_merge($item, [
                    'saved_id' => $saved->id,
                    'saved_at' => $saved->created_at?->toISOString(),
                ]) : null;
            })
            ->filter()
            ->values()
            ->all();
    }

    private function modelToHubItem(?Model $model, bool $owner): ?array
    {
        if ($model instanceof Publication) {
            if (($model->status?->value ?? $model->status) !== PublicationStatus::Published->value) {
                return null;
            }

            return [
                'type' => 'publication',
                'id' => $model->id,
                'title' => $model->title,
                'excerpt' => $model->excerpt,
                'url' => '/publications/' . $model->slug,
                'created_at' => $model->published_at?->toISOString() ?? $model->created_at?->toISOString(),
            ];
        }

        if ($model instanceof IssueQuestion) {
            if (($model->status?->value ?? $model->status) !== IssueQuestionStatus::Published->value) {
                return null;
            }

            return [
                'type' => 'issue_question',
                'id' => $model->id,
                'title' => $model->title,
                'excerpt' => $model->excerpt,
                'url' => '/questions/' . $model->slug,
                'created_at' => $model->published_at?->toISOString() ?? $model->created_at?->toISOString(),
            ];
        }

        if ($model instanceof IssueAnswer) {
            if (($model->status?->value ?? $model->status) !== IssueAnswerStatus::Published->value) {
                return null;
            }

            $question = $model->relationLoaded('question') ? $model->question : $model->question()->first();

            return [
                'type' => 'issue_answer',
                'id' => $model->id,
                'title' => 'Ответ: ' . ($question?->title ?? 'вопрос'),
                'excerpt' => $this->answerExcerpt($model),
                'url' => $question?->slug ? '/questions/' . $question->slug . '#answer-' . $model->id : '/questions',
                'created_at' => $model->created_at?->toISOString(),
            ];
        }

        if ($model instanceof CodeSnippet) {
            if (! $owner && ! $model->isPublic()) {
                return null;
            }

            return [
                'type' => 'code_snippet',
                'id' => $model->id,
                'title' => $model->title,
                'language' => $model->language,
                'snippet_type' => $model->snippet_type,
                'visibility' => $model->visibility,
                'status' => $model->status,
                'url' => '/playground?snippet=' . $model->id,
                'created_at' => $model->created_at?->toISOString(),
            ];
        }

        if ($model instanceof UserFile) {
            if (! $owner && ! $model->isPublic()) {
                return null;
            }

            return $this->fileItemData($model, $owner);
        }

        return null;
    }

    private function resolveOwnPinnable(User $user, string $type, int $id): Model
    {
        return match ($type) {
            'publication' => Publication::query()
                ->where('author_id', $user->id)
                ->where('status', PublicationStatus::Published->value)
                ->findOrFail($id),
            'issue_question' => IssueQuestion::query()
                ->where('author_id', $user->id)
                ->where('status', IssueQuestionStatus::Published->value)
                ->findOrFail($id),
            'issue_answer' => IssueAnswer::query()
                ->where('author_id', $user->id)
                ->where('status', IssueAnswerStatus::Published->value)
                ->whereHas('question', fn ($query) => $query->where('status', IssueQuestionStatus::Published->value))
                ->findOrFail($id),
            'code_snippet' => CodeSnippet::query()
                ->where('user_id', $user->id)
                ->where('visibility', 'public')
                ->where('status', CodeSnippet::STATUS_ACTIVE)
                ->findOrFail($id),
            'user_file' => UserFile::query()
                ->where('user_id', $user->id)
                ->where('visibility', 'public')
                ->findOrFail($id),
            default => abort(422, 'Неподдерживаемый тип закрепа.'),
        };
    }

    private function answerExcerpt(IssueAnswer $answer): string
    {
        $blocks = $answer->relationLoaded('blocks') ? $answer->blocks : $answer->blocks()->limit(3)->get();

        foreach ($blocks as $block) {
            $content = $block->content ?? [];
            $text = $content['text'] ?? $content['code'] ?? null;

            if (is_string($text) && trim($text) !== '') {
                return str($text)->limit(180)->toString();
            }
        }

        return 'Ответ без текстового блока';
    }

    private function relationship(?User $viewer, User $user): array
    {
        if (! $viewer) {
            return [
                'is_owner' => false,
                'is_following' => false,
                'is_friend' => false,
                'friend_request_status' => null,
                'friendship_status' => null,
                'incoming_friend_request_id' => null,
                'outgoing_friend_request_id' => null,
                'is_subscribed' => false,
                'can_message' => false,
                'can_report' => true,
            ];
        }

        $isFriend = $this->isFriendOrSelf($viewer, $user);
        $pending = FriendRequest::query()
            ->where('status', FriendRequest::STATUS_PENDING)
            ->where(fn ($query) => $query
                ->where(fn ($nested) => $nested->where('sender_id', $viewer->id)->where('recipient_id', $user->id))
                ->orWhere(fn ($nested) => $nested->where('sender_id', $user->id)->where('recipient_id', $viewer->id)))
            ->first();

        return [
            'is_owner' => false,
            'is_subscribed' => $viewer->subscriptions()
                ->where('subscribable_type', User::class)
                ->where('subscribable_id', $user->id)
                ->exists(),
            'is_friend' => $isFriend,
            'is_following' => $viewer->subscriptions()
                ->where('subscribable_type', User::class)
                ->where('subscribable_id', $user->id)
                ->exists(),
            'friendship_status' => $isFriend ? 'friends' : ($pending ? ((int) $pending->sender_id === (int) $viewer->id ? 'outgoing' : 'incoming') : null),
            'friend_request_status' => $pending ? ((int) $pending->sender_id === (int) $viewer->id ? 'sent' : 'incoming') : null,
            'incoming_friend_request_id' => $pending && (int) $pending->sender_id === (int) $user->id ? $pending->id : null,
            'outgoing_friend_request_id' => $pending && (int) $pending->sender_id === (int) $viewer->id ? $pending->id : null,
            'can_message' => true,
            'can_report' => true,
            'mutual_friends_count' => $this->friendIds($viewer)->intersect($this->friendIds($user))->count(),
        ];
    }

    private function isFriendOrSelf(?User $a, User $b): bool
    {
        return $a && ((int) $a->id === (int) $b->id || $this->friendIds($a)->contains((int) $b->id));
    }

    private function friendIds(User $user)
    {
        return Friendship::query()
            ->where(fn ($query) => $query->where('user_one_id', $user->id)->orWhere('user_two_id', $user->id))
            ->get(['user_one_id', 'user_two_id'])
            ->map(fn ($friendship) => (int) $friendship->user_one_id === (int) $user->id ? (int) $friendship->user_two_id : (int) $friendship->user_one_id);
    }

    private function assertPublicFileBelongsTo(User $user, UserFile $file): void
    {
        abort_unless((int) $file->user_id === (int) $user->id, 404, 'Файл не найден.');
        abort_unless($file->visibility === 'public', 403, 'Файл не является публичным.');
    }

    private function canPreview(UserFile $file): bool
    {
        return in_array($file->kind, ['image', 'pdf', 'text', 'audio', 'video'], true);
    }

    private function avatarUrl(User $user): ?string
    {
        if (! $user->avatar) {
            return null;
        }

        if (filter_var($user->avatar, FILTER_VALIDATE_URL)) {
            return $user->avatar;
        }

        return Storage::disk('public')->url($user->avatar);
    }

    private function activityTitle(string $type): string
    {
        return match ($type) {
            'publication_created' => 'Опубликовал материал',
            'issue_question_created' => 'Задал вопрос',
            'issue_answer_created' => 'Ответил на вопрос',
            'comment_created' => 'Оставил комментарий',
            'file_uploaded' => 'Загрузил файл',
            'snippet_created' => 'Опубликовал сниппет',
            default => 'Событие профиля',
        };
    }
}
