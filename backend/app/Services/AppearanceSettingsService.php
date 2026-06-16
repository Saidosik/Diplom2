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
                'intensity' => 0.18,
                'speed' => 0.28,
                'hueShift' => 120,
                'noiseIntensity' => 0.014,
                'scanlineIntensity' => 0.018,
                'warpAmount' => 0.07,
                'overlayOpacity' => 0.84,
                'gridOpacity' => 0.08,
            ],
            'admin' => [
                'enabled' => true,
                'effect' => 'dark-veil',
                'intensity' => 0.1,
                'speed' => 0.16,
                'hueShift' => 120,
                'noiseIntensity' => 0.01,
                'scanlineIntensity' => 0.012,
                'warpAmount' => 0.04,
                'overlayOpacity' => 0.9,
                'gridOpacity' => 0.04,
            ],
        ];
    }

    /**
     * @return array<string, array<string, bool|float|string>>
     */
    public function get(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, function () {
            $setting = AppSetting::query()
                ->where('key', self::SETTING_KEY)
                ->first();

            return $this->normalize(is_array($setting?->value) ? $setting->value : []);
        });
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
            'auth' => $this->normalizeScope(Arr::get($settings, 'auth', []), $defaults['auth']),
            'main' => $this->normalizeScope(Arr::get($settings, 'main', []), $defaults['main']),
            'admin' => $this->normalizeScope(Arr::get($settings, 'admin', []), $defaults['admin']),
        ];
    }

    /**
     * @param mixed $settings
     * @param array<string, bool|float|string> $fallback
     * @return array<string, bool|float|string>
     */
    private function normalizeScope(mixed $settings, array $fallback): array
    {
        $source = is_array($settings) ? $settings : [];

        return [
            'enabled' => $this->toBool($source['enabled'] ?? null, (bool) $fallback['enabled']),
            'effect' => $this->toEffect($source['effect'] ?? null, (string) $fallback['effect']),
            'intensity' => $this->toFloat($source['intensity'] ?? null, (float) $fallback['intensity'], 0, 1),
            'speed' => $this->toFloat($source['speed'] ?? null, (float) $fallback['speed'], 0, 2),
            'hueShift' => $this->toFloat($source['hueShift'] ?? null, (float) $fallback['hueShift'], -180, 180),
            'noiseIntensity' => $this->toFloat($source['noiseIntensity'] ?? null, (float) $fallback['noiseIntensity'], 0, 0.12),
            'scanlineIntensity' => $this->toFloat($source['scanlineIntensity'] ?? null, (float) $fallback['scanlineIntensity'], 0, 0.14),
            'warpAmount' => $this->toFloat($source['warpAmount'] ?? null, (float) $fallback['warpAmount'], 0, 0.3),
            'overlayOpacity' => $this->toFloat($source['overlayOpacity'] ?? null, (float) $fallback['overlayOpacity'], 0, 0.98),
            'gridOpacity' => $this->toFloat($source['gridOpacity'] ?? null, (float) $fallback['gridOpacity'], 0, 0.35),
        ];
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
