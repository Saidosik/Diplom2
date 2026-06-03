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
    private array $allowedProviders = ['google', 'yandex'];

    public function redirectUrl(Request $request, string $provider): JsonResponse
    {
        if (! in_array($provider, $this->allowedProviders, true)) {
            return response()->json([
                'message' => 'Провайдер не поддерживается',
            ], 404);
        }

        $state = $request->query('state');

        $socialite = Socialite::driver($provider)->stateless();

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

    private function findOrCreateUser(string $provider, mixed $socialUser): User
    {
        Log::info("Данные от провайдера [$provider]:", [
            'id'     => $socialUser->getId(),
            'email'  => $socialUser->getEmail(),
            'name'   => $socialUser->getName(),
            'token'  => $socialUser->token,
        ]);
        Log::info("id [$provider]:", [
            'id'     => $socialUser->getId(),
        ]);
        $providerId =  $socialUser->getId();


        $socialAccount = SocialAccount::query()
            ->where('provider', $provider)
            ->where('provider_id', $providerId)
            ->first();

        if ($socialAccount) {
            return $socialAccount->user;
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
}
