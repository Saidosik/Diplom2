<?php

return [
    'default_time_limit_ms' => (int) env('CODE_RUNNER_TIME_LIMIT_MS', 1500),
    'default_memory_limit_mb' => (int) env('CODE_RUNNER_MEMORY_LIMIT_MB', 128),
    'queue_stale_seconds' => (int) env('CODE_RUNNER_QUEUE_STALE_SECONDS', 120),
    'running_stale_seconds' => (int) env('CODE_RUNNER_RUNNING_STALE_SECONDS', 240),

    'stop_on_first_failed_test' => (bool) env('CODE_RUNNER_STOP_ON_FIRST_FAILED_TEST', false),

    'docker' => [
        'cpus' => env('CODE_RUNNER_DOCKER_CPUS', '0.5'),
        'pids_limit' => (int) env('CODE_RUNNER_DOCKER_PIDS_LIMIT', 64),
        'tmpfs_size' => env('CODE_RUNNER_DOCKER_TMPFS_SIZE', '512m'),
        'workspace_tmpfs_size' => env('CODE_RUNNER_DOCKER_WORKSPACE_TMPFS_SIZE', '16m'),
    ],

    'languages' => [
        'javascript' => [
            'label' => 'JavaScript',
            'image' => env('CODE_RUNNER_JS_IMAGE', 'node:22-alpine'),
            'file' => 'solution.js',
            'command' => ['node', '/workspace/solution.js'],
            'monaco' => 'javascript',
        ],

        'python' => [
            'label' => 'Python',
            'image' => env('CODE_RUNNER_PYTHON_IMAGE', 'python:3.13-alpine'),
            'file' => 'solution.py',
            'command' => ['python', '/workspace/solution.py'],
            'monaco' => 'python',
        ],

        'php' => [
            'label' => 'PHP',
            'image' => env('CODE_RUNNER_PHP_IMAGE', 'php:8.3-cli-alpine'),
            'file' => 'solution.php',
            'command' => ['php', '/workspace/solution.php'],
            'monaco' => 'php',
        ],

        'cpp' => [
            'label' => 'C++',
            'image' => env('CODE_RUNNER_CPP_IMAGE', 'gcc:14'),
            'file' => 'solution.cpp',
            'command' => ['sh', '-lc', 'g++ /workspace/solution.cpp -O2 -std=c++20 -o /tmp/solution && /tmp/solution'],
            'monaco' => 'cpp',
        ],

        'csharp' => [
            'label' => 'C#',
            'image' => env('CODE_RUNNER_CSHARP_IMAGE', 'mcr.microsoft.com/dotnet/sdk:8.0-alpine'),
            'file' => 'Program.cs',
            'command' => ['sh', '-lc', 'mkdir -p /tmp/app /tmp/nuget && cd /tmp/app && dotnet new console --force >/dev/null && cp /workspace/Program.cs Program.cs && dotnet run'],
            'env' => [
                'DOTNET_CLI_HOME' => '/tmp',
                'DOTNET_SKIP_FIRST_TIME_EXPERIENCE' => '1',
                'DOTNET_NOLOGO' => '1',
                'NUGET_PACKAGES' => '/tmp/nuget',
            ],
            'min_memory_limit_mb' => 512,
            'min_time_limit_ms' => 3000,
            'monaco' => 'csharp',
        ],
    ],
];
