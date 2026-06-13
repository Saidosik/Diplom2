<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use App\Http\Resources\User\UserResource;
use App\Models\SocialAccount;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class SocialAuthController extends Controller
{
    private array $allowedProviders = ['google', 'yandex', 'github'];

    public function redirectUrl(Request $request, string $provider): JsonResponse
    {
        if (! in_array($provider, $this->allowedProviders, true)) {
            return response()->json([
                'message' => 'Провайдер не поддерживается',
            ], 404);
        }

        $state = $request->query('state');

        $socialite = Socialite::driver($provider)->stateless();
        $this->applyProviderScopes($provider, $socialite);

        if ($state) {
            $socialite->with([
                'state' => $state,
            ]);
        }

        return response()->json([
            'url' => $socialite->redirect()->getTargetUrl(),
        ]);
    }

    public function callback(Request $request, string $provider): JsonResponse
    {
        if (! in_array($provider, $this->allowedProviders, true)) {
            return response()->json([
                'message' => 'Провайдер не поддерживается',
            ], 404);
        }

        $driver = Socialite::driver($provider);
        $this->applyProviderScopes($provider, $driver);

        /** @var \Laravel\Socialite\Two\AbstractProvider $driver */
        $socialUser = $driver->stateless()->user();
        $user = $this->findOrCreateUser($provider, $socialUser);

        $token = JWTAuth::fromUser($user);

        return response()->json([
            'token' => $token,
            'expires_in' => JWTAuth::factory()->getTTL() * 60,
            'user' => UserResource::make($user->load('socialAccounts'))->resolve($request),
        ]);
    }

    private function applyProviderScopes(string $provider, mixed $socialite): void
    {
        if ($provider === 'github') {
            $socialite->scopes(['read:user', 'user:email']);
        }
    }

    private function findOrCreateUser(string $provider, mixed $socialUser): User
    {
        Log::info("Данные от провайдера [$provider]:", [
            'id' => $socialUser->getId(),
            'email' => $socialUser->getEmail(),
            'name' => $socialUser->getName(),
            'nickname' => $socialUser->getNickname(),
            'token' => $socialUser->token,
        ]);
        Log::info("id [$provider]:", [
            'id' => $socialUser->getId(),
        ]);

        $providerId = $socialUser->getId();

        $socialAccount = SocialAccount::query()
            ->where('provider', $provider)
            ->where('provider_id', $providerId)
            ->first();

        if ($socialAccount) {
            $user = $socialAccount->user;
            $email = $socialUser->getEmail();

            $socialAccount->update([
                'email' => $email ?: $socialAccount->email,
                'name' => $socialUser->getName() ?: $socialUser->getNickname() ?: $socialAccount->name,
                'avatar' => $socialUser->getAvatar() ?: $socialAccount->avatar,
            ]);
            $this->fillGithubUrl($user, $provider, $socialUser);

            return $user;
        }

        $email = $socialUser->getEmail();

        if (! $email) {
            abort(422, 'Провайдер не вернул email');
        }

        $user = User::query()
            ->where('email', $email)
            ->first();

        if (! $user) {
            $user = User::query()->create([
                'name' => $socialUser->getName()
                    ?: $socialUser->getNickname()
                    ?: Str::before($email, '@'),
                'email' => $email,
                'password' => Hash::make(Str::random(48)),
                'email_verified_at' => now(),
                'avatar' => $socialUser->getAvatar(),
            ]);
        } elseif (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        $this->fillGithubUrl($user, $provider, $socialUser);

        SocialAccount::query()->create([
            'user_id' => $user->id,
            'provider' => $provider,
            'provider_id' => $providerId,
            'email' => $email,
            'name' => $socialUser->getName() ?: $socialUser->getNickname(),
            'avatar' => $socialUser->getAvatar(),
        ]);

        return $user;
    }

    private function fillGithubUrl(User $user, string $provider, mixed $socialUser): void
    {
        if ($provider !== 'github') {
            return;
        }

        $login = $this->sanitizeGithubLogin($socialUser->getNickname());

        if (! $login && is_array($socialUser->user ?? null)) {
            $login = $this->sanitizeGithubLogin($socialUser->user['login'] ?? null);
        }

        if (! $login) {
            return;
        }

        $githubUrl = "https://github.com/{$login}";
        $currentUrl = trim((string) $user->github_url);

        if ($currentUrl === '' || $this->isSameGithubProfileUrl($currentUrl, $login)) {
            $user->forceFill(['github_url' => $githubUrl])->save();
        }
    }

    private function sanitizeGithubLogin(?string $login): ?string
    {
        if (! is_string($login)) {
            return null;
        }

        $login = trim($login);

        return preg_match('/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/', $login) === 1
            ? $login
            : null;
    }

    private function isSameGithubProfileUrl(string $url, string $login): bool
    {
        $parts = parse_url($url);

        if (! is_array($parts)) {
            return false;
        }

        $host = strtolower($parts['host'] ?? '');
        $pathLogin = trim($parts['path'] ?? '', '/');

        return in_array($host, ['github.com', 'www.github.com'], true)
            && strcasecmp($pathLogin, $login) === 0;
    }
}
