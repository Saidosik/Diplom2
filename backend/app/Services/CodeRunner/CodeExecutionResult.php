<?php

namespace App\Services\CodeRunner;

class CodeExecutionResult
{
    public function __construct(
        public readonly string $status,
        public readonly string $stdout = '',
        public readonly string $stderr = '',
        public readonly int $exitCode = 0,
        public readonly int $executionTime = 0,
        public readonly int $memoryUsage = 0,
        public readonly ?string $message = null,
    ) {}

    public function isPassedAgainst(string $expectedOutput): bool
    {
        return $this->status === 'finished'
            && $this->normalize($this->stdout) === $this->normalize($expectedOutput);
    }

    private function normalize(string $value): string
    {
        return trim(str_replace(["\r\n", "\r"], "\n", $value));
    }
}
