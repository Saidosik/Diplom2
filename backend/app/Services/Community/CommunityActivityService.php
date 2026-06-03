<?php

namespace App\Services\Community;

use App\Events\CommunityNotificationCreated;
use App\Models\CommunityActivity;
use App\Models\CommunityNotification;
use App\Models\NotificationSetting;
use App\Models\ReputationEvent;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class CommunityActivityService
{
    public const REASON_PUBLICATION_CREATED = 'publication_created';
    public const REASON_QUESTION_CREATED = 'question_created';
    public const REASON_ANSWER_CREATED = 'answer_created';
    public const REASON_ANSWER_ACCEPTED = 'answer_accepted';
    public const REASON_LIKE_RECEIVED = 'like_received';
    public const REASON_COMMENT_CREATED = 'comment_created';

    public const ACTIVITY_PUBLICATION_CREATED = 'publication_created';
    public const ACTIVITY_QUESTION_CREATED = 'question_created';
    public const ACTIVITY_ANSWER_CREATED = 'answer_created';
    public const ACTIVITY_ANSWER_ACCEPTED = 'answer_accepted';
    public const ACTIVITY_COMMENT_CREATED = 'comment_created';
    public const ACTIVITY_REACTION_ADDED = 'reaction_added';
    public const ACTIVITY_REPUTATION_CHANGED = 'reputation_changed';
    public const ACTIVITY_SUBSCRIPTION_CREATED = 'subscription_created';
    public const ACTIVITY_CODE_SNIPPET_CREATED = 'code_snippet_created';

    /**
     * @return array{label:string,next_label:?string,progress:int}
     */
    public static function reputationLevel(int $score): array
    {
        return match (true) {
            $score >= 300 => ['label' => 'Эксперт', 'next_label' => null, 'progress' => 100],
            $score >= 150 => ['label' => 'Опытный участник', 'next_label' => 'Эксперт', 'progress' => min(99, (int) round((($score - 150) / 150) * 100))],
            $score >= 50 => ['label' => 'Участник', 'next_label' => 'Опытный участник', 'progress' => min(99, (int) round((($score - 50) / 100) * 100))],
            default => ['label' => 'Новичок', 'next_label' => 'Участник', 'progress' => min(99, (int) round(($score / 50) * 100))],
        };
    }

    public function record(
        ?User $actor,
        string $type,
        ?Model $subject = null,
        ?Model $target = null,
        array $metadata = [],
        ?string $title = null,
        ?string $description = null,
        ?string $link = null,
        int $score = 0
    ): CommunityActivity {
        $resolvedTitle = $title ?? $this->activityTitle($type, $actor, $subject, $target);
        $resolvedLink = $link ?? $this->sourceLink($subject) ?? $this->sourceLink($target);

        return CommunityActivity::query()->create([
            'actor_id' => $actor?->id,
            'type' => $type,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'target_type' => $target?->getMorphClass(),
            'target_id' => $target?->getKey(),
            'title' => $resolvedTitle,
            'description' => $description,
            'link' => $resolvedLink,
            'score' => $score,
            'metadata' => $metadata,
        ]);
    }

    public function settingsFor(User $user): NotificationSetting
    {
        return NotificationSetting::query()->firstOrCreate([
            'user_id' => $user->id,
        ]);
    }

    public function awardReputation(
        User $user,
        int $points,
        string $reason,
        ?Model $source = null,
        ?User $actor = null,
        array $meta = []
    ): ?ReputationEvent {
        if ($points === 0) {
            return null;
        }

        if ($actor && $actor->id === $user->id && in_array($reason, [self::REASON_LIKE_RECEIVED, self::REASON_ANSWER_ACCEPTED], true)) {
            return null;
        }

        return DB::transaction(function () use ($user, $points, $reason, $source, $actor, $meta) {
            $event = ReputationEvent::query()->create([
                'user_id' => $user->id,
                'actor_id' => $actor?->id,
                'points' => $points,
                'reason' => $reason,
                'source_type' => $source?->getMorphClass(),
                'source_id' => $source?->getKey(),
                'meta' => $meta,
            ]);

            $user->increment('reputation_score', $points);

            $this->record(
                $actor,
                self::ACTIVITY_REPUTATION_CHANGED,
                $event,
                $source,
                ['points' => $points, 'reason' => $reason, 'user_id' => $user->id],
                null,
                $this->reputationMessage($points, $reason),
                $this->sourceLink($source),
                abs($points)
            );

            if ($this->settingsFor($user)->notify_reputation) {
                $this->notify(
                    $user,
                    'reputation_changed',
                    $points > 0 ? 'Репутация увеличилась' : 'Репутация уменьшилась',
                    $this->reputationMessage($points, $reason),
                    $this->sourceLink($source),
                    ['points' => $points, 'reason' => $reason],
                    $actor
                );
            }

            return $event;
        });
    }

    public function notify(
        User $recipient,
        string $type,
        string $title,
        ?string $message = null,
        ?string $link = null,
        array $data = [],
        ?User $actor = null
    ): ?CommunityNotification {
        if ($actor && $actor->id === $recipient->id) {
            return null;
        }

        $settings = $this->settingsFor($recipient);

        if (! $settings->inbox_enabled || ! $this->isAllowedBySettings($settings, $type)) {
            return null;
        }

        $notification = CommunityNotification::query()->create([
            'user_id' => $recipient->id,
            'actor_id' => $actor?->id,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'link' => $link,
            'data' => $data,
        ]);

        broadcast(new CommunityNotificationCreated($notification))->toOthers();

        return $notification;
    }

    public function notifySubscribers(
        Model $target,
        string $type,
        string $title,
        ?string $message,
        ?string $link,
        array $data = [],
        ?User $actor = null
    ): int {
        $count = 0;

        Subscription::query()
            ->where('subscribable_type', $target->getMorphClass())
            ->where('subscribable_id', $target->getKey())
            ->with('user')
            ->chunkById(100, function ($subscriptions) use (&$count, $type, $title, $message, $link, $data, $actor) {
                foreach ($subscriptions as $subscription) {
                    if ($subscription->user && $this->notify($subscription->user, $type, $title, $message, $link, $data, $actor)) {
                        $count++;
                    }
                }
            });

        return $count;
    }

    private function isAllowedBySettings(NotificationSetting $settings, string $type): bool
    {
        return match ($type) {
            'question_answered' => $settings->notify_answers,
            'comment_created' => $settings->notify_comments,
            'comment_reply' => $settings->notify_comment_replies,
            'author_publication' => $settings->notify_author_posts,
            'subscription_created' => $settings->notify_subscriptions,
            'moderation_update' => $settings->notify_moderation,
            'reputation_changed' => $settings->notify_reputation,
            default => true,
        };
    }

    private function activityTitle(string $type, ?User $actor, ?Model $subject, ?Model $target): string
    {
        $actorName = $actor?->name ?? 'Участник';

        return match ($type) {
            self::ACTIVITY_PUBLICATION_CREATED => "{$actorName} опубликовал материал",
            self::ACTIVITY_QUESTION_CREATED => "{$actorName} задал вопрос",
            self::ACTIVITY_ANSWER_CREATED => "{$actorName} добавил ответ",
            self::ACTIVITY_ANSWER_ACCEPTED => 'Ответ выбран решением',
            self::ACTIVITY_COMMENT_CREATED => "{$actorName} добавил комментарий",
            self::ACTIVITY_REACTION_ADDED => "{$actorName} оценил материал",
            self::ACTIVITY_REPUTATION_CHANGED => 'Изменилась репутация участника',
            self::ACTIVITY_SUBSCRIPTION_CREATED => "{$actorName} оформил подписку",
            self::ACTIVITY_CODE_SNIPPET_CREATED => "{$actorName} сохранил пример кода",
            default => 'Новое событие сообщества',
        };
    }

    private function reputationMessage(int $points, string $reason): string
    {
        $prefix = $points > 0 ? '+' : '';

        return match ($reason) {
            self::REASON_PUBLICATION_CREATED => "{$prefix}{$points} за публикацию материала.",
            self::REASON_QUESTION_CREATED => "{$prefix}{$points} за созданный вопрос.",
            self::REASON_ANSWER_CREATED => "{$prefix}{$points} за ответ участнику сообщества.",
            self::REASON_ANSWER_ACCEPTED => "{$prefix}{$points} за ответ, выбранный решением.",
            self::REASON_LIKE_RECEIVED => "{$prefix}{$points} за полезную реакцию от участника.",
            self::REASON_COMMENT_CREATED => "{$prefix}{$points} за участие в обсуждении.",
            default => "{$prefix}{$points} баллов репутации.",
        };
    }

    public function sourceLink(?Model $source): ?string
    {
        if (! $source) {
            return null;
        }

        return match ($source->getMorphClass()) {
            'publication' => isset($source->slug) ? "/publications/{$source->slug}" : null,
            'issue_question' => isset($source->slug) ? "/questions/{$source->slug}" : null,
            'issue_answer' => $source->question?->slug ? "/questions/{$source->question->slug}#answer-{$source->id}" : null,
            'comment' => $this->commentLink($source),
            'code_snippet' => isset($source->id) ? "/playground?snippet={$source->id}" : null,
            default => null,
        };
    }

    private function commentLink(Model $comment): ?string
    {
        if (! method_exists($comment, 'commentable')) {
            return null;
        }

        $comment->loadMissing('commentable');
        $target = $comment->commentable;

        if (! $target) {
            return null;
        }

        return match ($target->getMorphClass()) {
            'publication' => isset($target->slug) ? "/publications/{$target->slug}#comment-{$comment->id}" : null,
            'issue_question' => isset($target->slug) ? "/questions/{$target->slug}#comment-{$comment->id}" : null,
            'issue_answer' => $target->question?->slug ? "/questions/{$target->question->slug}#comment-{$comment->id}" : null,
            default => null,
        };
    }

}
