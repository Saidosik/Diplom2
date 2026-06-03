<?php

namespace App\Providers;

use App\Models\AiChatMessage;
use App\Models\AiChatSession;
use App\Models\AiKnowledgeChunk;
use App\Models\AiKnowledgeDocument;
use App\Models\CodeRun;
use App\Models\CodeSnippet;
use App\Models\Comment;
use App\Models\CommunityActivity;
use App\Models\CommunityNotification;
use App\Models\IssueAnswer;
use App\Models\IssueAnswerBlock;
use App\Models\IssueBlock;
use App\Models\IssueQuestion;
use App\Models\NotificationSetting;
use App\Models\Publication;
use App\Models\PublicationBlock;
use App\Models\Reaction;
use App\Models\Report;
use App\Models\ReputationEvent;
use App\Models\SavedItem;
use App\Models\SocialAccount;
use App\Models\Subscription;
use App\Models\Tag;
use App\Models\User;
use App\Models\ChatAttachment;
use App\Models\ChatConversation;
use App\Models\ChatMessage;
use App\Models\ChatParticipant;
use App\Models\FriendRequest;
use App\Models\Friendship;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Relation::enforceMorphMap([
            'ai_knowledge_document' => AiKnowledgeDocument::class,
            'ai_knowledge_chunk' => AiKnowledgeChunk::class,
            'ai_chat_session' => AiChatSession::class,
            'ai_chat_message' => AiChatMessage::class,
            'user' => User::class,
            'tag' => Tag::class,
            'publication' => Publication::class,
            'publication_block' => PublicationBlock::class,
            'issue_question' => IssueQuestion::class,
            'issue_block' => IssueBlock::class,
            'issue_answer' => IssueAnswer::class,
            'issue_answer_block' => IssueAnswerBlock::class,
            'comment' => Comment::class,
            'reaction' => Reaction::class,
            'report' => Report::class,
            'saved_item' => SavedItem::class,
            'subscription' => Subscription::class,
            'community_activity' => CommunityActivity::class,
            'community_notification' => CommunityNotification::class,
            'notification_setting' => NotificationSetting::class,
            'reputation_event' => ReputationEvent::class,
            'social_account' => SocialAccount::class,
            'code_snippet' => CodeSnippet::class,
            'code_run' => CodeRun::class,
            'friend_request' => FriendRequest::class,
            'friendship' => Friendship::class,
            'chat_conversation' => ChatConversation::class,
            'chat_participant' => ChatParticipant::class,
            'chat_message' => ChatMessage::class,
            'chat_attachment' => ChatAttachment::class,
        ]);



        $this->configureRateLimiters();

        Event::listen(function (\SocialiteProviders\Manager\SocialiteWasCalled $event) {
            $event->extendSocialite('yandex', \SocialiteProviders\Yandex\Provider::class);
        });
    }

    private function configureRateLimiters(): void
    {
        RateLimiter::for('auth', fn (Request $request) => [
            Limit::perMinute(8)->by('auth:' . $request->ip()),
            Limit::perHour(40)->by('auth-hour:' . $request->ip()),
        ]);

        RateLimiter::for('search', fn (Request $request) => [
            Limit::perMinute(80)->by('search:' . ($request->user()?->id ?? $request->ip())),
        ]);

        RateLimiter::for('ai', fn (Request $request) => [
            Limit::perMinute(12)->by('ai:' . ($request->user()?->id ?? $request->ip())),
            Limit::perHour(120)->by('ai-hour:' . ($request->user()?->id ?? $request->ip())),
        ]);

        RateLimiter::for('comments', fn (Request $request) => [
            Limit::perMinute(12)->by('comments:' . ($request->user()?->id ?? $request->ip())),
            Limit::perHour(120)->by('comments-hour:' . ($request->user()?->id ?? $request->ip())),
        ]);

        RateLimiter::for('reactions', fn (Request $request) => [
            Limit::perMinute(60)->by('reactions:' . ($request->user()?->id ?? $request->ip())),
        ]);

        RateLimiter::for('reports', fn (Request $request) => [
            Limit::perMinute(4)->by('reports:' . ($request->user()?->id ?? $request->ip())),
            Limit::perHour(20)->by('reports-hour:' . ($request->user()?->id ?? $request->ip())),
        ]);

        RateLimiter::for('chat-messages', fn (Request $request) => [
            Limit::perMinute(25)->by('chat-msg:' . ($request->user()?->id ?? $request->ip())),
            Limit::perHour(500)->by('chat-msg-hour:' . ($request->user()?->id ?? $request->ip())),
        ]);

        RateLimiter::for('chat-typing', fn (Request $request) => [
            Limit::perMinute(90)->by('chat-typing:' . ($request->user()?->id ?? $request->ip())),
        ]);

        RateLimiter::for('presence', fn (Request $request) => [
            Limit::perMinute(40)->by('presence:' . ($request->user()?->id ?? $request->ip())),
        ]);

        RateLimiter::for('playground-runs', fn (Request $request) => [
            Limit::perMinute(6)->by('playground:' . ($request->user()?->id ?? $request->ip())),
            Limit::perHour(60)->by('playground-hour:' . ($request->user()?->id ?? $request->ip())),
        ]);

        RateLimiter::for('content-write', fn (Request $request) => [
            Limit::perMinute(8)->by('content-write:' . ($request->user()?->id ?? $request->ip())),
            Limit::perHour(80)->by('content-write-hour:' . ($request->user()?->id ?? $request->ip())),
        ]);

        RateLimiter::for('social', fn (Request $request) => [
            Limit::perMinute(20)->by('social:' . ($request->user()?->id ?? $request->ip())),
        ]);

        RateLimiter::for('uploads', fn (Request $request) => [
            Limit::perMinute(10)->by('uploads:' . ($request->user()?->id ?? $request->ip())),
            Limit::perHour(80)->by('uploads-hour:' . ($request->user()?->id ?? $request->ip())),
        ]);

        RateLimiter::for('admin-actions', fn (Request $request) => [
            Limit::perMinute(120)->by('admin:' . ($request->user()?->id ?? $request->ip())),
        ]);
    }

}
