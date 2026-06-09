<?php

namespace Tests\Feature;

use App\Enums\IssueQuestionStatus;
use App\Enums\PublicationStatus;
use App\Enums\PublicationType;
use App\Models\IssueQuestion;
use App\Models\Publication;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

class AdminTagsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_tag_with_valid_hex_color(): void
    {
        $response = $this->withTokenFor('admin')->postJson('/api/admin/tags', [
            'name' => 'Laravel',
            'slug' => 'laravel',
            'color' => '#ffcc00',
            'description' => 'Backend framework',
            'is_active' => true,
        ]);

        $response->assertCreated()->assertJsonPath('data.slug', 'laravel');
        $this->assertDatabaseHas('tags', ['slug' => 'laravel', 'color' => '#ffcc00', 'status' => 'active']);
    }

    public function test_moderator_can_update_but_cannot_delete_tag(): void
    {
        $tag = Tag::query()->create(['name' => 'Old', 'slug' => 'old', 'color' => '#38bdf8', 'status' => 'active']);

        $this->withTokenFor('moderator')->patchJson("/api/admin/tags/{$tag->id}", [
            'name' => 'New',
            'slug' => 'new',
            'color' => '#22c55e',
            'is_active' => false,
        ])->assertOk()->assertJsonPath('data.is_active', false);

        $this->withTokenFor('moderator')->deleteJson("/api/admin/tags/{$tag->id}")->assertForbidden();
    }

    public function test_user_and_guest_cannot_access_admin_tags(): void
    {
        $this->getJson('/api/admin/tags')->assertUnauthorized();
        $this->withTokenFor('user')->getJson('/api/admin/tags')->assertForbidden();
    }

    public function test_slug_is_unique_and_color_is_validated(): void
    {
        Tag::query()->create(['name' => 'Laravel', 'slug' => 'laravel', 'color' => '#38bdf8', 'status' => 'active']);

        $this->withTokenFor('admin')->postJson('/api/admin/tags', [
            'name' => 'Duplicate',
            'slug' => 'laravel',
            'color' => 'blue',
        ])->assertUnprocessable()->assertJsonValidationErrors(['slug', 'color']);
    }

    public function test_linked_tag_is_not_deleted_silently(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $tag = Tag::query()->create(['name' => 'Used', 'slug' => 'used', 'color' => '#38bdf8', 'status' => 'active']);
        $publication = Publication::query()->create([
            'author_id' => $admin->id,
            'type' => PublicationType::Article->value,
            'title' => 'Article',
            'slug' => 'article',
            'status' => PublicationStatus::Published->value,
        ]);
        $publication->tags()->attach($tag->id);

        $this->withToken($this->tokenFor($admin))->deleteJson("/api/admin/tags/{$tag->id}")->assertStatus(409);
        $this->assertDatabaseHas('tags', ['id' => $tag->id]);
    }

    private function withTokenFor(string $role): self
    {
        $user = User::factory()->create(['role' => $role]);

        return $this->withToken($this->tokenFor($user));
    }

    private function tokenFor(User $user): string
    {
        return JWTAuth::fromUser($user);
    }
}
