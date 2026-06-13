<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Contracts\Notifications\Dispatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class AuthRegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_successful_registration_creates_user_and_returns_token_and_user(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/register', $this->validPayload([
            'email' => 'new-user@example.com',
        ]));

        $response->assertCreated()
            ->assertJsonPath('requires_email_verification', true)
            ->assertJsonPath('email', 'new-user@example.com')
            ->assertJsonStructure([
                'token',
                'expires_in',
                'message',
                'user' => ['id', 'name', 'email'],
            ]);

        $user = User::query()->where('email', 'new-user@example.com')->firstOrFail();

        $this->assertNull($user->email_verified_at);
        $this->assertNotNull($user->privacy_policy_accepted_at);
        Notification::assertSentTo($user, VerifyEmailNotification::class);
    }

    public function test_duplicate_email_returns_validation_error(): void
    {
        User::factory()->create(['email' => 'duplicate@example.com']);

        $this->postJson('/api/register', $this->validPayload([
            'email' => 'duplicate@example.com',
        ]))->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_invalid_password_confirmation_returns_validation_error(): void
    {
        $this->postJson('/api/register', $this->validPayload([
            'password_confirmation' => 'different-password',
        ]))->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);
    }

    public function test_missing_required_privacy_acceptance_returns_validation_error(): void
    {
        $payload = $this->validPayload();
        unset($payload['privacy_policy_accepted']);

        $this->postJson('/api/register', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['privacy_policy_accepted']);
    }

    public function test_registration_does_not_return_500_when_email_verification_notification_fails(): void
    {
        Log::spy();

        $dispatcher = Mockery::mock(Dispatcher::class);
        $dispatcher->shouldReceive('send')
            ->once()
            ->andThrow(new RuntimeException('SMTP transport failed'));
        $this->app->instance(Dispatcher::class, $dispatcher);

        $response = $this->postJson('/api/register', $this->validPayload([
            'email' => 'mail-failure@example.com',
        ]));

        $response->assertCreated()
            ->assertJsonStructure(['token', 'user'])
            ->assertJsonPath('email', 'mail-failure@example.com');

        $this->assertDatabaseHas('users', ['email' => 'mail-failure@example.com']);
        Log::shouldHaveReceived('warning')->once();
    }

    /**
     * @param array<string, mixed> $overrides
     * @return array<string, mixed>
     */
    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Ivan Petrov',
            'email' => 'ivan@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'privacy_policy_accepted' => true,
        ], $overrides);
    }
}
