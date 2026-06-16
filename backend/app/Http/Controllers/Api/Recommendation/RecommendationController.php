<?php

namespace App\Http\Controllers\Api\Recommendation;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Recommendations\RecommendationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Throwable;

class RecommendationController extends Controller
{
    public function __invoke(Request $request, RecommendationService $recommendations): JsonResponse
    {
        $user = $this->optionalUser($request);
        $guestId = $user ? null : $this->guestIdFromRequest($request);
        $payload = $recommendations->forRequest($request, $user, $guestId);
        $response = response()->json($payload);

        if ($user || ($payload['meta']['strategy'] ?? null) === 'guest_events') {
            return $response->header('Cache-Control', 'private, no-store')->header('Vary', 'Cookie, Authorization');
        }

        return $response->header('Cache-Control', 'public, max-age=60')->header('Vary', 'Cookie, Authorization');
    }

    private function guestIdFromRequest(Request $request): ?string
    {
        $headerGuestId = $request->headers->get('X-Vector-Guest-Id');
        if ($headerGuestId) {
            return (string) $headerGuestId;
        }

        $cookieGuestId = $request->cookie('vector_guest_id');
        if ($cookieGuestId) {
            return (string) $cookieGuestId;
        }

        $cookieHeader = $request->headers->get('cookie', '');
        if (preg_match('/(?:^|;\s*)vector_guest_id=([^;]+)/', $cookieHeader, $matches)) {
            return urldecode($matches[1]);
        }

        return null;
    }

    private function optionalUser(Request $request): ?User
    {
        if (! $request->bearerToken()) {
            return null;
        }

        try {
            $user = JWTAuth::parseToken()->authenticate();
            return $user instanceof User ? $user : null;
        } catch (Throwable) {
            return null;
        }
    }
}
