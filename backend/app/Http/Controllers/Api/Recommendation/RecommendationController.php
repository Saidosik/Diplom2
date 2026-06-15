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
        $response = response()->json($recommendations->forRequest($request, $user));

        if ($user) {
            return $response->header('Cache-Control', 'private, no-store');
        }

        return $response->header('Vary', 'Cookie, Authorization');
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
