<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->isStaff()) {
            return response()->json([
                'message' => 'Доступ разрешён только администраторам и модераторам.',
            ], 403);
        }

        return $next($request);
    }
}
