<?php

namespace App\Services\CodeRunner;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\Process\Exception\ProcessTimedOutException;
use Symfony\Component\Process\Process;


class DockerCodeRunner
{
    public function runSnippet(string $language, string $code, string $stdin = ''): CodeExecutionResult
    {
        return $this->runWithLimits(
            taskId: 'playground',
            language: $language,
            code: $code,
            input: ['stdin' => $stdin],
            timeLimitMs: (int) config('code_runner.default_time_limit_ms'),
            ramLimitMb: (int) config('code_runner.default_memory_limit_mb'),
        );
    }

    /**
     * @param array<string, mixed>|string|int|float|bool|null $input
     */
    public function runWithLimits(string $taskId, string $language, string $code, mixed $input, int $timeLimitMs, int $ramLimitMb): CodeExecutionResult
    {
        $language = $this->normalizeLanguage($language);
        $config = config("code_runner.languages.{$language}");

        if (! $config) {
            throw new RuntimeException("Язык {$language} не поддерживается проверяющей системой.");
        }

        $workDir = storage_path('app/code-runner/' . $taskId . '/' . Str::uuid()->toString());
        File::ensureDirectoryExists($workDir, 0755, true);

        $fileName = $config['file'];
        $sourcePath = $workDir . DIRECTORY_SEPARATOR . $fileName;
        File::put($sourcePath, $this->prepareCode($language, $code));

        $stdin = $this->inputToString($input);
        $timeLimitMs = max(
            200,
            $timeLimitMs,
            (int) ($config['min_time_limit_ms'] ?? 0),
        );
        $ramLimitMb = max(
            32,
            $ramLimitMb,
            (int) ($config['min_memory_limit_mb'] ?? 0),
        );

        if (! $this->dockerImageExists((string) $config['image'])) {
            return new CodeExecutionResult(
                status: 'runtime_error',
                stdout: '',
                stderr: '',
                exitCode: 127,
                executionTime: 0,
                memoryUsage: 0,
                message: 'Docker-образ ' . $config['image'] . ' не найден локально. Скачайте его командой: docker pull ' . $config['image'],
            );
        }

        $dockerCommand = [
            'docker',
            'run',
            '--rm',
            '--pull',
            'never',
            '--network',
            'none',
            '--cap-drop',
            'ALL',
            '--security-opt',
            'no-new-privileges',
            '--cpus',
            (string) config('code_runner.docker.cpus', '0.5'),
            '--memory',
            $ramLimitMb . 'm',
            '--memory-swap',
            $ramLimitMb . 'm',
            '--pids-limit',
            (string) config('code_runner.docker.pids_limit', 64),
            '--read-only',
            '--tmpfs',
            '/tmp:rw,nosuid,nodev,size=' . config('code_runner.docker.tmpfs_size', '512m'),
            '--workdir',
            '/workspace',
            '-v',
            $workDir . ':/workspace:ro',
        ];

        foreach (($config['env'] ?? []) as $key => $value) {
            $dockerCommand[] = '-e';
            $dockerCommand[] = $key . '=' . $value;
        }

        $dockerCommand[] = $config['image'];
        array_push($dockerCommand, ...$config['command']);
        $startedAt = microtime(true);

        try {
            $process = new Process($dockerCommand);
            $process->setInput($stdin);
            $process->setTimeout(($timeLimitMs / 1000) + 8);

            try {
                $process->run();
            } catch (ProcessTimedOutException) {
                if (isset($process) && $process->isRunning()) {
                    $process->stop(0);
                }

                return new CodeExecutionResult(
                    status: 'time_limit_error',
                    stdout: $process->getOutput(),
                    stderr: $process->getErrorOutput(),
                    exitCode: 124,
                    executionTime: (int) round((microtime(true) - $startedAt) * 1000),
                    memoryUsage: 0,
                    message: 'Превышено ограничение по времени выполнения.',
                );
            }

            $executionTime = (int) round((microtime(true) - $startedAt) * 1000);
            $stdout = $this->shortenOutput($process->getOutput());
            $stderr = $this->shortenOutput($process->getErrorOutput());

            if ($executionTime > $timeLimitMs + 8000) {
                return new CodeExecutionResult(
                    status: 'time_limit_error',
                    stdout: $stdout,
                    stderr: $stderr,
                    exitCode: $process->getExitCode() ?? 124,
                    executionTime: $executionTime,
                    memoryUsage: 0,
                    message: 'Превышено ограничение по времени выполнения.',
                );
            }

            if (! $process->isSuccessful()) {
                $errorText = trim($stderr) ?: trim($stdout) ?: 'Код завершился с ошибкой.';

                return new CodeExecutionResult(
                    status: $this->detectErrorStatus($language, $errorText, $process->getExitCode()),
                    stdout: $stdout,
                    stderr: $stderr,
                    exitCode: $process->getExitCode() ?? 1,
                    executionTime: $executionTime,
                    memoryUsage: 0,
                    message: $this->shorten($errorText),
                );
            }

            return new CodeExecutionResult(
                status: 'finished',
                stdout: $stdout,
                stderr: $stderr,
                exitCode: 0,
                executionTime: $executionTime,
                memoryUsage: 0,
            );
        } finally {
            File::deleteDirectory($workDir);
        }
    }


    private function dockerImageExists(string $image): bool
    {
        $process = new Process(['docker', 'image', 'inspect', $image]);
        $process->setTimeout(5);
        $process->run();

        return $process->isSuccessful();
    }

    public function normalizeLanguage(string $language): string
    {
        return match (Str::lower(trim($language))) {
            'js', 'node', 'nodejs', 'javascript' => 'javascript',
            'py', 'python', 'python3' => 'python',
            'php', 'php8' => 'php',
            'c++', 'cpp', 'g++' => 'cpp',
            'cs', 'c#', 'csharp', 'dotnet' => 'csharp',
            default => Str::lower(trim($language)),
        };
    }

    private function prepareCode(string $language, string $code): string
    {
        if ($language === 'php' && ! str_starts_with(ltrim($code), '<?php')) {
            return "<?php\n" . $code;
        }

        return $code;
    }

    /**
     * @param array<string, mixed>|string|int|float|bool|null $input
     */
    private function inputToString(mixed $input): string
    {
        if (is_array($input)) {
            if (array_key_exists('stdin', $input)) {
                return $this->normalizeStdin((string) $input['stdin']);
            }

            if (array_key_exists('value', $input)) {
                return $this->normalizeStdin(
                    is_scalar($input['value'])
                        ? (string) $input['value']
                        : json_encode($input['value'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
                );
            }

            return $this->normalizeStdin(
                json_encode($input, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
            );
        }

        if ($input === null) {
            return '';
        }

        return $this->normalizeStdin((string) $input);
    }

    private function normalizeStdin(string $stdin): string
    {
        return str_replace(
            ['\\r\\n', '\\n', '\\t'],
            ["\n", "\n", "\t"],
            $stdin
        );
    }

    private function detectErrorStatus(string $language, string $errorText, ?int $exitCode): string
    {
        $lower = Str::lower($errorText);

        if (str_contains($lower, 'out of memory') || str_contains($lower, 'cannot allocate memory') || $exitCode === 137) {
            return 'memory_limit_error';
        }

        if ($language === 'cpp' && (str_contains($lower, 'error:') || str_contains($lower, 'undefined reference'))) {
            return 'compilation_error';
        }

        if ($language === 'csharp' && (str_contains($lower, 'error cs') || str_contains($lower, 'build failed'))) {
            return 'compilation_error';
        }

        if (
            str_contains($lower, 'syntaxerror')
            || str_contains($lower, 'syntax error')
            || str_contains($lower, 'parse error')
            || str_contains($lower, 'compilation failed')
        ) {
            return 'compilation_error';
        }

        return 'runtime_error';
    }

    private function shortenOutput(string $value): string
    {
        return Str::limit($value, (int) config('community_security.playground.max_output_chars', 20000));
    }

    private function shorten(string $value): string
    {
        return Str::limit($value, 2500);
    }
}
