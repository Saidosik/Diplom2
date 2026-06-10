<?php

namespace Tests\Feature;

use App\Models\LegalPage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

class LegalPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_without_privacy_policy_acceptance_does_not_create_user(): void
    {
        Notification::fake();

        $this->postJson('/api/register', [
            'name' => 'No Consent',
            'email' => 'no-consent@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['privacy_policy_accepted']);

        $this->assertDatabaseMissing('users', ['email' => 'no-consent@example.com']);
    }

    public function test_registration_with_false_privacy_policy_acceptance_does_not_create_user(): void
    {
        Notification::fake();

        $this->postJson('/api/register', [
            'name' => 'False Consent',
            'email' => 'false-consent@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'privacy_policy_accepted' => false,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['privacy_policy_accepted']);

        $this->assertDatabaseMissing('users', ['email' => 'false-consent@example.com']);
    }

    public function test_registration_with_privacy_policy_acceptance_creates_user_and_audit_timestamp(): void
    {
        Notification::fake();
        $page = LegalPage::query()->create([
            'slug' => LegalPage::PRIVACY_POLICY_SLUG,
            'title' => 'Политика конфиденциальности данных',
            'content' => 'Текст политики',
            'is_published' => true,
        ]);

        $this->postJson('/api/register', [
            'name' => 'With Consent',
            'email' => 'with-consent@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'privacy_policy_accepted' => true,
        ])->assertCreated()
            ->assertJsonPath('requires_email_verification', true);

        $user = User::query()->where('email', 'with-consent@example.com')->firstOrFail();

        $this->assertNotNull($user->privacy_policy_accepted_at);
        $this->assertTrue($user->privacy_policy_page_updated_at?->equalTo($page->updated_at) ?? false);
    }

    public function test_public_privacy_policy_endpoint_is_available_for_guest(): void
    {
        LegalPage::query()->create([
            'slug' => LegalPage::PRIVACY_POLICY_SLUG,
            'title' => 'Политика конфиденциальности данных',
            'content' => 'Публичный текст политики',
            'is_published' => true,
        ]);

        $this->getJson('/api/legal/privacy-policy')
            ->assertOk()
            ->assertJsonPath('slug', LegalPage::PRIVACY_POLICY_SLUG)
            ->assertJsonPath('title', 'Политика конфиденциальности данных')
            ->assertJsonPath('content', 'Публичный текст политики');
    }

    public function test_unpublished_privacy_policy_is_not_publicly_available(): void
    {
        LegalPage::query()->create([
            'slug' => LegalPage::PRIVACY_POLICY_SLUG,
            'title' => 'Политика конфиденциальности данных',
            'content' => 'Скрытый текст политики',
            'is_published' => false,
        ]);

        $this->getJson('/api/legal/privacy-policy')->assertNotFound();
    }

    public function test_guest_cannot_edit_privacy_policy(): void
    {
        $this->putJson('/api/admin/legal-pages/privacy-policy', [
            'title' => 'Новый заголовок',
            'content' => 'Новый текст',
            'is_published' => true,
        ])->assertUnauthorized();
    }

    public function test_regular_user_cannot_edit_privacy_policy(): void
    {
        LegalPage::query()->create([
            'slug' => LegalPage::PRIVACY_POLICY_SLUG,
            'title' => 'Политика конфиденциальности данных',
            'content' => 'Текст политики',
            'is_published' => true,
        ]);
        $user = User::factory()->create(['role' => 'user']);

        $this->withToken($this->tokenFor($user))
            ->putJson('/api/admin/legal-pages/privacy-policy', [
                'title' => 'Новый заголовок',
                'content' => 'Новый текст',
                'is_published' => true,
            ])->assertForbidden();
    }

    public function test_admin_can_load_and_update_privacy_policy(): void
    {
        LegalPage::query()->create([
            'slug' => LegalPage::PRIVACY_POLICY_SLUG,
            'title' => 'Политика конфиденциальности данных',
            'content' => 'Старый текст',
            'is_published' => true,
        ]);
        $admin = User::factory()->create(['role' => 'admin']);

        $this->withToken($this->tokenFor($admin))
            ->getJson('/api/admin/legal-pages/privacy-policy')
            ->assertOk()
            ->assertJsonPath('data.content', 'Старый текст');

        $this->withToken($this->tokenFor($admin))
            ->putJson('/api/admin/legal-pages/privacy-policy', [
                'title' => 'Обновлённая политика',
                'content' => 'Обновлённый текст',
                'is_published' => false,
            ])->assertOk()
            ->assertJsonPath('message', 'Политика конфиденциальности обновлена')
            ->assertJsonPath('data.title', 'Обновлённая политика')
            ->assertJsonPath('data.content', 'Обновлённый текст')
            ->assertJsonPath('data.is_published', false);
    }

    private function tokenFor(User $user): string
    {
        return JWTAuth::fromUser($user);
    }
}
