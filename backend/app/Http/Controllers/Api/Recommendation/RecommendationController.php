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
        $fallback = false;

        try {
            $payload = $recommendations->forRequest($request, $user, $guestId);
        } catch (Throwable $exception) {
            report($exception);
            $fallback = true;
            $payload = $this->fallbackPayload($request, $recommendations, $guestId, 'personalized_recommendations_failed');
        }

        $response = response()->json($payload);

        if ($user || $fallback || ($payload['meta']['strategy'] ?? null) === 'guest_events') {
            return $response
                ->header('Cache-Control', 'private, no-store, max-age=0, must-revalidate')
                ->header('Pragma', 'no-cache')
                ->header('Expires', '0')
                ->header('Vary', 'Cookie, Authorization');
        }

        return $response->header('Cache-Control', 'public, max-age=60')->header('Vary', 'Cookie, Authorization');
    }

    /** @return array<string,mixed> */
    private function fallbackPayload(Request $request, RecommendationService $recommendations, ?string $guestId, string $reason): array
    {
        try {
            return $this->withFallbackMeta(
                $recommendations->forRequest($request, null, $guestId),
                $reason,
            );
        } catch (Throwable $exception) {
            report($exception);

            return $this->withFallbackMeta([
                'mode' => 'guest',
                'data' => [],
                'meta' => [
                    'period' => $recommendations->period($request),
                    'personalized' => false,
                    'matched_tags' => [],
                    'followed_authors_count' => 0,
                    'signals_count' => 0,
                    'strategy' => 'guest_trending',
                ],
            ], $reason . '_empty');
        }
    }

    /** @param array<string,mixed> $payload @return array<string,mixed> */
    private function withFallbackMeta(array $payload, string $reason): array
    {
        $payload['mode'] = $payload['mode'] ?? 'guest';
        $payload['meta'] = array_merge($payload['meta'] ?? [], [
            'fallback' => true,
            'fallback_reason' => $reason,
            'personalized' => false,
        ]);

        return $payload;
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
