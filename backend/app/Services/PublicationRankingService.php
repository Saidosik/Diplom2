<?php

namespace App\Services;

use App\Models\Publication;
use Illuminate\Support\Carbon;

class PublicationRankingService
{
    public function score(Publication $publication, ?Carbon $since = null): float
    {
        $likes = (int) ($publication->period_likes_count ?? $publication->likes_count ?? 0);
        $comments = (int) ($publication->period_comments_count ?? $publication->comments_count ?? 0);
        $saves = (int) ($publication->period_saved_count ?? $publication->saved_items_count ?? $publication->saved_count ?? 0);
        $views = (int) ($publication->period_views_count ?? $publication->views_count ?? 0);
        $reading = max(1, (int) ($publication->reading_time_minutes ?? 1));
        $ageHours = max(0, $publication->published_at ? $publication->published_at->diffInHours(now()) : 0);
        $agePenalty = min(30, $ageHours / 24 * 1.5);
        $freshness = $publication->published_at?->greaterThan(now()->subDays(3)) ? 8 : 0;

        return round(($likes * 3) + ($comments * 2) + ($saves * 4) + ($views * 0.2) + min(6, $reading * 0.25) + $freshness - $agePenalty, 2);
    }

    public function rating(Publication $publication): int
    {
        return (int) ($publication->likes_count ?? 0) - (int) ($publication->dislikes_count ?? 0);
    }

    public function reasonLabel(Publication $publication, string $period = 'week'): string
    {
        $comments = (int) ($publication->period_comments_count ?? $publication->comments_count ?? 0);
        $saves = (int) ($publication->period_saved_count ?? $publication->saved_items_count ?? 0);
        $views = (int) ($publication->period_views_count ?? $publication->views_count ?? 0);
        $likes = (int) ($publication->period_likes_count ?? $publication->likes_count ?? 0);

        if ($comments >= max(5, $likes)) return 'Активно обсуждают';
        if ($saves >= max(4, (int) floor($likes / 2))) return 'Много сохранений';
        if ($views >= 300) return 'Набирает просмотры';

        return match ($period) {
            'day' => 'Популярно сегодня',
            'month' => 'Популярно за месяц',
            'all' => 'Выбор сообщества',
            default => 'Популярно за неделю',
        };
    }
}
