<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

class AuthEmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_creates_unverified_user_and_sends_verification_email(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/register', [
            'name' => 'Ivan Petrov',
            'email' => 'ivan@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'privacy_policy_accepted' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('requires_email_verification', true)
            ->assertJsonPath('email', 'ivan@example.com');

        $user = User::query()->where('email', 'ivan@example.com')->firstOrFail();

        $this->assertNull($user->email_verified_at);
        Notification::assertSentTo($user, VerifyEmailNotification::class);
    }

    public function test_login_with_unverified_email_returns_verification_response(): void
    {
        $user = User::factory()->unverified()->create([
            'email' => 'login@example.com',
            'password' => 'password123',
        ]);

        $this->postJson('/api/login', [
            'email' => 'login@example.com',
            'password' => 'password123',
        ])->assertForbidden()
            ->assertJsonPath('code', 'EMAIL_NOT_VERIFIED')
            ->assertJsonPath('requires_email_verification', true)
            ->assertJsonPath('email', $user->email)
            ->assertJsonStructure(['token']);
    }

    public function test_unverified_user_cannot_open_protected_endpoint(): void
    {
        $user = User::factory()->unverified()->create();

        $this->withToken($this->tokenFor($user))
            ->getJson('/api/me/profile')
            ->assertForbidden()
            ->assertJsonPath('code', 'EMAIL_NOT_VERIFIED');
    }

    public function test_verified_user_can_open_protected_endpoint(): void
    {
        $user = User::factory()->create();

        $this->withToken($this->tokenFor($user))
            ->getJson('/api/me/profile')
            ->assertOk();
    }

    public function test_verification_notification_uses_public_url_branding_and_custom_copy(): void
    {
        Config::set('app.url', 'https://said-diplom.ru');
        Config::set('app.env', 'production');
        Config::set('auth.verification.expire', 10);
        URL::forceRootUrl('https://said-diplom.ru');
        URL::forceScheme('https');

        $user = User::factory()->unverified()->create();
        $mail = (new VerifyEmailNotification())->toMail($user);
        $html = $mail->render();

        $this->assertSame('Подтверждение email на платформе Вектор', $mail->subject);
        $this->assertStringContainsString('https://said-diplom.ru/api/email/verify/' . $user->id . '/', $html);
        $this->assertStringNotContainsString('http://backend' . ':8000', $html);
        $this->assertStringNotContainsString('backend' . ':8000', $html);
        $this->assertStringNotContainsString('localhost', $html);
        $this->assertStringNotContainsString('127.0.0.1', $html);
        $this->assertStringNotContainsString('YOUR_VPS_' . 'IP', $html);
        $this->assertStringNotContainsString('VPS_PUBLIC_' . 'IP', $html);
        $this->assertStringContainsString('команда платформы Вектор', $html);
        $this->assertStringContainsString('Ссылка действительна в течение 10 минут', $html);
        $this->assertStringNotContainsString('Regards' . ', ' . 'Vector', $html);
        $this->assertStringNotContainsString('Regards' . ',', $html);
        $this->assertStringNotContainsString("If you're having trouble clicking", $html);

        preg_match('/https:\/\/said-diplom\.ru\/api\/email\/verify\/[^\s"<>]+/', $html, $matches);
        $this->assertNotEmpty($matches);

        $this->getJson(html_entity_decode($matches[0]))->assertOk()->assertJsonPath('email_verified', true);
    }

    public function test_verification_notification_expiration_is_configured_for_ten_minutes(): void
    {
        Config::set('auth.verification.expire', 10);
        $user = User::factory()->unverified()->create();

        $mail = (new VerifyEmailNotification())->toMail($user);
        $html = html_entity_decode($mail->render());

        preg_match('/[?&]expires=(\d+)/', $html, $matches);
        $this->assertNotEmpty($matches);
        $this->assertEqualsWithDelta(now()->addMinutes(10)->timestamp, (int) $matches[1], 2);
    }

    public function test_resend_verification_email_works_for_unverified_user(): void
    {
        Notification::fake();
        $user = User::factory()->unverified()->create();

        $this->withToken($this->tokenFor($user))
            ->postJson('/api/email/verification-notification')
            ->assertOk()
            ->assertJsonPath('requires_email_verification', true);

        Notification::assertSentTo($user, VerifyEmailNotification::class);
    }

    public function test_signed_verification_link_confirms_email(): void
    {
        $user = User::factory()->unverified()->create();
        $url = $this->verificationUrl($user);

        $this->getJson($url)->assertOk()->assertJsonPath('email_verified', true);

        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_invalid_verification_hash_does_not_confirm_email(): void
    {
        $user = User::factory()->unverified()->create();
        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes((int) config('auth.verification.expire', 10)), [
            'id' => $user->id,
            'hash' => sha1('wrong@example.com'),
        ]);

        $this->getJson($url)->assertForbidden();

        $this->assertNull($user->fresh()->email_verified_at);
    }


    public function test_expired_verification_link_does_not_confirm_email(): void
    {
        $user = User::factory()->unverified()->create();
        $url = URL::temporarySignedRoute('verification.verify', now()->subMinute(), [
            'id' => $user->id,
            'hash' => sha1($user->getEmailForVerification()),
        ]);

        $this->getJson($url)->assertForbidden();

        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_user_cannot_confirm_another_users_email_with_own_hash(): void
    {
        $first = User::factory()->unverified()->create();
        $second = User::factory()->unverified()->create();
        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes((int) config('auth.verification.expire', 10)), [
            'id' => $second->id,
            'hash' => sha1($first->getEmailForVerification()),
        ]);

        $this->getJson($url)->assertForbidden();

        $this->assertNull($second->fresh()->email_verified_at);
    }

    public function test_admin_area_is_unavailable_without_email_verification(): void
    {
        $admin = User::factory()->unverified()->create(['role' => 'admin']);

        $this->withToken($this->tokenFor($admin))
            ->getJson('/api/admin/tags')
            ->assertForbidden()
            ->assertJsonPath('code', 'EMAIL_NOT_VERIFIED');
    }

    private function verificationUrl(User $user): string
    {
        return URL::temporarySignedRoute('verification.verify', now()->addMinutes((int) config('auth.verification.expire', 10)), [
            'id' => $user->id,
            'hash' => sha1($user->getEmailForVerification()),
        ]);
    }

    private function tokenFor(User $user): string
    {
        return JWTAuth::fromUser($user);
    }
}
