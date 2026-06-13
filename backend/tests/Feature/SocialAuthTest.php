<?php

namespace Tests\Feature;

use App\Models\SocialAccount;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

class SocialAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_github_provider_is_accepted_for_redirect_url(): void
    {
        $provider = Mockery::mock();
        $redirect = Mockery::mock();

        Socialite::shouldReceive('driver')->once()->with('github')->andReturn($provider);
        $provider->shouldReceive('stateless')->once()->andReturnSelf();
        $provider->shouldReceive('scopes')->once()->with(['read:user', 'user:email'])->andReturnSelf();
        $provider->shouldReceive('with')->once()->with(['state' => 'state-token'])->andReturnSelf();
        $provider->shouldReceive('redirect')->once()->andReturn($redirect);
        $redirect->shouldReceive('getTargetUrl')->once()->andReturn('https://github.com/login/oauth/authorize');

        $this->getJson('/api/oauth/github/redirect-url?state=state-token')
            ->assertOk()
            ->assertJsonPath('url', 'https://github.com/login/oauth/authorize');
    }

    public function test_unsupported_provider_is_rejected(): void
    {
        $this->getJson('/api/oauth/unsupported/redirect-url')->assertNotFound();
        $this->getJson('/api/oauth/unsupported/callback')->assertNotFound();
    }

    public function test_github_oauth_creates_user_social_account_issues_jwt_and_fills_github_url(): void
    {
        $this->mockGithubCallbackUser('octocat@example.com', 'octocat');

        $response = $this->getJson('/api/oauth/github/callback?code=github-code')
            ->assertOk()
            ->assertJsonStructure(['token', 'expires_in', 'user' => ['id', 'email', 'github_url']]);

        $token = $response->json('token');
        $this->assertNotEmpty($token);
        $this->assertInstanceOf(User::class, JWTAuth::setToken($token)->authenticate());

        $this->assertDatabaseHas('users', [
            'email' => 'octocat@example.com',
            'github_url' => 'https://github.com/octocat',
        ]);
        $this->assertDatabaseHas('social_accounts', [
            'provider' => 'github',
            'provider_id' => 'github-123',
            'email' => 'octocat@example.com',
        ]);
    }

    public function test_github_oauth_links_existing_user_and_preserves_manual_non_github_url(): void
    {
        $user = User::factory()->create([
            'email' => 'existing@example.com',
            'github_url' => 'https://example.com/custom-profile',
            'email_verified_at' => null,
        ]);

        $this->mockGithubCallbackUser('existing@example.com', 'octocat');

        $this->getJson('/api/oauth/github/callback?code=github-code')->assertOk();

        $user->refresh();
        $this->assertTrue($user->hasVerifiedEmail());
        $this->assertSame('https://example.com/custom-profile', $user->github_url);
        $this->assertDatabaseHas('social_accounts', [
            'user_id' => $user->id,
            'provider' => 'github',
            'provider_id' => 'github-123',
        ]);
    }

    public function test_github_oauth_updates_existing_same_github_url(): void
    {
        $user = User::factory()->create([
            'email' => 'same@example.com',
            'github_url' => 'https://www.github.com/OctoCat',
        ]);
        SocialAccount::query()->create([
            'user_id' => $user->id,
            'provider' => 'github',
            'provider_id' => 'github-123',
            'email' => 'same@example.com',
        ]);

        $this->mockGithubCallbackUser('same@example.com', 'octocat');

        $this->getJson('/api/oauth/github/callback?code=github-code')->assertOk();

        $this->assertSame('https://github.com/octocat', $user->refresh()->github_url);
    }

    public function test_github_oauth_requires_email(): void
    {
        $this->mockGithubCallbackUser(null, 'octocat');

        $this->getJson('/api/oauth/github/callback?code=github-code')->assertUnprocessable();
    }

    private function mockGithubCallbackUser(?string $email, string $nickname): void
    {
        $socialUser = new SocialiteUser();
        $socialUser->id = 'github-123';
        $socialUser->email = $email;
        $socialUser->name = 'Octo Cat';
        $socialUser->nickname = $nickname;
        $socialUser->avatar = 'https://avatars.githubusercontent.com/u/583231?v=4';
        $socialUser->token = 'provider-token';
        $socialUser->user = ['login' => $nickname];

        $provider = Mockery::mock();
        Socialite::shouldReceive('driver')->once()->with('github')->andReturn($provider);
        $provider->shouldReceive('scopes')->once()->with(['read:user', 'user:email'])->andReturnSelf();
        $provider->shouldReceive('stateless')->once()->andReturnSelf();
        $provider->shouldReceive('user')->once()->andReturn($socialUser);
    }
}
