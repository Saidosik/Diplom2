<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\AppearanceSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminAppearanceController extends Controller
{
    public function show(AppearanceSettingsService $settings): JsonResponse
    {
        return response()->json([
            'data' => $settings->get(),
        ]);
    }

    public function update(Request $request, AppearanceSettingsService $settings): JsonResponse
    {
        $data = $request->validate($this->rules());
        $updated = $settings->update($data);

        return response()->json([
            'message' => 'Настройки внешнего вида обновлены',
            'data' => $updated,
        ]);
    }

    public function reset(AppearanceSettingsService $settings): JsonResponse
    {
        return response()->json([
            'message' => 'Настройки внешнего вида сброшены',
            'data' => $settings->reset(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(): array
    {
        $rules = [];

        foreach (['auth', 'main', 'admin'] as $scope) {
            $rules[$scope] = ['required', 'array'];
            $rules["{$scope}.enabled"] = ['required', 'boolean'];
            $rules["{$scope}.effect"] = ['required', Rule::in(['none', 'dark-veil', 'aurora', 'light-rays'])];
            $rules["{$scope}.intensity"] = ['required', 'numeric', 'min:0', 'max:1'];
            $rules["{$scope}.speed"] = ['required', 'numeric', 'min:0', 'max:2'];
            $rules["{$scope}.hueShift"] = ['required', 'numeric', 'min:-180', 'max:180'];
            $rules["{$scope}.noiseIntensity"] = ['required', 'numeric', 'min:0', 'max:0.12'];
            $rules["{$scope}.scanlineIntensity"] = ['required', 'numeric', 'min:0', 'max:0.14'];
            $rules["{$scope}.warpAmount"] = ['required', 'numeric', 'min:0', 'max:0.3'];
            [$overlayMin, $overlayMax] = $this->overlayLimits($scope);
            [$gridMin, $gridMax] = $this->gridLimits($scope);

            $rules["{$scope}.overlayOpacity"] = ['required', 'numeric', 'min:' . $overlayMin, 'max:' . $overlayMax];
            $rules["{$scope}.gridOpacity"] = ['required', 'numeric', 'min:' . $gridMin, 'max:' . $gridMax];
        }

        return $rules;
    }
    /**
     * @return array{0: float, 1: float}
     */
    private function overlayLimits(string $scope): array
    {
        return match ($scope) {
            'main' => [0.68, 0.98],
            'admin' => [0.76, 0.98],
            default => [0.0, 0.98],
        };
    }

    /**
     * @return array{0: float, 1: float}
     */
    private function gridLimits(string $scope): array
    {
        return match ($scope) {
            'main' => [0.0, 0.12],
            'admin' => [0.0, 0.08],
            default => [0.0, 0.25],
        };
    }

}
