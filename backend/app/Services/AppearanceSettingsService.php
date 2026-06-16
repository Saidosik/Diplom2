<?php

namespace App\Services;

use App\Models\AppSetting;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AppearanceSettingsService
{
    public const SETTING_KEY = 'appearance.backgrounds';
    public const CACHE_KEY = 'settings:appearance:backgrounds';

    /**
     * @return array<string, array<string, bool|float|string>>
     */
    public function defaults(): array
    {
        return [
            'auth' => [
                'enabled' => true,
                'effect' => 'aurora',
                'intensity' => 0.82,
                'speed' => 1.5,
                'hueShift' => 0,
                'noiseIntensity' => 0.012,
                'scanlineIntensity' => 0.01,
                'warpAmount' => 0.08,
                'overlayOpacity' => 0.18,
                'gridOpacity' => 0.2,
            ],
            'main' => [
                'enabled' => true,
                'effect' => 'dark-veil',
                'intensity' => 0.1,
                'speed' => 0.18,
                'hueShift' => 118,
                'noiseIntensity' => 0.006,
                'scanlineIntensity' => 0.006,
                'warpAmount' => 0.035,
                'overlayOpacity' => 0.82,
                'gridOpacity' => 0.035,
            ],
            'admin' => [
                'enabled' => true,
                'effect' => 'dark-veil',
                'intensity' => 0.06,
                'speed' => 0.12,
                'hueShift' => 118,
                'noiseIntensity' => 0.004,
                'scanlineIntensity' => 0.004,
                'warpAmount' => 0.025,
                'overlayOpacity' => 0.88,
                'gridOpacity' => 0.02,
            ],
        ];
    }

    /**
     * @return array<string, array<string, bool|float|string>>
     */
    public function get(): array
    {
        $cached = Cache::get(self::CACHE_KEY);

        if (is_array($cached)) {
            $normalized = $this->normalize($cached);
            Cache::forever(self::CACHE_KEY, $normalized);

            return $normalized;
        }

        $setting = AppSetting::query()
            ->where('key', self::SETTING_KEY)
            ->first();

        $normalized = $this->normalize(is_array($setting?->value) ? $setting->value : []);
        Cache::forever(self::CACHE_KEY, $normalized);

        return $normalized;
    }

    /**
     * @param array<string, mixed> $settings
     * @return array<string, array<string, bool|float|string>>
     */
    public function update(array $settings): array
    {
        $normalized = $this->normalize($settings);

        DB::transaction(function () use ($normalized): void {
            AppSetting::query()->updateOrCreate(
                ['key' => self::SETTING_KEY],
                ['value' => $normalized]
            );
        });

        Cache::forever(self::CACHE_KEY, $normalized);

        return $normalized;
    }

    /**
     * @return array<string, array<string, bool|float|string>>
     */
    public function reset(): array
    {
        return $this->update($this->defaults());
    }

    /**
     * @param array<string, mixed> $settings
     * @return array<string, array<string, bool|float|string>>
     */
    public function normalize(array $settings): array
    {
        $defaults = $this->defaults();

        return [
            'auth' => $this->normalizeScope('auth', Arr::get($settings, 'auth', []), $defaults['auth']),
            'main' => $this->normalizeScope('main', Arr::get($settings, 'main', []), $defaults['main']),
            'admin' => $this->normalizeScope('admin', Arr::get($settings, 'admin', []), $defaults['admin']),
        ];
    }

    /**
     * @param mixed $settings
     * @param array<string, bool|float|string> $fallback
     * @return array<string, bool|float|string>
     */
    private function normalizeScope(string $scope, mixed $settings, array $fallback): array
    {
        $source = is_array($settings) ? $settings : [];
        [$overlayMin, $overlayMax] = $this->overlayLimits($scope);
        [$gridMin, $gridMax] = $this->gridLimits($scope);

        return [
            'enabled' => $this->toBool($source['enabled'] ?? null, (bool) $fallback['enabled']),
            'effect' => $this->toEffect($source['effect'] ?? null, (string) $fallback['effect']),
            'intensity' => $this->toFloat($source['intensity'] ?? null, (float) $fallback['intensity'], 0, 1),
            'speed' => $this->toFloat($source['speed'] ?? null, (float) $fallback['speed'], 0, 2),
            'hueShift' => $this->toFloat($source['hueShift'] ?? null, (float) $fallback['hueShift'], -180, 180),
            'noiseIntensity' => $this->toFloat($source['noiseIntensity'] ?? null, (float) $fallback['noiseIntensity'], 0, 0.12),
            'scanlineIntensity' => $this->toFloat($source['scanlineIntensity'] ?? null, (float) $fallback['scanlineIntensity'], 0, 0.14),
            'warpAmount' => $this->toFloat($source['warpAmount'] ?? null, (float) $fallback['warpAmount'], 0, 0.3),
            'overlayOpacity' => $this->toFloat($source['overlayOpacity'] ?? null, (float) $fallback['overlayOpacity'], $overlayMin, $overlayMax),
            'gridOpacity' => $this->toFloat($source['gridOpacity'] ?? null, (float) $fallback['gridOpacity'], $gridMin, $gridMax),
        ];
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

    private function toBool(mixed $value, bool $fallback): bool
    {
        return is_bool($value) ? $value : $fallback;
    }

    private function toEffect(mixed $value, string $fallback): string
    {
        return in_array($value, ['none', 'dark-veil', 'aurora', 'light-rays'], true)
            ? $value
            : $fallback;
    }

    private function toFloat(mixed $value, float $fallback, float $min, float $max): float
    {
        $number = is_numeric($value) ? (float) $value : $fallback;

        return min($max, max($min, $number));
    }
}
