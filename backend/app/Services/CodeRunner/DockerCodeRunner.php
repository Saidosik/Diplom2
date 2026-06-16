<?php

namespace App\Services\CodeRunner;

use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\Process\Exception\ProcessTimedOutException;
use Symfony\Component\Process\Process;
use Throwable;


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

        $fileName = (string) $config['file'];
        $source = $this->prepareCode($language, $code);
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

        if ($dockerError = $this->dockerAvailabilityError()) {
            return new CodeExecutionResult(
                status: 'runtime_error',
                stdout: '',
                stderr: $dockerError,
                exitCode: 127,
                executionTime: 0,
                memoryUsage: 0,
                message: $dockerError,
            );
        }

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
            '--tmpfs',
            '/workspace:rw,nosuid,nodev,size=' . config('code_runner.docker.workspace_tmpfs_size', '16m'),
            '--workdir',
            '/workspace',
            '-i',
            '-e',
            'CODE_RUNNER_SOURCE_B64=' . base64_encode($source),
        ];

        foreach (($config['env'] ?? []) as $key => $value) {
            $dockerCommand[] = '-e';
            $dockerCommand[] = $key . '=' . $value;
        }

        $dockerCommand[] = $config['image'];
        $dockerCommand[] = 'sh';
        $dockerCommand[] = '-lc';
        $dockerCommand[] = $this->bootstrapCommand($fileName, $config['command']);

        $startedAt = microtime(true);

        $process = new Process($dockerCommand);
        $process->setInput($stdin);
        $process->setTimeout(($timeLimitMs / 1000) + 8);

        try {
            try {
                $process->run();
            } catch (ProcessTimedOutException) {
                if ($process->isRunning()) {
                    $process->stop(0);
                }

                return new CodeExecutionResult(
                    status: 'time_limit_error',
                    stdout: $this->shortenOutput($process->getOutput()),
                    stderr: $this->shortenOutput($process->getErrorOutput()),
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
        } catch (Throwable $exception) {
            return new CodeExecutionResult(
                status: 'runtime_error',
                stdout: $process->getOutput(),
                stderr: $exception->getMessage(),
                exitCode: 1,
                executionTime: (int) round((microtime(true) - $startedAt) * 1000),
                memoryUsage: 0,
                message: $this->shorten($exception->getMessage()),
            );
        }
    }

    /**
     * @param array<int, string> $command
     */
    private function bootstrapCommand(string $fileName, array $command): string
    {
        $sourcePath = '/workspace/' . ltrim($fileName, '/');
        $writeSource = 'printf %s "$CODE_RUNNER_SOURCE_B64" | base64 -d > ' . escapeshellarg($sourcePath);
        $runCommand = 'exec ' . implode(' ', array_map('escapeshellarg', $command));

        return "set -eu\nmkdir -p /workspace\n{$writeSource}\n{$runCommand}";
    }

    private function dockerAvailabilityError(): ?string
    {
        try {
            $process = new Process(['docker', 'version', '--format', '{{.Server.Version}}']);
            $process->setTimeout(5);
            $process->run();
        } catch (Throwable $exception) {
            return 'Docker CLI недоступен в queue-контейнере: ' . $exception->getMessage();
        }

        if ($process->isSuccessful()) {
            return null;
        }

        $details = trim($process->getErrorOutput()) ?: trim($process->getOutput());

        return 'Docker daemon недоступен для queue-контейнера. Проверьте volume /var/run/docker.sock и права доступа. ' . $this->shorten($details);
    }

    private function dockerImageExists(string $image): bool
    {
        try {
            $process = new Process(['docker', 'image', 'inspect', $image]);
            $process->setTimeout(5);
            $process->run();

            return $process->isSuccessful();
        } catch (Throwable) {
            return false;
        }
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
