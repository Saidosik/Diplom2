<?php

namespace App\Support;

class TagColor
{
    public const FALLBACK_COLOR = '#008236';

    public static function normalize(?string $color): string
    {
        $color = trim((string) $color);

        if (preg_match('/^#[0-9a-fA-F]{3}$/', $color) === 1) {
            return '#'.strtolower($color[1].$color[1].$color[2].$color[2].$color[3].$color[3]);
        }

        if (preg_match('/^#[0-9a-fA-F]{6}$/', $color) === 1) {
            return strtolower($color);
        }

        return self::FALLBACK_COLOR;
    }

    public static function contrastRatio(?string $foreground, string $background): float
    {
        $fg = self::relativeLuminance(self::hexToRgb(self::normalize($foreground)));
        $bg = self::relativeLuminance(self::hexToRgb(self::normalize($background)));
        $lighter = max($fg, $bg);
        $darker = min($fg, $bg);

        return round(($lighter + 0.05) / ($darker + 0.05), 2);
    }

    public static function readability(?string $color): array
    {
        $normalized = self::normalize($color);
        // Mirrors globals.css design tokens: --background in :root and .dark.
        $lightRatio = self::contrastRatio($normalized, '#ffffff');
        $darkRatio = self::contrastRatio($normalized, '#0a0a0a');

        return [
            'light' => [
                'ratio' => $lightRatio,
                'status' => self::status($lightRatio),
                'label' => self::label($lightRatio),
            ],
            'dark' => [
                'ratio' => $darkRatio,
                'status' => self::status($darkRatio),
                'label' => self::label($darkRatio),
            ],
        ];
    }

    public static function status(float $ratio): string
    {
        if ($ratio >= 4.5) {
            return 'good';
        }

        if ($ratio >= 3) {
            return 'acceptable';
        }

        return 'poor';
    }

    public static function label(float $ratio): string
    {
        return match (self::status($ratio)) {
            'good' => 'Контраст: хороший',
            'acceptable' => 'Контраст: допустимый',
            default => 'Контраст: низкий',
        };
    }

    private static function hexToRgb(string $hex): array
    {
        $hex = ltrim($hex, '#');

        return [
            'r' => hexdec(substr($hex, 0, 2)),
            'g' => hexdec(substr($hex, 2, 2)),
            'b' => hexdec(substr($hex, 4, 2)),
        ];
    }

    private static function relativeLuminance(array $rgb): float
    {
        $channels = array_map(static function (int $value): float {
            $channel = $value / 255;

            return $channel <= 0.03928
                ? $channel / 12.92
                : (($channel + 0.055) / 1.055) ** 2.4;
        }, $rgb);

        return (0.2126 * $channels['r']) + (0.7152 * $channels['g']) + (0.0722 * $channels['b']);
    }
}
