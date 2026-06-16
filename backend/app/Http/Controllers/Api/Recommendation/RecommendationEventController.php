<?php

namespace App\Http\Controllers\Api\Recommendation;

use App\Http\Controllers\Controller;
use App\Models\RecommendationEvent;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Throwable;

class RecommendationEventController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'event_type' => ['required', 'string', Rule::in(RecommendationEvent::eventTypes())],
            'target_type' => ['nullable', 'string', Rule::in(RecommendationEvent::targetTypes())],
            'target_id' => ['nullable', 'integer'],
            'context' => ['nullable', 'string', 'max:80'],
            'metadata' => ['nullable', 'array'],
        ]);

        $validated = $validator->validate();
        $user = $this->optionalUser($request);
        $guestId = $user ? null : (string) ($this->guestIdFromRequest($request) ?: Str::uuid());

        RecommendationEvent::create([
            'user_id' => $user?->id,
            'guest_id' => $guestId,
            'event_type' => $validated['event_type'],
            'target_type' => $validated['target_type'] ?? '',
            'target_id' => $validated['target_id'] ?? null,
            'context' => $validated['context'] ?? null,
            'metadata' => $validated['metadata'] ?? null,
            'weight' => RecommendationEvent::weightFor($validated['event_type']),
            'ip_hash' => $request->ip() ? hash('sha256', $request->ip()) : null,
            'user_agent_hash' => $request->userAgent() ? hash('sha256', $request->userAgent()) : null,
        ]);

        $response = response()->json(['ok' => true])->header('Cache-Control', 'no-store');

        if (! $user) {
            $response->withCookie(cookie(
                'vector_guest_id',
                $guestId,
                60 * 24 * 30,
                '/',
                null,
                app()->environment('production'),
                true,
                false,
                'lax',
            ));
        }

        return $response;
    }

    private function guestIdFromRequest(Request $request): ?string
    {
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
