<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmailIsVerified
{
    /**
     * Endpoints that must remain available for an authenticated but unverified user.
     *
     * @var array<int, string>
     */
    private array $except = [
        'api/me',
        'api/logout',
        'api/email/verification-notification',
        'api/email/verification-status',
    ];

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->hasVerifiedEmail() || $this->isExcepted($request)) {
            return $next($request);
        }

        return response()->json([
            'message' => 'Подтвердите email, чтобы продолжить',
            'code' => 'EMAIL_NOT_VERIFIED',
            'requires_email_verification' => true,
            'email' => $user->email,
        ], 403);
    }
    private function isExcepted(Request $request): bool
    {
        foreach ($this->except as $pattern) {
            if ($request->is($pattern)) {
                return true;
            }
        }

        return false;
    }
}
