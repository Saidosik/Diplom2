<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use App\Http\Resources\User\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use PHPOpenSourceSaver\JWTAuth\Exceptions\JWTException;

class AuthController extends Controller
{
    /** @var \App\Models\User $user */
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|min:8|confirmed',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => $request->password,
            'email_verified_at' => null,
        ]);

        $user->sendEmailVerificationNotification();

        try {
            $token = JWTAuth::fromUser($user);
        } catch (JWTException $e) {
            report($e);

            return response()->json([
                'error' => 'Не удалось создать токен',
            ], 500);
        }

        return response()->json([
            'token' => $token,
            'expires_in' => JWTAuth::factory()->getTTL() * 60,
            'requires_email_verification' => true,
            'email' => $user->email,
            'message' => 'Мы отправили письмо для подтверждения email',
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
                'message' => $e->getMessage(),
                'exception' => get_class($e),
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
