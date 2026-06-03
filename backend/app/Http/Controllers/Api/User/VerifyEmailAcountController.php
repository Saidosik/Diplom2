<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use App\Models\User;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;

class VerifyEmailAcountController extends Controller
{
    public function verify(Request $request, int $id): JsonResponse
    {

        try {
            if (! $request->hasValidSignature()) {
                return response()->json(['message' => 'Некорректная или просроченная ссылка'], 403);
            }

            $user = User::query()->findOrFail($id);

            if ($user->hasVerifiedEmail()) {
                return response()->json([
                    'message' => 'Упс! Уже верицирован',
                ], status: 400);
            }
            $user->markEmailAsVerified();
            return response()->json([
                'message' => 'Почта подтверждена',
            ]);
        } catch (Exception $e) {
            return response()->json([
                'message' => 'Ошибка',
            ], status: 500);
        }
    }

    public function send(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email уже подтверждён',
            ]);
        }

        $user->sendEmailVerificationNotification();

        return response()->json([
            'message' => 'Письмо для подтверждения email отправлено',
        ]);
    }
}
