<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\Rule;

class AdminLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'level' => ['nullable', Rule::in(['all', 'debug', 'info', 'notice', 'warning', 'error', 'critical', 'alert', 'emergency'])],
            'q' => ['nullable', 'string', 'max:120'],
            'lines' => ['nullable', 'integer', 'min:50', 'max:1000'],
        ]);

        $path = storage_path('logs/laravel.log');

        if (! File::exists($path)) {
            return response()->json([
                'data' => [],
                'meta' => [
                    'path' => 'storage/logs/laravel.log',
                    'size' => 0,
                    'updated_at' => null,
                ],
            ]);
        }

        $lines = $this->tail($path, (int) ($validated['lines'] ?? 300));
        $level = strtolower((string) ($validated['level'] ?? 'all'));
        $search = trim((string) ($validated['q'] ?? ''));

        $items = collect($lines)
            ->map(fn (string $line, int $index) => $this->parseLine($line, $index + 1))
            ->filter(function (array $item) use ($level, $search) {
                if ($level !== 'all' && strtolower((string) $item['level']) !== $level) {
                    return false;
                }

                if ($search !== '' && mb_stripos($item['message'], $search) === false) {
                    return false;
                }

                return true;
            })
            ->values();

        return response()->json([
            'data' => $items,
            'meta' => [
                'path' => 'storage/logs/laravel.log',
                'size' => File::size($path),
                'updated_at' => Carbon::createFromTimestamp(File::lastModified($path))->toISOString(),
                'returned' => $items->count(),
            ],
        ]);
    }

    /**
     * @return array<int, string>
     */
    private function tail(string $path, int $lines): array
    {
        $content = File::get($path);
        $allLines = preg_split('/\R/', $content) ?: [];

        return array_values(array_filter(array_slice($allLines, -$lines), fn (string $line) => trim($line) !== ''));
    }

    private function parseLine(string $line, int $lineNumber): array
    {
        $level = 'unknown';
        $datetime = null;
        $message = $line;

        if (preg_match('/^\[(?<date>[^\]]+)]\s+(?<env>\w+)\.(?<level>\w+):\s+(?<message>.*)$/', $line, $matches)) {
            $level = strtolower($matches['level']);
            $datetime = $matches['date'];
            $message = $matches['message'];
        }

        return [
            'line' => $lineNumber,
            'level' => $level,
            'datetime' => $datetime,
            'message' => $message,
            'raw' => $line,
        ];
    }
}
