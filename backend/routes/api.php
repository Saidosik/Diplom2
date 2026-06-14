<?php

use App\Http\Controllers\Api\Admin\AdminAiIndexController;
use App\Http\Controllers\Api\Admin\AdminChatModerationController;
use App\Http\Controllers\Api\Admin\AdminContentController;
use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\Admin\AdminReportController;
use App\Http\Controllers\Api\Admin\AdminUserController;
use App\Http\Controllers\Api\Admin\AdminLogController;
use App\Http\Controllers\Api\Admin\AdminLegalPageController;
use App\Http\Controllers\Api\Admin\AdminTagController;
use App\Http\Controllers\Api\Ai\AiAssistantController;
use App\Http\Controllers\Api\Ai\RagController;
use App\Http\Controllers\Api\Interaction\CommentController;
use App\Http\Controllers\Api\Interaction\ReactionController;
use App\Http\Controllers\Api\Interaction\ReportController;
use App\Http\Controllers\Api\Interaction\SavedItemController;
use App\Http\Controllers\Api\Interaction\ContentAttachmentController;
use App\Http\Controllers\Api\Community\CommunityOverviewController;
use App\Http\Controllers\Api\Community\CommunityDiscoveryController;
use App\Http\Controllers\Api\Community\InboxController;
use App\Http\Controllers\Api\Community\InterestController;
use App\Http\Controllers\Api\Community\NotificationSettingController;
use App\Http\Controllers\Api\Community\ReputationController;
use App\Http\Controllers\Api\Community\SubscriptionController;
use App\Http\Controllers\Api\Issue\IssueAnswerController;
use App\Http\Controllers\Api\Issue\IssueQuestionController;
use App\Http\Controllers\Api\Publication\PublicationController;
use App\Http\Controllers\Api\Playground\CodePlaygroundController;
use App\Http\Controllers\Api\Chat\ChatController;
use App\Http\Controllers\Api\Social\FriendController;
use App\Http\Controllers\Api\Social\PresenceController;
use App\Http\Controllers\Api\Search\GlobalSearchController;
use App\Http\Controllers\Api\Tag\TagController;
use App\Http\Controllers\Api\Legal\LegalPageController;
use App\Http\Controllers\Api\User\SocialAuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\User\AuthController;
use App\Http\Controllers\Api\User\PasswordController;
use App\Http\Controllers\Api\User\ProfileController;
use App\Http\Controllers\Api\User\PublicProfileController;
use App\Http\Controllers\Api\User\UserFileController;
use App\Http\Controllers\Api\User\UserFileFolderController;
use App\Http\Controllers\Api\User\VerifyEmailAcountController;


Route::get('/users/{user}/profile', [PublicProfileController::class, 'show']);
Route::get('/users/{user}/publications', [PublicProfileController::class, 'publications']);
Route::get('/users/{user}/issues', [PublicProfileController::class, 'issues']);
Route::get('/users/{user}/answers', [PublicProfileController::class, 'answers']);
Route::get('/users/{user}/comments', [PublicProfileController::class, 'comments']);
Route::get('/users/{user}/reputation-events', [ReputationController::class, 'user']);

Route::get('/content-attachments/{contentAttachment}/download', [ContentAttachmentController::class, 'download']);
Route::get('/publications', [PublicationController::class, 'index']);
Route::get('/publications/{publication}', [PublicationController::class, 'show']);

Route::get('/issues', [IssueQuestionController::class, 'index']);
Route::get('/issues/{issueQuestion}', [IssueQuestionController::class, 'show']);
Route::get('/comments', [CommentController::class, 'index']);
Route::get('/tags', [TagController::class, 'index']);
Route::get('/tags/{tag:slug}', [TagController::class, 'show']);
Route::get('/community/overview', CommunityOverviewController::class);
Route::get('/community/discovery', [CommunityDiscoveryController::class, 'discovery']);
Route::get('/community/popular-publications', [CommunityDiscoveryController::class, 'popularPublications']);
Route::get('/community/feed', [CommunityDiscoveryController::class, 'feed']);
Route::get('/community/trends', [CommunityDiscoveryController::class, 'trends']);
Route::get('/community/recommendations', [CommunityDiscoveryController::class, 'recommendations']);
Route::get('/community/users', [CommunityDiscoveryController::class, 'users']);
Route::get('/search', GlobalSearchController::class)->middleware('throttle:search');
Route::post('/ai/search', [AiAssistantController::class, 'search'])->middleware('throttle:ai');
Route::get('/ai/capabilities', [RagController::class, 'capabilities'])->middleware('throttle:ai');
Route::get('/ai/chat/models', [RagController::class, 'models'])->middleware('throttle:ai');
Route::post('/ai/rag/search', [RagController::class, 'search'])->middleware('throttle:ai');
Route::get('/playground/languages', [CodePlaygroundController::class, 'languages']);
Route::get('/playground/public-snippets/{codeSnippet}', [CodePlaygroundController::class, 'publicSnippet']);
Route::get('/legal/privacy-policy', [LegalPageController::class, 'privacyPolicy']);

Route::prefix('oauth')->group(function () {
    Route::get('/{provider}/redirect-url', [SocialAuthController::class, 'redirectUrl']);
    Route::get('/{provider}/callback', [SocialAuthController::class, 'callback']);
});

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth');
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth');
Route::middleware(['refresh', 'throttle:auth'])->post('/refresh', [AuthController::class, 'refresh']);

Route::post('/forgot-password', [PasswordController::class, 'sendResetLink'])->middleware('throttle:auth');
Route::post('/reset-password', [PasswordController::class, 'reset'])->middleware('throttle:auth');

Route::get('/email/verify/{id}/{hash}', [VerifyEmailAcountController::class, 'verify'])
    ->middleware(['signed:relative', 'throttle:auth'])
    ->name('verification.verify');

Route::middleware(['jwt', 'email_verified'])->group(function () {
    Route::post('/broadcasting/auth', fn (Request $request) => Broadcast::auth($request))->middleware('throttle:presence');

    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::post('/email/verification-notification', [VerifyEmailAcountController::class, 'send'])->middleware('throttle:6,1');
    Route::get('/email/verification-status', [VerifyEmailAcountController::class, 'status']);

    Route::get('/me/profile', [ProfileController::class, 'show']);
    Route::match(['put', 'patch'], '/me', [ProfileController::class, 'update']);
    Route::post('/me/avatar', [ProfileController::class, 'updateAvatar'])->middleware('throttle:uploads');
    Route::delete('/me/avatar', [ProfileController::class, 'destroyAvatar']);
    Route::delete('/me', [ProfileController::class, 'destroy']);

    Route::get('/me/file-folders', [UserFileFolderController::class, 'index']);
    Route::post('/me/file-folders', [UserFileFolderController::class, 'store']);
    Route::match(['put', 'patch'], '/me/file-folders/{folder}', [UserFileFolderController::class, 'update']);
    Route::delete('/me/file-folders/{folder}', [UserFileFolderController::class, 'destroy']);

    Route::get('/me/files', [UserFileController::class, 'index']);
    Route::post('/me/files', [UserFileController::class, 'store'])->middleware('throttle:uploads');
    Route::get('/me/files/{userFile}', [UserFileController::class, 'show']);
    Route::get('/me/files/{userFile}/preview', [UserFileController::class, 'preview'])->middleware('throttle:uploads');
    Route::match(['put', 'patch'], '/me/files/{userFile}', [UserFileController::class, 'update']);
    Route::get('/me/files/{userFile}/download', [UserFileController::class, 'download'])->middleware('throttle:uploads');
    Route::delete('/me/files/{userFile}', [UserFileController::class, 'destroy']);


    Route::post('/presence/heartbeat', [PresenceController::class, 'heartbeat'])->middleware('throttle:presence');
    Route::post('/presence/offline', [PresenceController::class, 'offline'])->middleware('throttle:presence');
    Route::get('/presence/friends', [PresenceController::class, 'friends']);

    Route::get('/friends', [FriendController::class, 'index']);
    Route::get('/friends/requests', [FriendController::class, 'requests']);
    Route::get('/friends/suggestions', [FriendController::class, 'suggestions']);
    Route::post('/friends/requests', [FriendController::class, 'send'])->middleware('throttle:social');
    Route::post('/friends/requests/{friendRequest}/accept', [FriendController::class, 'accept'])->middleware('throttle:social');
    Route::post('/friends/requests/{friendRequest}/decline', [FriendController::class, 'decline'])->middleware('throttle:social');
    Route::delete('/friends/requests/{friendRequest}', [FriendController::class, 'cancel']);
    Route::delete('/friends/{friendship}', [FriendController::class, 'destroy']);

    Route::get('/chats', [ChatController::class, 'index']);
    Route::post('/chats/direct', [ChatController::class, 'direct'])->middleware('throttle:social');
    Route::post('/chats/groups', [ChatController::class, 'group'])->middleware('throttle:social');
    Route::get('/chats/{conversation}', [ChatController::class, 'show']);
    Route::get('/chats/{conversation}/messages', [ChatController::class, 'messages']);
    Route::get('/chats/{conversation}/attachments/{attachment}/download', [ChatController::class, 'downloadAttachment'])->middleware('throttle:uploads');
    Route::post('/chats/{conversation}/messages', [ChatController::class, 'storeMessage'])->middleware(['throttle:chat-messages', 'throttle:uploads']);
    Route::patch('/chats/{conversation}/messages/{message}', [ChatController::class, 'updateMessage']);
    Route::delete('/chats/{conversation}/messages/{message}', [ChatController::class, 'destroyMessage']);
    Route::post('/chats/{conversation}/read', [ChatController::class, 'markRead']);
    Route::post('/chats/{conversation}/typing', [ChatController::class, 'typing'])->middleware('throttle:chat-typing');
    Route::post('/chats/{conversation}/participants', [ChatController::class, 'addParticipants'])->middleware('throttle:social');
    Route::post('/chats/{conversation}/leave', [ChatController::class, 'leave']);

    Route::get('/inbox', [InboxController::class, 'index']);
    Route::get('/inbox/unread-count', [InboxController::class, 'unreadCount']);
    Route::post('/inbox/{notification}/read', [InboxController::class, 'markAsRead']);
    Route::post('/inbox/read-all', [InboxController::class, 'markAllAsRead']);

    Route::get('/me/reputation-events', [ReputationController::class, 'mine']);
    Route::get('/me/interests', [InterestController::class, 'index']);
    Route::match(['put', 'patch'], '/me/interests', [InterestController::class, 'update']);

    Route::get('/ai/chat/sessions', [RagController::class, 'sessions'])->middleware('throttle:ai');
    Route::post('/ai/chat/sessions', [RagController::class, 'createSession'])->middleware('throttle:ai');
    Route::patch('/ai/chat/sessions/{session}', [RagController::class, 'updateSession'])->middleware('throttle:ai');
    Route::delete('/ai/chat/sessions/{session}', [RagController::class, 'destroySession'])->middleware('throttle:ai');
    Route::get('/ai/chat/sessions/{session}/messages', [RagController::class, 'messages'])->middleware('throttle:ai');
    Route::post('/ai/chat/attachments', [RagController::class, 'uploadAttachment'])->middleware(['throttle:ai', 'throttle:uploads']);
    Route::post('/ai/chat/stream', [RagController::class, 'stream'])->middleware('throttle:ai');
    Route::post('/ai/chat', [RagController::class, 'chat'])->middleware('throttle:ai');
    Route::post('/ai/code/explain', [RagController::class, 'codeExplain'])->middleware('throttle:ai');

    Route::post('/ai/question/assist', [AiAssistantController::class, 'questionAssist'])->middleware('throttle:ai');
    Route::post('/ai/question/duplicates', [AiAssistantController::class, 'questionDuplicates'])->middleware('throttle:ai');
    Route::post('/ai/question/draft-answer', [AiAssistantController::class, 'draftAnswerFromQuestion'])->middleware('throttle:ai');
    Route::post('/ai/content/sources', [AiAssistantController::class, 'contentSources'])->middleware('throttle:ai');
    Route::post('/ai/search/answer', [AiAssistantController::class, 'searchAnswer'])->middleware('throttle:ai');
    Route::post('/ai/publication/assist', [AiAssistantController::class, 'publicationAssist'])->middleware('throttle:ai');
    Route::post('/ai/issues/{issueQuestion}/answer-draft', [AiAssistantController::class, 'answerDraft'])->middleware('throttle:ai');

    Route::get('/me/notification-settings', [NotificationSettingController::class, 'show']);
    Route::match(['put', 'patch'], '/me/notification-settings', [NotificationSettingController::class, 'update']);

    Route::get('/me/subscriptions', [SubscriptionController::class, 'index']);
    Route::get('/subscriptions/status', [SubscriptionController::class, 'status']);
    Route::post('/subscriptions', [SubscriptionController::class, 'store'])->middleware('throttle:social');
    Route::delete('/subscriptions', [SubscriptionController::class, 'destroy'])->middleware('throttle:social');


    Route::get('/playground/snippets', [CodePlaygroundController::class, 'snippets']);
    Route::post('/playground/snippets', [CodePlaygroundController::class, 'storeSnippet'])->middleware('throttle:content-write');
    Route::get('/playground/snippets/{codeSnippet}', [CodePlaygroundController::class, 'showSnippet']);
    Route::match(['put', 'patch'], '/playground/snippets/{codeSnippet}', [CodePlaygroundController::class, 'updateSnippet'])->middleware('throttle:content-write');
    Route::delete('/playground/snippets/{codeSnippet}', [CodePlaygroundController::class, 'destroySnippet']);
    Route::get('/playground/runs', [CodePlaygroundController::class, 'runs']);
    Route::post('/playground/runs', [CodePlaygroundController::class, 'run'])->middleware('throttle:playground-runs');
    Route::get('/playground/runs/{codeRun}', [CodePlaygroundController::class, 'showRun']);


    Route::get('/me/publications', [PublicationController::class, 'myIndex']);
    Route::get('/me/publications/by-slug/{publication}', [PublicationController::class, 'showMineBySlug']);
    Route::get('/me/publications/{publication}', [PublicationController::class, 'edit']);
    Route::post('/publications', [PublicationController::class, 'store'])->middleware('throttle:content-write');
    Route::match(['put', 'patch'], '/publications/{publication}', [PublicationController::class, 'update'])->middleware('throttle:content-write');
    Route::delete('/publications/{publication}', [PublicationController::class, 'destroy']);

    Route::get('/me/issues', [IssueQuestionController::class, 'myIndex']);
    Route::get('/me/issues/by-slug/{issueQuestion}', [IssueQuestionController::class, 'show']);
    Route::get('/me/issues/{issueQuestion}', [IssueQuestionController::class, 'edit']);
    Route::post('/issues', [IssueQuestionController::class, 'store'])->middleware('throttle:content-write');
    Route::match(['put', 'patch'], '/issues/{issueQuestion}', [IssueQuestionController::class, 'update'])->middleware('throttle:content-write');
    Route::delete('/issues/{issueQuestion}', [IssueQuestionController::class, 'destroy']);

    Route::get('/me/issue-answers', [IssueAnswerController::class, 'myIndex']);
    Route::post('/issues/{issueQuestion}/answers', [IssueAnswerController::class, 'store'])->middleware('throttle:content-write');
    Route::match(['put', 'patch'], '/issue-answers/{issueAnswer}', [IssueAnswerController::class, 'update'])->middleware('throttle:content-write');
    Route::delete('/issue-answers/{issueAnswer}', [IssueAnswerController::class, 'destroy']);
    Route::post('/issues/{issueQuestion}/answers/{issueAnswer}/accept', [IssueQuestionController::class, 'acceptAnswer']);

    Route::get('/me/comments', [CommentController::class, 'myIndex']);
    Route::post('/comments', [CommentController::class, 'store'])->middleware('throttle:comments');
    Route::match(['put', 'patch'], '/comments/{comment}', [CommentController::class, 'update'])->middleware('throttle:comments');
    Route::delete('/comments/{comment}', [CommentController::class, 'destroy']);

    Route::post('/reactions', [ReactionController::class, 'store'])->middleware('throttle:reactions');
    Route::delete('/reactions', [ReactionController::class, 'destroy'])->middleware('throttle:reactions');

    Route::post('/reports', [ReportController::class, 'store'])->middleware('throttle:reports');

    Route::get('/me/saved', [SavedItemController::class, 'index']);
    Route::post('/saved-items', [SavedItemController::class, 'store'])->middleware('throttle:social');
    Route::delete('/saved-items', [SavedItemController::class, 'destroy'])->middleware('throttle:social');


    Route::prefix('admin')->middleware(['admin', 'throttle:admin-actions'])->group(function () {
        Route::get('/dashboard', AdminDashboardController::class);
        Route::get('/ai/index/status', [AdminAiIndexController::class, 'status']);
        Route::get('/ai/index/documents', [AdminAiIndexController::class, 'documents']);

        Route::middleware('system_admin')->group(function () {
            Route::get('/logs', [AdminLogController::class, 'index']);
            Route::post('/ai/index/rebuild', [AdminAiIndexController::class, 'rebuild']);
            Route::post('/ai/index/reindex-stale', [AdminAiIndexController::class, 'reindexStale']);
            Route::post('/ai/index/reindex-source', [AdminAiIndexController::class, 'reindexSource']);
            Route::delete('/ai/index/documents/{document}', [AdminAiIndexController::class, 'destroyDocument']);
            Route::post('/ai/reindex', [AdminAiIndexController::class, 'rebuild']);
        });

        Route::get('/legal-pages/{slug}', [AdminLegalPageController::class, 'show'])->middleware('system_admin');
        Route::match(['put', 'patch'], '/legal-pages/{slug}', [AdminLegalPageController::class, 'update'])->middleware('system_admin');

        Route::get('/tags', [AdminTagController::class, 'index']);
        Route::get('/tags/stats', [AdminTagController::class, 'stats']);
        Route::post('/tags', [AdminTagController::class, 'store']);
        Route::match(['put', 'patch'], '/tags/{tag}', [AdminTagController::class, 'update']);
        Route::delete('/tags/{tag}', [AdminTagController::class, 'destroy']);

        Route::get('/reports', [AdminReportController::class, 'index']);
        Route::get('/reports/{report}', [AdminReportController::class, 'show']);
        Route::match(['put', 'patch'], '/reports/{report}', [AdminReportController::class, 'update']);

        Route::get('/users', [AdminUserController::class, 'index']);
        Route::get('/users/{user}', [AdminUserController::class, 'show']);
        Route::match(['put', 'patch'], '/users/{user}', [AdminUserController::class, 'update']);
        Route::delete('/users/{user}', [AdminUserController::class, 'destroy']);
        Route::post('/users/{user}/restore', [AdminUserController::class, 'restore']);

        Route::get('/publications', [AdminContentController::class, 'publications']);
        Route::match(['put', 'patch'], '/publications/{publication}', [AdminContentController::class, 'updatePublication']);
        Route::delete('/publications/{publication}', [AdminContentController::class, 'destroyPublication']);
        Route::post('/publications/{publication}/restore', [AdminContentController::class, 'restorePublication']);

        Route::get('/questions', [AdminContentController::class, 'questions']);
        Route::match(['put', 'patch'], '/questions/{question}', [AdminContentController::class, 'updateQuestion']);
        Route::delete('/questions/{question}', [AdminContentController::class, 'destroyQuestion']);
        Route::post('/questions/{question}/restore', [AdminContentController::class, 'restoreQuestion']);

        Route::get('/answers', [AdminContentController::class, 'answers']);
        Route::match(['put', 'patch'], '/answers/{answer}', [AdminContentController::class, 'updateAnswer']);

        Route::get('/comments', [AdminContentController::class, 'comments']);
        Route::match(['put', 'patch'], '/comments/{comment}', [AdminContentController::class, 'updateComment']);
        Route::delete('/comments/{comment}', [AdminContentController::class, 'destroyComment']);
        Route::post('/comments/{comment}/restore', [AdminContentController::class, 'restoreComment']);

        Route::get('/chats', [AdminChatModerationController::class, 'conversations']);
        Route::get('/chats/{conversation}', [AdminChatModerationController::class, 'show']);
        Route::delete('/chats/{conversation}', [AdminChatModerationController::class, 'destroyConversation']);
        Route::post('/chats/{conversation}/restore', [AdminChatModerationController::class, 'restoreConversation']);
        Route::get('/chats/{conversation}/messages', [AdminChatModerationController::class, 'messages']);
        Route::delete('/chats/{conversation}/messages/{message}', [AdminChatModerationController::class, 'destroyMessage']);
        Route::post('/chats/{conversation}/messages/{message}/restore', [AdminChatModerationController::class, 'restoreMessage']);
    });
});
