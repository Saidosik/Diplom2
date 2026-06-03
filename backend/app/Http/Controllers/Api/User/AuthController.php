<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use App\Http\Resources\User\UserResource;
use App\Models\User;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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
        ]);

        $user->notify(new VerifyEmailNotification());

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
            'user' => UserResource::make($user->load('socialAccounts'))->resolve($request),
        ], 201);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        try {
            if (! $token = JWTAuth::attempt($credentials)) {
                return response()->json([
                    'error' => 'Неверный email или пароль',
                ], 401);
            }
        } catch (JWTException $e) {
            report($e);

            return response()->json([
                'error' => 'Не удалось создать токен',
                'message' => $e->getMessage(),
                'exception' => get_class($e),
            ], 500);
        }
        /** @var User $user */
        $user = auth('api')->user();

        $user->load('socialAccounts');

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
