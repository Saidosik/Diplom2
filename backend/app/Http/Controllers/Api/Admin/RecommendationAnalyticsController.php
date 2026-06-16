<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\Recommendations\RecommendationAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RecommendationAnalyticsController extends Controller
{
    public function __invoke(Request $request, RecommendationAnalyticsService $analytics): JsonResponse
    {
        return response()->json($analytics->analytics((string) $request->query('period', 'week')));
    }
}
