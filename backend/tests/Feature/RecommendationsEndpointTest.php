<?php

namespace Tests\Feature;

use App\Models\IssueQuestion;
use App\Models\Publication;
use App\Models\Reaction;
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
