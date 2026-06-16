<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AppearanceSettingsService;
use Illuminate\Http\JsonResponse;

class AppearanceController extends Controller
{
    public function __invoke(AppearanceSettingsService $settings): JsonResponse
    {
        return response()->json([
            'data' => $settings->get(),
        ]);
    }
}
