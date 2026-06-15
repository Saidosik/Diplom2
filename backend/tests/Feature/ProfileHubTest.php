<?php

namespace Tests\Feature;

use App\Enums\PublicationStatus;
use App\Models\FriendRequest;
use App\Models\Friendship;
use App\Models\PinnedItem;
use App\Models\Publication;
use App\Models\Subscription;
use App\Models\User;
use App\Models\UserFile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

class ProfileHubTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_profile_dashboard_is_available_to_guest(): void
    {
        $user = User::factory()->create(['username' => 'public-user', 'headline' => 'Developer']);

        $this->getJson("/api/users/{$user->id}/profile/dashboard")
            ->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.username', 'public-user')
            ->assertJsonStructure(['user', 'stats', 'relation_state', 'pins', 'previews']);
    }

    public function test_owner_sees_owner_specific_relation_state(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);

        $this->withToken(JWTAuth::fromUser($user))->getJson('/api/me/profile/dashboard')
            ->assertOk()
            ->assertJsonPath('relation_state.is_owner', true)
            ->assertJsonPath('relation_state.can_message', false);
    }

    public function test_guest_does_not_see_private_files_or_hidden_file_preview(): void
    {
        $user = User::factory()->create(['show_files_publicly' => false]);
        UserFile::create(['user_id' => $user->id, 'title' => 'Private', 'original_name' => 'private.txt', 'mime_type' => 'text/plain', 'size' => 10, 'disk' => 'local', 'path' => 'x', 'kind' => 'text', 'visibility' => 'private']);

        $this->getJson("/api/users/{$user->id}/profile/dashboard")
            ->assertOk()
            ->assertJsonPath('files', [])
            ->assertJsonPath('previews.files_preview', []);
    }

    public function test_pins_are_displayed_and_limited(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $publication = $this->publication($user, 'first-pin');

        $this->withToken(JWTAuth::fromUser($user))->postJson('/api/me/profile/pins', ['pinnable_type' => 'publication', 'pinnable_id' => $publication->id, 'position' => 1])
            ->assertCreated()
            ->assertJsonPath('data.type', 'publication');

        $this->getJson("/api/users/{$user->id}/profile/dashboard")
            ->assertOk()
            ->assertJsonPath('pins.0.id', $publication->id);

        for ($i = 2; $i <= 5; $i++) {
            $next = $this->publication($user, "pin-{$i}");
            PinnedItem::create(['user_id' => $user->id, 'pinnable_type' => $next->getMorphClass(), 'pinnable_id' => $next->id, 'position' => $i, 'visibility' => 'public']);
        }

        $overflow = $this->publication($user, 'pin-overflow');
        $this->withToken(JWTAuth::fromUser($user))->postJson('/api/me/profile/pins', ['pinnable_type' => 'publication', 'pinnable_id' => $overflow->id])
            ->assertUnprocessable();
    }

    public function test_user_cannot_pin_unavailable_material(): void
    {
        $owner = User::factory()->create(['email_verified_at' => now()]);
        $other = User::factory()->create();
        $publication = $this->publication($other, 'not-mine');

        $this->withToken(JWTAuth::fromUser($owner))->postJson('/api/me/profile/pins', ['pinnable_type' => 'publication', 'pinnable_id' => $publication->id])
            ->assertNotFound();
    }

    public function test_relation_state_contains_friend_request_and_subscription_state(): void
    {
        $viewer = User::factory()->create(['email_verified_at' => now()]);
        $target = User::factory()->create();
        $friend = User::factory()->create();
        Friendship::create(['user_one_id' => $viewer->id, 'user_two_id' => $friend->id]);
        Friendship::create(['user_one_id' => $target->id, 'user_two_id' => $friend->id]);
        $request = FriendRequest::create(['sender_id' => $viewer->id, 'recipient_id' => $target->id, 'status' => FriendRequest::STATUS_PENDING]);
        Subscription::create(['user_id' => $viewer->id, 'subscribable_type' => User::class, 'subscribable_id' => $target->id]);

        $this->withToken(JWTAuth::fromUser($viewer))->getJson("/api/users/{$target->id}/profile/dashboard")
            ->assertOk()
            ->assertJsonPath('relation_state.is_subscribed', true)
            ->assertJsonPath('relation_state.outgoing_friend_request_id', $request->id)
            ->assertJsonPath('relation_state.mutual_friends_count', 1);
    }

    private function publication(User $user, string $slug): Publication
    {
        return Publication::create(['author_id' => $user->id, 'type' => 'post', 'status' => PublicationStatus::Published->value, 'title' => ucfirst($slug), 'slug' => $slug, 'excerpt' => 'Excerpt', 'published_at' => now()]);
    }
}
