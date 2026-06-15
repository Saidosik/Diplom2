<?php

namespace Tests\Feature;

use App\Models\AiKnowledgeChunk;
use App\Models\AiKnowledgeDocument;
use App\Models\IssueQuestion;
use App\Models\Publication;
use App\Models\Reaction;
use App\Models\RecommendationEvent;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

class RecommendationsEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_receives_recommendations_without_auth(): void
    {
        $this->publication(['title' => 'Guest trend', 'slug' => 'guest-trend']);
        $this->question(['title' => 'Guest question', 'slug' => 'guest-question']);

        $this->getJson('/api/recommendations')
            ->assertOk()
            ->assertHeader('Vary', 'Cookie, Authorization')
            ->assertJsonPath('mode', 'guest')
            ->assertJsonStructure(['mode', 'data' => [['type', 'title', 'description', 'href', 'reason', 'score', 'item']], 'meta']);
    }

    public function test_user_receives_personalized_mode(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $this->publication(['title' => 'Personalized trend', 'slug' => 'personalized-trend']);

        $this->withToken(JWTAuth::fromUser($user))->getJson('/api/recommendations')
            ->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonPath('mode', 'personalized')
            ->assertJsonPath('meta.personalized', true);
    }

    public function test_disliked_item_is_excluded_from_recommendations(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $disliked = $this->publication(['title' => 'Disliked publication', 'slug' => 'disliked-publication']);
        $this->publication(['title' => 'Visible publication', 'slug' => 'visible-publication']);

        Reaction::create([
            'user_id' => $user->id,
            'reactable_type' => (new Publication())->getMorphClass(),
            'reactable_id' => $disliked->id,
            'type' => Reaction::DISLIKE,
        ]);

        $slugs = collect($this->withToken(JWTAuth::fromUser($user))->getJson('/api/recommendations')->json('data'))
            ->pluck('item.slug');

        $this->assertFalse($slugs->contains('disliked-publication'));
    }

    public function test_own_content_receives_penalty(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $own = $this->publication(['author_id' => $user->id, 'title' => 'Own publication', 'slug' => 'own-publication']);
        $other = $this->publication(['title' => 'Other publication', 'slug' => 'other-publication']);

        $service = app(\App\Services\Recommendations\RecommendationService::class);
        $profile = $service->userInterestProfile($user);

        $this->assertLessThan(
            $service->publicationRecommendationScore($other->load('tags'), $profile, $user),
            $service->publicationRecommendationScore($own->load('tags'), $profile, $user),
        );
    }

    public function test_unanswered_question_receives_bonus(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $unanswered = $this->question(['title' => 'Unanswered question', 'slug' => 'unanswered-question', 'is_solved' => false]);
        $solved = $this->question(['title' => 'Solved question', 'slug' => 'solved-question', 'is_solved' => true]);

        $service = app(\App\Services\Recommendations\RecommendationService::class);
        $profile = $service->userInterestProfile($user);

        $this->assertGreaterThan(
            $service->questionRecommendationScore($solved->load('tags'), $profile, $user),
            $service->questionRecommendationScore($unanswered->load('tags'), $profile, $user),
        );
    }


    public function test_guest_event_post_creates_event_and_sets_cookie(): void
    {
        $publication = $this->publication(['title' => 'Tracked publication', 'slug' => 'tracked-publication']);

        $response = $this->postJson('/api/recommendations/events', [
            'event_type' => 'click',
            'target_type' => 'publication',
            'target_id' => $publication->id,
            'context' => 'home',
            'metadata' => ['source' => 'recommendations_block', 'position' => 1],
        ])->assertOk()
            ->assertCookie('vector_guest_id')
            ->assertJsonPath('ok', true);

        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));

        $this->assertDatabaseHas('recommendation_events', [
            'user_id' => null,
            'event_type' => 'click',
            'target_type' => 'publication',
            'target_id' => $publication->id,
            'context' => 'home',
            'weight' => RecommendationEvent::weightFor('click'),
        ]);
    }

    public function test_authenticated_event_post_writes_user_id(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $publication = $this->publication(['title' => 'Auth tracked', 'slug' => 'auth-tracked']);

        $this->withToken(JWTAuth::fromUser($user))->postJson('/api/recommendations/events', [
            'event_type' => 'like',
            'target_type' => 'publication',
            'target_id' => $publication->id,
        ])->assertOk();

        $this->assertDatabaseHas('recommendation_events', [
            'user_id' => $user->id,
            'guest_id' => null,
            'event_type' => 'like',
            'target_id' => $publication->id,
        ]);
    }

    public function test_invalid_event_type_returns_422(): void
    {
        $this->postJson('/api/recommendations/events', [
            'event_type' => 'bad_signal',
            'target_type' => 'publication',
        ])->assertStatus(422);
    }

    public function test_hidden_publication_is_excluded_from_recommendations(): void
    {
        $publication = $this->publication(['title' => 'Hidden publication', 'slug' => 'hidden-publication']);
        $this->publication(['title' => 'Visible after hide', 'slug' => 'visible-after-hide']);
        RecommendationEvent::create([
            'guest_id' => 'guest-hidden',
            'event_type' => RecommendationEvent::EVENT_HIDE,
            'target_type' => RecommendationEvent::TARGET_PUBLICATION,
            'target_id' => $publication->id,
            'weight' => RecommendationEvent::weightFor(RecommendationEvent::EVENT_HIDE),
        ]);

        $slugs = collect($this->withHeader('X-Vector-Guest-Id', 'guest-hidden')->getJson('/api/recommendations')->json('data'))->pluck('item.slug');

        $this->assertFalse($slugs->contains('hidden-publication'));
    }

    public function test_guest_with_click_and_open_tag_events_gets_guest_mode_and_signals(): void
    {
        $tag = Tag::create(['name' => 'Laravel', 'slug' => 'laravel', 'status' => Tag::STATUS_ACTIVE]);
        $publication = $this->publication(['title' => 'Laravel publication', 'slug' => 'laravel-publication']);
        $publication->tags()->attach($tag->id);
        RecommendationEvent::create([
            'guest_id' => 'guest-signal',
            'event_type' => RecommendationEvent::EVENT_CLICK,
            'target_type' => RecommendationEvent::TARGET_PUBLICATION,
            'target_id' => $publication->id,
            'weight' => RecommendationEvent::weightFor(RecommendationEvent::EVENT_CLICK),
        ]);
        RecommendationEvent::create([
            'guest_id' => 'guest-signal',
            'event_type' => RecommendationEvent::EVENT_OPEN_TAG,
            'target_type' => RecommendationEvent::TARGET_TAG,
            'target_id' => $tag->id,
            'weight' => RecommendationEvent::weightFor(RecommendationEvent::EVENT_OPEN_TAG),
        ]);

        $response = $this->withHeader('X-Vector-Guest-Id', 'guest-signal')->getJson('/api/recommendations')
            ->assertOk()
            ->assertJsonPath('mode', 'guest')
            ->assertJsonPath('meta.strategy', 'guest_events')
            ->assertJson(fn ($json) => $json->where('meta.signals_count', fn ($count) => $count > 0)->etc());

        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
    }

    public function test_authenticated_user_events_affect_personalized_recommendations(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $tag = Tag::create(['name' => 'Events', 'slug' => 'events', 'status' => Tag::STATUS_ACTIVE]);
        $boosted = $this->publication(['title' => 'Boosted by events', 'slug' => 'boosted-by-events', 'published_at' => now()->subDay()]);
        $regular = $this->publication(['title' => 'Regular publication', 'slug' => 'regular-publication', 'published_at' => now()]);
        $boosted->tags()->attach($tag->id);
        RecommendationEvent::create([
            'user_id' => $user->id,
            'event_type' => RecommendationEvent::EVENT_OPEN_TAG,
            'target_type' => RecommendationEvent::TARGET_TAG,
            'target_id' => $tag->id,
            'weight' => RecommendationEvent::weightFor(RecommendationEvent::EVENT_OPEN_TAG),
        ]);
        RecommendationEvent::create([
            'user_id' => $user->id,
            'event_type' => RecommendationEvent::EVENT_CLICK,
            'target_type' => RecommendationEvent::TARGET_PUBLICATION,
            'target_id' => $boosted->id,
            'weight' => RecommendationEvent::weightFor(RecommendationEvent::EVENT_CLICK),
        ]);

        $data = $this->withToken(JWTAuth::fromUser($user))->getJson('/api/recommendations')
            ->assertOk()
            ->assertJsonPath('meta.strategy', 'personalized_events')
            ->json('data');

        $this->assertSame('boosted-by-events', collect($data)->where('type', 'publication')->first()['item']['slug']);
        $this->assertNotNull($regular);
    }


    public function test_authenticated_user_with_saved_publication_gets_semantic_recommendations(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $seed = $this->publication(['title' => 'Saved Laravel queues', 'slug' => 'saved-laravel-queues']);
        $similar = $this->publication(['title' => 'Semantic Laravel workers', 'slug' => 'semantic-laravel-workers', 'published_at' => now()->subDays(10)]);
        $this->indexedChunk('publication', $seed->id, 'Saved Laravel queues', [1, 0, 0]);
        $this->indexedChunk('publication', $similar->id, 'Semantic Laravel workers', [0.98, 0.02, 0]);
        RecommendationEvent::create([
            'user_id' => $user->id,
            'event_type' => RecommendationEvent::EVENT_SAVE,
            'target_type' => RecommendationEvent::TARGET_PUBLICATION,
            'target_id' => $seed->id,
            'weight' => RecommendationEvent::weightFor(RecommendationEvent::EVENT_SAVE),
        ]);

        $data = $this->withToken(JWTAuth::fromUser($user))->getJson('/api/recommendations')
            ->assertOk()
            ->assertJsonPath('meta.strategy', 'personalized_semantic')
            ->assertJson(fn ($json) => $json
                ->where('meta.semantic_signals_count', fn ($count) => $count > 0)
                ->has('meta.candidate_sources')
                ->etc())
            ->json('data');

        $this->assertTrue(collect($data)->pluck('item.slug')->contains('semantic-laravel-workers'));
    }

    public function test_guest_with_click_and_long_view_events_gets_guest_semantic_strategy(): void
    {
        $seed = $this->publication(['title' => 'Clicked architecture', 'slug' => 'clicked-architecture']);
        $similar = $this->question(['title' => 'Similar architecture question', 'slug' => 'similar-architecture-question', 'published_at' => now()->subDays(8)]);
        $this->indexedChunk('publication', $seed->id, 'Clicked architecture', [0, 1, 0]);
        $this->indexedChunk('question', $similar->id, 'Similar architecture question', [0.01, 0.99, 0]);
        RecommendationEvent::create([
            'guest_id' => 'guest-semantic',
            'event_type' => RecommendationEvent::EVENT_CLICK,
            'target_type' => RecommendationEvent::TARGET_PUBLICATION,
            'target_id' => $seed->id,
            'weight' => RecommendationEvent::weightFor(RecommendationEvent::EVENT_CLICK),
        ]);
        RecommendationEvent::create([
            'guest_id' => 'guest-semantic',
            'event_type' => RecommendationEvent::EVENT_LONG_VIEW,
            'target_type' => RecommendationEvent::TARGET_PUBLICATION,
            'target_id' => $seed->id,
            'weight' => RecommendationEvent::weightFor(RecommendationEvent::EVENT_LONG_VIEW),
        ]);

        $this->withHeader('X-Vector-Guest-Id', 'guest-semantic')->getJson('/api/recommendations')
            ->assertOk()
            ->assertJsonPath('mode', 'guest')
            ->assertJsonPath('meta.strategy', 'guest_semantic')
            ->assertJson(fn ($json) => $json->where('meta.semantic_signals_count', fn ($count) => $count > 0)->etc());
    }

    public function test_hidden_semantic_similar_item_is_excluded(): void
    {
        $seed = $this->publication(['title' => 'Seed hidden semantic', 'slug' => 'seed-hidden-semantic']);
        $hidden = $this->publication(['title' => 'Hidden semantic match', 'slug' => 'hidden-semantic-match']);
        $this->publication(['title' => 'Visible semantic fallback', 'slug' => 'visible-semantic-fallback']);
        $this->indexedChunk('publication', $seed->id, 'Seed hidden semantic', [0, 0, 1]);
        $this->indexedChunk('publication', $hidden->id, 'Hidden semantic match', [0, 0.01, 0.99]);
        RecommendationEvent::create([
            'guest_id' => 'guest-hidden-semantic',
            'event_type' => RecommendationEvent::EVENT_CLICK,
            'target_type' => RecommendationEvent::TARGET_PUBLICATION,
            'target_id' => $seed->id,
            'weight' => RecommendationEvent::weightFor(RecommendationEvent::EVENT_CLICK),
        ]);
        RecommendationEvent::create([
            'guest_id' => 'guest-hidden-semantic',
            'event_type' => RecommendationEvent::EVENT_HIDE,
            'target_type' => RecommendationEvent::TARGET_PUBLICATION,
            'target_id' => $hidden->id,
            'weight' => RecommendationEvent::weightFor(RecommendationEvent::EVENT_HIDE),
        ]);

        $slugs = collect($this->withHeader('X-Vector-Guest-Id', 'guest-hidden-semantic')->getJson('/api/recommendations')->json('data'))->pluck('item.slug');

        $this->assertFalse($slugs->contains('hidden-semantic-match'));
    }

    public function test_fallback_works_when_no_embeddings_exist(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $publication = $this->publication(['title' => 'No embedding publication', 'slug' => 'no-embedding-publication']);
        RecommendationEvent::create([
            'user_id' => $user->id,
            'event_type' => RecommendationEvent::EVENT_LIKE,
            'target_type' => RecommendationEvent::TARGET_PUBLICATION,
            'target_id' => $publication->id,
            'weight' => RecommendationEvent::weightFor(RecommendationEvent::EVENT_LIKE),
        ]);

        $this->withToken(JWTAuth::fromUser($user))->getJson('/api/recommendations')
            ->assertOk()
            ->assertJsonPath('mode', 'personalized')
            ->assertJsonPath('meta.strategy', 'personalized_events')
            ->assertJsonStructure(['mode', 'data', 'meta']);
    }

    public function test_recommendation_cache_headers_for_semantic_and_shared_guest(): void
    {
        $sharedGuestResponse = $this->getJson('/api/recommendations')->assertOk();
        $this->assertStringContainsString('public', $sharedGuestResponse->headers->get('Cache-Control'));
        $sharedGuestResponse->assertHeader('Vary', 'Cookie, Authorization');

        $user = User::factory()->create(['email_verified_at' => now()]);
        $publication = $this->publication(['title' => 'Cache publication', 'slug' => 'cache-publication']);
        $this->indexedChunk('publication', $publication->id, 'Cache publication', [1, 0, 1]);
        RecommendationEvent::create([
            'user_id' => $user->id,
            'event_type' => RecommendationEvent::EVENT_CLICK,
            'target_type' => RecommendationEvent::TARGET_PUBLICATION,
            'target_id' => $publication->id,
            'weight' => RecommendationEvent::weightFor(RecommendationEvent::EVENT_CLICK),
        ]);

        $authResponse = $this->withToken(JWTAuth::fromUser($user))->getJson('/api/recommendations')->assertOk();
        $this->assertStringContainsString('no-store', $authResponse->headers->get('Cache-Control'));
    }

    public function test_event_post_always_returns_no_store(): void
    {
        $response = $this->postJson('/api/recommendations/events', [
            'event_type' => 'view',
            'target_type' => 'publication',
        ])->assertOk();

        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
    }


    private function indexedChunk(string $sourceType, int $sourceId, string $title, array $embedding): AiKnowledgeChunk
    {
        $document = AiKnowledgeDocument::create([
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'title' => $title,
            'url' => $sourceType === 'publication' ? '/publications/' . fake()->slug() : '/questions/' . fake()->slug(),
            'status' => 'indexed',
            'tags' => [],
            'metadata' => [],
            'indexed_at' => now(),
            'chunks_count' => 1,
        ]);

        return AiKnowledgeChunk::create([
            'ai_knowledge_document_id' => $document->id,
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'chunk_index' => 0,
            'title' => $title,
            'content' => $title,
            'search_text' => $title,
            'embedding' => $embedding,
            'token_count' => 1,
            'metadata' => [],
            'indexed_at' => now(),
        ]);
    }

    private function publication(array $attributes = []): Publication
    {
        return Publication::create(array_merge([
            'author_id' => User::factory()->create()->id,
            'type' => 'article',
            'status' => 'published',
            'title' => 'Publication',
            'slug' => fake()->slug(),
            'excerpt' => 'Excerpt',
            'reading_time_minutes' => 1,
            'published_at' => now(),
        ], $attributes));
    }

    private function question(array $attributes = []): IssueQuestion
    {
        return IssueQuestion::create(array_merge([
            'author_id' => User::factory()->create()->id,
            'status' => 'published',
            'title' => 'Question',
            'slug' => fake()->slug(),
            'excerpt' => 'Question excerpt',
            'is_solved' => false,
            'views_count' => 0,
            'published_at' => now(),
        ], $attributes));
    }
}
