<?php

namespace App\Services\Profile;

use App\Enums\IssueQuestionStatus;
use App\Enums\PublicationStatus;
use App\Models\Achievement;
use App\Models\CodeSnippet;
use App\Models\Friendship;
use App\Models\IssueAnswer;
use App\Models\IssueQuestion;
use App\Models\Publication;
use App\Models\User;
use App\Models\UserAchievement;
use App\Models\UserFile;

class AchievementService
{
    public function recalculate(User $user): void
    {
        Achievement::query()->where('is_active', true)->get()->each(function (Achievement $achievement) use ($user) {
            $progress = $this->progress($user, $achievement->condition_type);
            $unlocked = $progress >= (int) $achievement->condition_value;
            UserAchievement::query()->updateOrCreate([
                'user_id' => $user->id,
                'achievement_id' => $achievement->id,
            ], [
                'progress' => min($progress, (int) $achievement->condition_value),
                'unlocked_at' => $unlocked ? now() : null,
                'metadata' => ['actual' => $progress],
            ]);
        });
    }

    public function progress(User $user, string $type): int
    {
        return match ($type) {
            'registered' => 1,
            'profile_completion' => $this->completion($user),
            'publications_count' => Publication::query()->where('author_id', $user->id)->where('status', PublicationStatus::Published->value)->count(),
            'questions_count' => IssueQuestion::query()->where('author_id', $user->id)->where('status', IssueQuestionStatus::Published->value)->count(),
            'answers_count' => IssueAnswer::query()->where('author_id', $user->id)->count(),
            'public_snippets_count' => CodeSnippet::query()->where('user_id', $user->id)->where('visibility', 'public')->where('status', CodeSnippet::STATUS_ACTIVE)->count(),
            'files_count' => UserFile::query()->where('user_id', $user->id)->count(),
            'public_files_count' => UserFile::query()->where('user_id', $user->id)->where('visibility', 'public')->count(),
            'friends_count' => Friendship::query()->where(fn ($q) => $q->where('user_one_id', $user->id)->orWhere('user_two_id', $user->id))->count(),
            'followers_count' => $user->subscribers()->count(),
            'reputation' => (int) $user->reputation_score,
            default => 0,
        };
    }

    public function completion(User $user): int
    {
        $fields = ['avatar','headline','bio','location','direction','website_url','github_url'];
        $filled = collect($fields)->filter(fn ($field) => filled($user->{$field} ?? null))->count();
        return (int) round($filled / count($fields) * 100);
    }
}
