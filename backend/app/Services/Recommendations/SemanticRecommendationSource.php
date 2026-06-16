<?php

namespace App\Services\Recommendations;

use App\Models\AiKnowledgeChunk;
use App\Models\RecommendationEvent;
use App\Models\User;
use App\Services\Ai\EmbeddingService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class SemanticRecommendationSource
{
    private const POSITIVE_WEIGHTS = [
        RecommendationEvent::EVENT_SAVE => 1.0,
        RecommendationEvent::EVENT_LIKE => 0.9,
        RecommendationEvent::EVENT_LONG_VIEW => 0.8,
        RecommendationEvent::EVENT_COMMENT => 0.7,
        RecommendationEvent::EVENT_CLICK => 0.5,
    ];

    public function __construct(private readonly EmbeddingService $embeddings) {}

    /**
     * @param array<string,mixed> $profile
     * @return array{candidates: Collection<int,array<string,mixed>>, semantic_signals_count:int}
     */
    public function candidates(?User $user, ?string $guestId, array $profile, int $limit = 16): array
    {
        $events = $this->events($user, $guestId);
        $weightedEvents = $this->positiveEvents($events);

        if ($weightedEvents->isEmpty()) {
            $weightedEvents = $this->viewFallbackEvents($events);
        }

        if ($weightedEvents->isEmpty()) {
            return ['candidates' => collect(), 'semantic_signals_count' => 0];
        }

        $seedChunks = $this->seedChunks($weightedEvents);
        if ($seedChunks->isEmpty()) {
            return ['candidates' => collect(), 'semantic_signals_count' => 0];
        }

        $positiveVector = $this->weightedCentroid($seedChunks, $weightedEvents);
        if ($positiveVector === []) {
            return ['candidates' => collect(), 'semantic_signals_count' => 0];
        }

        $negativeVector = $this->negativeCentroid($events);
        $excluded = $this->excludedItems($profile, $events);
        $seen = $this->seenItems($profile, $events);
        $seedKeys = $weightedEvents
            ->map(fn (RecommendationEvent $event) => $event->target_type . ':' . $event->target_id)
            ->all();

        $candidates = AiKnowledgeChunk::query()
            ->with('document')
            ->whereIn('source_type', [RecommendationEvent::TARGET_PUBLICATION, RecommendationEvent::TARGET_QUESTION])
            ->whereNotNull('embedding')
            ->latest('indexed_at')
            ->limit(250)
            ->get()
            ->reject(fn (AiKnowledgeChunk $chunk) => in_array($chunk->source_type . ':' . $chunk->source_id, $seedKeys, true))
            ->reject(fn (AiKnowledgeChunk $chunk) => in_array($chunk->source_type . ':' . $chunk->source_id, $excluded, true))
            ->map(function (AiKnowledgeChunk $chunk) use ($positiveVector, $negativeVector, $seen) {
                $semantic = max(0.0, $this->embeddings->cosine($positiveVector, $chunk->embedding ?? []));
                $negative = $negativeVector === [] ? 0.0 : max(0.0, $this->embeddings->cosine($negativeVector, $chunk->embedding ?? []));
                $seenPenalty = in_array($chunk->source_type . ':' . $chunk->source_id, $seen, true) ? 0.12 : 0.0;
                $score = max(0.0, $semantic - ($negative * 0.35) - $seenPenalty);

                return [
                    'type' => $chunk->source_type,
                    'source_id' => (int) $chunk->source_id,
                    'score' => round($score, 6),
                    'semantic_score' => round($semantic, 6),
                    'reason' => $this->reasonFor($chunk->source_type),
                ];
            })
            ->filter(fn (array $candidate) => $candidate['score'] >= 0.15)
            ->sortByDesc('score')
            ->unique(fn (array $candidate) => $candidate['type'] . ':' . $candidate['source_id'])
            ->take($limit)
            ->values();

        return [
            'candidates' => $candidates,
            'semantic_signals_count' => $weightedEvents->count(),
        ];
    }

    /** @return Collection<int,RecommendationEvent> */
    private function events(?User $user, ?string $guestId): Collection
    {
        return RecommendationEvent::query()
            ->when(
                $user,
                fn (Builder $builder) => $builder->where('user_id', $user->id)->where('created_at', '>=', now()->subDays(30)),
                fn (Builder $builder) => $guestId
                    ? $builder->where('guest_id', $guestId)->where('created_at', '>=', now()->subDays(7))
                    : $builder->whereRaw('1 = 0'),
            )
            ->whereIn('target_type', [RecommendationEvent::TARGET_PUBLICATION, RecommendationEvent::TARGET_QUESTION])
            ->latest()
            ->limit(200)
            ->get();
    }

    /** @param Collection<int,RecommendationEvent> $events @return Collection<int,RecommendationEvent> */
    private function positiveEvents(Collection $events): Collection
    {
        return $events->filter(fn (RecommendationEvent $event) => array_key_exists($event->event_type, self::POSITIVE_WEIGHTS))->values();
    }

    /** @param Collection<int,RecommendationEvent> $events @return Collection<int,RecommendationEvent> */
    private function viewFallbackEvents(Collection $events): Collection
    {
        return $events->where('event_type', RecommendationEvent::EVENT_VIEW)->values();
    }

    /** @param Collection<int,RecommendationEvent> $events @return Collection<int,AiKnowledgeChunk> */
    private function seedChunks(Collection $events): Collection
    {
        return AiKnowledgeChunk::query()
            ->whereIn('source_type', [RecommendationEvent::TARGET_PUBLICATION, RecommendationEvent::TARGET_QUESTION])
            ->whereNotNull('embedding')
            ->where(function (Builder $builder) use ($events) {
                foreach ($events as $event) {
                    $builder->orWhere(fn (Builder $query) => $query
                        ->where('source_type', $event->target_type)
                        ->where('source_id', $event->target_id));
                }
            })
            ->get()
            ->unique(fn (AiKnowledgeChunk $chunk) => $chunk->source_type . ':' . $chunk->source_id)
            ->values();
    }

    /** @param Collection<int,AiKnowledgeChunk> $chunks @param Collection<int,RecommendationEvent> $events @return array<int,float> */
    private function weightedCentroid(Collection $chunks, Collection $events): array
    {
        $eventWeights = $events->mapWithKeys(fn (RecommendationEvent $event) => [
            $event->target_type . ':' . $event->target_id => self::POSITIVE_WEIGHTS[$event->event_type] ?? 0.15,
        ]);

        $centroid = [];
        $totalWeight = 0.0;
        foreach ($chunks as $chunk) {
            $weight = (float) ($eventWeights[$chunk->source_type . ':' . $chunk->source_id] ?? 0.15);
            foreach (($chunk->embedding ?? []) as $index => $value) {
                $centroid[$index] = ($centroid[$index] ?? 0.0) + ((float) $value * $weight);
            }
            $totalWeight += $weight;
        }

        if ($totalWeight <= 0.0) {
            return [];
        }

        return array_map(fn (float $value) => $value / $totalWeight, $centroid);
    }

    /** @param Collection<int,RecommendationEvent> $events @return array<int,float> */
    private function negativeCentroid(Collection $events): array
    {
        $negativeEvents = $events->whereIn('event_type', [RecommendationEvent::EVENT_HIDE, RecommendationEvent::EVENT_DISLIKE])->values();
        if ($negativeEvents->isEmpty()) {
            return [];
        }

        return $this->weightedCentroid($this->seedChunks($negativeEvents), $negativeEvents->map(function (RecommendationEvent $event) {
            $event->event_type = RecommendationEvent::EVENT_CLICK;
            return $event;
        }));
    }

    /** @param array<string,mixed> $profile @param Collection<int,RecommendationEvent> $events @return array<int,string> */
    private function excludedItems(array $profile, Collection $events): array
    {
        return collect()
            ->merge(collect($profile['hidden_publication_ids'] ?? [])->map(fn ($id) => 'publication:' . $id))
            ->merge(collect($profile['hidden_question_ids'] ?? [])->map(fn ($id) => 'question:' . $id))
            ->merge(collect($profile['disliked_publication_ids'] ?? [])->map(fn ($id) => 'publication:' . $id))
            ->merge(collect($profile['disliked_question_ids'] ?? [])->map(fn ($id) => 'question:' . $id))
            ->merge($events->whereIn('event_type', [RecommendationEvent::EVENT_HIDE, RecommendationEvent::EVENT_DISLIKE])->map(fn (RecommendationEvent $event) => $event->target_type . ':' . $event->target_id))
            ->unique()
            ->values()
            ->all();
    }

    /** @param array<string,mixed> $profile @param Collection<int,RecommendationEvent> $events @return array<int,string> */
    private function seenItems(array $profile, Collection $events): array
    {
        return collect()
            ->merge(collect($profile['seen_publication_ids'] ?? [])->map(fn ($id) => 'publication:' . $id))
            ->merge(collect($profile['seen_question_ids'] ?? [])->map(fn ($id) => 'question:' . $id))
            ->merge($events->where('event_type', RecommendationEvent::EVENT_VIEW)->map(fn (RecommendationEvent $event) => $event->target_type . ':' . $event->target_id))
            ->unique()
            ->values()
            ->all();
    }

    private function reasonFor(string $sourceType): string
    {
        return $sourceType === RecommendationEvent::TARGET_QUESTION
            ? 'Похоже на вопросы, которые вы читали'
            : 'Связано с вашими интересами по смыслу';
    }
}
