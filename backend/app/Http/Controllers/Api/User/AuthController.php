<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\RegisterRequest;
use App\Http\Resources\User\UserResource;
use App\Models\LegalPage;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use PHPOpenSourceSaver\JWTAuth\Exceptions\JWTException;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Throwable;

class AuthController extends Controller
{
    /** @var \App\Models\User $user */
    public function register(RegisterRequest $request)
    {
        $validated = $request->validated();

        $user = DB::transaction(function () use ($validated) {
            return User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $validated['password'],
                'email_verified_at' => null,
                'privacy_policy_accepted_at' => now(),
                'privacy_policy_page_updated_at' => LegalPage::query()
                    ->where('slug', LegalPage::PRIVACY_POLICY_SLUG)
                    ->value('updated_at'),
            ]);
        });

        try {
            $token = JWTAuth::fromUser($user);
        } catch (JWTException $e) {
            report($e);

            return response()->json([
                'error' => 'Не удалось создать токен',
            ], 500);
        }

        $verificationNotificationSent = true;

        try {
            $user->sendEmailVerificationNotification();
        } catch (Throwable $e) {
            $verificationNotificationSent = false;

            Log::warning('Email verification notification failed during registration.', [
                'user_id' => $user->getKey(),
                'email' => $user->email,
                'exception' => get_class($e),
                'message' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'token' => $token,
            'expires_in' => JWTAuth::factory()->getTTL() * 60,
            'requires_email_verification' => true,
            'email' => $user->email,
            'message' => $verificationNotificationSent
                ? 'Мы отправили письмо для подтверждения email'
                : 'Регистрация завершена. Не удалось отправить письмо подтверждения, попробуйте запросить его позже.',
            'user' => UserResource::make($user->load('socialAccounts'))->resolve($request),
        ], 201);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        /** @var User|null $user */
        $user = User::query()->where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'error' => 'Неверный email или пароль',
                'message' => 'Неверный email или пароль',
            ], 401);
        }

        try {
            $token = JWTAuth::fromUser($user);
        } catch (JWTException $e) {
            report($e);

            return response()->json([
                'error' => 'Не удалось создать токен',
                'message' => 'Не удалось создать токен',
            ], 500);
        }

        $user->load('socialAccounts');

        if (! $user->hasVerifiedEmail()) {
            return response()->json([
                'token' => $token,
                'expires_in' => JWTAuth::factory()->getTTL() * 60,
                'code' => 'EMAIL_NOT_VERIFIED',
                'requires_email_verification' => true,
                'email' => $user->email,
                'message' => 'Подтвердите email, чтобы продолжить',
                'user' => UserResource::make($user)->resolve($request),
            ], 403);
        }

        return response()->json([
            'token' => $token,
            'expires_in' => JWTAuth::factory()->getTTL() * 60,
            'user' => UserResource::make($user)->resolve($request),
        ]);
    }

    public function logout()
    {
        try {
            JWTAuth::invalidate(JWTAuth::getToken());
        } catch (JWTException $e) {
            report($e);

            return response()->json([
                'error' => 'Ошибка при выходе из системы',
            ], 500);
        }

        return response()->json([
            'message' => 'Успешный выход из аккаунта',
        ]);
    }

    public function me(Request $request)
    {
        return new UserResource($request->user()->load('socialAccounts'));
    }

    public function refresh()
    {
        $newToken = JWTAuth::parseToken()->refresh();

        return response()->json([
            'access_token' => $newToken,
            'token_type' => 'bearer',
            'expires_in' => JWTAuth::factory()->getTTL() * 60,
        ]);
    }
}
