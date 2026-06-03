<?php

namespace App\Services\Ai;

use Illuminate\Support\Str;

class EmbeddingService
{
    public function __construct(private readonly AiSdkService $sdk)
    {
    }

    /**
     * @return array<int, float>
     */
    public function embed(string $text): array
    {
        $sdk = $this->sdk->embeddings([$text]);

        if (is_array($sdk) && isset($sdk[0]) && is_array($sdk[0])) {
            return $this->padOrTrim($sdk[0]);
        }

        if (! (bool) config('ai.embeddings.fallback_to_local', true)) {
            return array_fill(0, $this->dimensions(), 0.0);
        }

        return $this->localEmbedding($text);
    }

    /**
     * @param array<int, float|int|string>|null $left
     * @param array<int, float|int|string>|null $right
     */
    public function cosine(?array $left, ?array $right): float
    {
        if (! $left || ! $right) {
            return 0.0;
        }

        $max = min(count($left), count($right));
        $dot = 0.0;
        $leftNorm = 0.0;
        $rightNorm = 0.0;

        for ($i = 0; $i < $max; $i++) {
            $a = (float) $left[$i];
            $b = (float) $right[$i];
            $dot += $a * $b;
            $leftNorm += $a * $a;
            $rightNorm += $b * $b;
        }

        if ($leftNorm <= 0.0 || $rightNorm <= 0.0) {
            return 0.0;
        }

        return $dot / (sqrt($leftNorm) * sqrt($rightNorm));
    }

    public function tokenCount(string $text): int
    {
        return count($this->tokens($text));
    }

    public function dimensions(): int
    {
        return max(32, (int) config('ai.embeddings.dimensions', 1536));
    }

    /**
     * @return array<int, float>
     */
    private function localEmbedding(string $text): array
    {
        $tokens = $this->tokens($text);
        $vector = array_fill(0, $this->dimensions(), 0.0);

        foreach ($tokens as $token) {
            $weight = 1.0 + min(mb_strlen($token), 20) / 20;
            $hash = sprintf('%u', crc32($token));
            $index = ((int) $hash) % $this->dimensions();
            $vector[$index] += $weight;

            foreach ($this->ngrams($token) as $ngram) {
                $ngramHash = sprintf('%u', crc32('ng:' . $ngram));
                $ngramIndex = ((int) $ngramHash) % $this->dimensions();
                $vector[$ngramIndex] += 0.25;
            }
        }

        return $this->normalize($vector);
    }

    /**
     * @return array<int, string>
     */
    private function tokens(string $text): array
    {
        $text = Str::lower(strip_tags($text));
        preg_match_all('/[a-zа-яё0-9][a-zа-яё0-9_+#.-]{1,}/iu', $text, $matches);

        $stop = [
            'как', 'что', 'это', 'для', 'или', 'при', 'если', 'the', 'and', 'with', 'без', 'мне', 'надо', 'нужно',
            'почему', 'ошибка', 'есть', 'где', 'там', 'так', 'его', 'она', 'они', 'мой', 'моя', 'про', 'над', 'под',
            'from', 'that', 'this', 'into', 'over', 'http', 'https', 'www',
        ];

        return collect($matches[0] ?? [])
            ->map(fn (string $token) => trim($token, '.,:;()[]{}<>"\''))
            ->filter(fn (string $token) => mb_strlen($token) >= 2 && ! in_array($token, $stop, true))
            ->take(800)
            ->values()
            ->all();
    }

    /**
     * @return array<int, string>
     */
    private function ngrams(string $token): array
    {
        $length = mb_strlen($token);

        if ($length < 4) {
            return [];
        }

        $grams = [];
        for ($i = 0; $i <= $length - 3; $i++) {
            $grams[] = mb_substr($token, $i, 3);
        }

        return $grams;
    }

    /**
     * @param array<int, float|int|string> $vector
     * @return array<int, float>
     */
    private function padOrTrim(array $vector): array
    {
        $vector = array_map(fn ($value) => (float) $value, $vector);
        $dimensions = $this->dimensions();

        if (count($vector) > $dimensions) {
            return array_slice($vector, 0, $dimensions);
        }

        while (count($vector) < $dimensions) {
            $vector[] = 0.0;
        }

        return $vector;
    }

    /**
     * @param array<int, float> $vector
     * @return array<int, float>
     */
    private function normalize(array $vector): array
    {
        $sum = array_reduce($vector, fn (float $carry, float $value) => $carry + $value * $value, 0.0);
        $norm = sqrt($sum);

        if ($norm <= 0.0) {
            return $vector;
        }

        return array_map(fn (float $value) => round($value / $norm, 6), $vector);
    }
}
