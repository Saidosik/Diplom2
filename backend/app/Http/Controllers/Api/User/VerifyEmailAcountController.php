<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use App\Http\Resources\User\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class VerifyEmailAcountController extends Controller
{
    public function verify(Request $request, int $id, string $hash): JsonResponse|RedirectResponse
    {
        /** @var User $user */
        $user = User::query()->findOrFail($id);

        if (! hash_equals($hash, sha1($user->getEmailForVerification()))) {
            return $this->verificationFailed($request, 'Некорректная ссылка подтверждения email', 403);
        }

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Email успешно подтверждён',
                'email_verified' => true,
                'email_verified_at' => $user->email_verified_at?->toISOString(),
            ]);
        }

        return redirect()->away(rtrim(config('app.frontend_url'), '/') . '/auth/email-verified?verified=1');
    }

    public function send(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email уже подтверждён',
                'email_verified' => true,
                'requires_email_verification' => false,
            ]);
        }

        $user->sendEmailVerificationNotification();

        return response()->json([
            'message' => 'Письмо для подтверждения email отправлено повторно',
            'requires_email_verification' => true,
            'email' => $user->email,
        ]);
    }

    public function status(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user()->load('socialAccounts');

        return response()->json([
            'email_verified' => $user->hasVerifiedEmail(),
            'email_verified_at' => $user->email_verified_at?->toISOString(),
            'requires_email_verification' => ! $user->hasVerifiedEmail(),
            'email' => $user->email,
            'user' => UserResource::make($user)->resolve($request),
        ]);
    }

    private function verificationFailed(Request $request, string $message, int $status): JsonResponse|RedirectResponse
    {
        if ($request->expectsJson()) {
            return response()->json(['message' => $message], $status);
        }

        return redirect()->away(rtrim(config('app.frontend_url'), '/') . '/auth/email-verified?verified=0');
    }
}
