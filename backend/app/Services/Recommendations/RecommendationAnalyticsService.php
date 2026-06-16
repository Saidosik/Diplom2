<?php

namespace App\Services\Recommendations;

use App\Models\RecommendationEvent;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class RecommendationAnalyticsService
{
    public function analytics(string $period): array
    {
        $period = in_array($period, ['day', 'week', 'month'], true) ? $period : 'week';
        $events = RecommendationEvent::query()
            ->where('created_at', '>=', $this->periodStart($period))
            ->get();

        $summary = $this->summary($events);

        return [
            'period' => $period,
            'summary' => $summary,
            'by_strategy' => $this->grouped($events, 'strategy', 'strategy'),
            'by_mode' => $this->grouped($events, 'mode', 'mode'),
            'by_type' => $this->grouped($events, 'recommendation_type', 'type'),
            'by_position' => $this->grouped($events, 'position', 'position', true),
            'top_clicked_items' => $this->topItems($events, RecommendationEvent::EVENT_CLICK),
            'top_hidden_items' => $this->topItems($events, RecommendationEvent::EVENT_HIDE),
        ];
    }

    private function periodStart(string $period): Carbon
    {
        return match ($period) {
            'day' => now()->subDay(),
            'month' => now()->subMonth(),
            default => now()->subWeek(),
        };
    }

    /** @param Collection<int,RecommendationEvent> $events */
    private function summary(Collection $events): array
    {
        $views = $events->where('event_type', RecommendationEvent::EVENT_VIEW)->count();
        $clicks = $events->where('event_type', RecommendationEvent::EVENT_CLICK)->count();
        $hides = $events->where('event_type', RecommendationEvent::EVENT_HIDE)->count();
        $likes = $events->where('event_type', RecommendationEvent::EVENT_LIKE)->count();
        $saves = $events->where('event_type', RecommendationEvent::EVENT_SAVE)->count();

        return [
            'total_views' => $views,
            'total_clicks' => $clicks,
            'ctr' => $this->rate($clicks, $views),
            'total_hides' => $hides,
            'hide_rate' => $this->rate($hides, $views),
            'total_likes' => $likes,
            'total_saves' => $saves,
            'positive_rate' => $this->rate($clicks + $likes + $saves, $views),
        ];
    }

    /** @param Collection<int,RecommendationEvent> $events */
    private function grouped(Collection $events, string $metadataKey, string $outputKey, bool $numeric = false): array
    {
        return $events
            ->groupBy(fn (RecommendationEvent $event) => $this->metadataValue($event, $metadataKey, $numeric))
            ->map(function (Collection $group, string|int $value) use ($outputKey, $numeric) {
                $summary = $this->summary($group);

                return [
                    $outputKey => $numeric ? (int) $value : (string) $value,
                    'views' => $summary['total_views'],
                    'clicks' => $summary['total_clicks'],
                    'ctr' => $summary['ctr'],
                    'hides' => $summary['total_hides'],
                    'hide_rate' => $summary['hide_rate'],
                    'likes' => $summary['total_likes'],
                    'saves' => $summary['total_saves'],
                ];
            })
            ->when(
                $numeric,
                fn (Collection $rows) => $rows->sortBy(fn (array $row) => $row[$outputKey]),
                fn (Collection $rows) => $rows->sortByDesc(fn (array $row) => $row['views'] + $row['clicks']),
            )
            ->values()
            ->all();
    }

    private function metadataValue(RecommendationEvent $event, string $key, bool $numeric): string|int
    {
        $value = $event->metadata[$key] ?? null;

        if ($value === null || $value === '') {
            return $numeric ? 0 : 'unknown';
        }

        return $numeric ? (int) $value : (string) $value;
    }

    /** @param Collection<int,RecommendationEvent> $events */
    private function topItems(Collection $events, string $eventType): array
    {
        return $events
            ->where('event_type', $eventType)
            ->filter(fn (RecommendationEvent $event) => $event->target_type !== '' && $event->target_id !== null)
            ->groupBy(fn (RecommendationEvent $event) => $event->target_type . ':' . $event->target_id)
            ->map(function (Collection $group) {
                /** @var RecommendationEvent $first */
                $first = $group->first();

                return [
                    'target_type' => $first->target_type,
                    'target_id' => (int) $first->target_id,
                    'title' => $first->metadata['title'] ?? null,
                    'href' => $first->metadata['href'] ?? null,
                    'count' => $group->count(),
                    'strategy' => $first->metadata['strategy'] ?? 'unknown',
                    'mode' => $first->metadata['mode'] ?? 'unknown',
                ];
            })
            ->sortByDesc('count')
            ->take(10)
            ->values()
            ->all();
    }

    private function rate(int $numerator, int $denominator): float
    {
        if ($denominator <= 0) {
            return 0.0;
        }

        return round($numerator / $denominator, 4);
    }
}
