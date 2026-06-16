<?php

namespace App\Services\Ai;

use Illuminate\Support\Str;

class GroundedAnswerService
{
    public function __construct(private readonly AiSdkService $sdk, private readonly AiSettingsService $settings)
    {
    }

    /**
     * @param array<int, array<string, mixed>> $sources
     * @param array<string, mixed> $options
     * @return array{answer: string, provider: string, used_external_provider: bool}
     */
    public function answer(string $question, array $sources, string $mode = 'rag', array $options = []): array
    {
        $external = $this->sdkAnswer($question, $sources, $mode, $options);

        if ($external !== null) {
            return [
                'answer' => $external,
                'provider' => 'laravel_ai_sdk:' . $this->sdk->providerLabel(),
                'used_external_provider' => true,
            ];
        }

        return [
            'answer' => $this->localAnswer($question, $sources, $mode, $options),
            'provider' => 'local_grounded_fallback',
            'used_external_provider' => false,
        ];
    }

    /**
     * @param array<string, mixed> $runContext
     * @param array<int, array<string, mixed>> $sources
     */
    public function codeExplanation(array $runContext, array $sources): string
    {
        $external = $this->sdkCodeExplanation($runContext, $sources);

        if ($external !== null) {
            return $external;
        }

        $language = (string) ($runContext['language'] ?? 'code');
        $stderr = (string) ($runContext['stderr'] ?? '');
        $stdout = (string) ($runContext['stdout'] ?? '');
        $status = (string) ($runContext['run_status'] ?? 'no_run');
        $exitCode = $runContext['exit_code'] ?? null;
        $intent = (string) ($runContext['intent'] ?? 'explain_code');

        $lines = [];
        $lines[] = "Кратко:";

        if (in_array($status, ['queued', 'running'], true)) {
            $lines[] = 'Результата запуска пока нет: задача ещё в очереди или выполняется в Docker sandbox.';
        } elseif ($stderr !== '' || ($exitCode !== null && (int) $exitCode !== 0)) {
            $lines[] = 'Запуск завершился с ошибкой. Сначала нужно разобрать STDERR и код завершения.';
        } elseif ($stdout !== '') {
            $lines[] = "Код на языке `{$language}` завершился и вернул вывод в STDOUT.";
        } else {
            $lines[] = 'Вывода запуска нет. Проверь, должен ли код печатать результат и корректно ли передан STDIN.';
        }

        $lines[] = '';
        $lines[] = 'Что вижу:';
        $lines[] = 'Код запускается на backend через Laravel queue job и Docker sandbox, а не в браузере.';
        $lines[] = 'Статус: `' . ($status ?: 'unknown') . '`, exit code: `' . ($exitCode ?? '—') . '`, intent: `' . $intent . '`.';

        $lines[] = '';
        $lines[] = 'Проблема:';
        $lines[] = $stderr !== '' ? 'STDERR: `' . Str::limit(trim($stderr), 260) . '`' : 'Явный STDERR не передан.';

        $lower = Str::lower($stderr . "\n" . (string) ($runContext['code'] ?? ''));
        $hints = [];
        foreach ([
            'undefined' => 'Проверь имя переменной, область видимости и порядок объявления.',
            'syntax' => 'Проверь синтаксис: скобки, кавычки, разделители и соответствие выбранному языку.',
            'timeout' => 'Проверь бесконечные циклы или блокирующее чтение ввода.',
            'memory' => 'Проверь рекурсию, размер структур данных и ограничения памяти sandbox.',
        ] as $needle => $hint) {
            if (str_contains($lower, $needle)) {
                $hints[] = $hint;
            }
        }

        $lines[] = '';
        $lines[] = 'Что сделать:';
        $lines[] = $hints === [] ? 'Сопоставь код, STDIN и фактический вывод; если результата ещё нет, дождись завершения запуска.' : implode("\n", array_map(fn (string $hint) => '- ' . $hint, $hints));

        if ($intent === 'optimize') {
            $lines[] = '- Улучшай читаемость и сложность алгоритма без изменения поведения.';
        }

        $lines[] = '';
        $lines[] = 'Проверка:';
        $lines[] = $intent === 'write_tests' ? 'Подготовь наборы: пустой ввод, минимальный ввод, типичный ввод и граничные значения.' : 'Добавь минимальный пример STDIN и ожидаемый STDOUT для проверки.';

        if ($sources !== []) {
            $lines[] = '';
            $lines[] = 'Материалы платформы:';
            foreach (array_slice($sources, 0, 4) as $index => $source) {
                $lines[] = ($index + 1) . '. ' . ($source['title'] ?? 'Материал') . ' — ' . ($source['href'] ?? '#');
            }
        }

        return implode("\n", $lines);
    }


    /**
     * @param array<int, array<string, mixed>> $sources
     */
    private function localAnswer(string $question, array $sources, string $mode = 'rag', array $options = []): string
    {
        $useRag = (bool) ($options['use_rag'] ?? ($mode !== 'chat'));

        if ($sources === [] && ! $useRag) {
            return implode("\n\n", [
                'Сейчас внешний AI-провайдер недоступен, поэтому я не могу полноценно сгенерировать обычный ответ.',
                'Проверь `OPENROUTER_API_KEY`, выбранную модель и настройки `config/ai.php`. После подключения провайдера этот режим будет отвечать без обязательного поиска по базе знаний.',
            ]);
        }

        if ($sources === []) {
            return implode("\n\n", [
                'Я не нашёл достаточно материалов в базе знаний платформы, чтобы дать уверенный RAG-ответ.',
                'Попробуй уточнить запрос: добавь технологию, текст ошибки, название библиотеки, версию фреймворка или фрагмент кода.',
            ]);
        }

        $lines = [];
        $lines[] = 'Я нашёл релевантные материалы в базе знаний платформы и собрал ответ по ним.';
        $lines[] = '';
        $lines[] = 'Краткий вывод:';

        foreach (array_slice($sources, 0, 5) as $source) {
            $content = $this->bestSentence((string) ($source['content'] ?? ''));
            if ($content !== '') {
                $lines[] = '- ' . $content;
            }
        }

        $lines[] = '';
        $lines[] = 'Что проверить дальше:';
        $lines[] = '- сопоставь рекомендации с версиями Laravel, Next.js, PostgreSQL, Redis или другой технологии в своём проекте;';
        $lines[] = '- если вопрос связан с ошибкой, приложи точный лог, конфигурацию и минимальный пример воспроизведения;';
        $lines[] = '- если используешь код из ответа, проверь его в песочнице и адаптируй под своё окружение.';
        $lines[] = '';
        $lines[] = 'Источники ниже привязаны к материалам платформы, поэтому ответ можно проверить вручную.';

        return implode("\n", $lines);
    }

    private function bestSentence(string $content): string
    {
        $content = trim(preg_replace('/\s+/u', ' ', strip_tags($content)) ?: '');
        if ($content === '') {
            return '';
        }

        $parts = preg_split('/(?<=[.!?])\s+/u', $content) ?: [];
        $parts = array_values(array_filter($parts, fn ($part) => mb_strlen($part) > 35));

        return Str::limit($parts[0] ?? $content, 260);
    }

    /**
     * @param array<int, array<string, mixed>> $sources
     */
    private function sdkAnswer(string $question, array $sources, string $mode, array $options = []): ?string
    {
        $useRag = (bool) ($options['use_rag'] ?? ($mode !== 'chat'));

        if ($useRag && $sources === [] && ! (bool) config('ai.rag.fallback_to_local_answer', true)) {
            return null;
        }

        $context = collect($sources)
            ->take((int) config('ai.rag.max_sources', 8))
            ->map(fn (array $source, int $index) => '[' . ($index + 1) . '] ' . ($source['title'] ?? 'Источник') . "\nURL: " . ($source['href'] ?? '#') . "\n" . Str::limit((string) ($source['content'] ?? ''), 1800, ''))
            ->implode("\n\n");

        $attachmentsContext = collect($options['attachments'] ?? [])
            ->take(6)
            ->map(function (array $attachment, int $index): string {
                return '[Файл ' . ($index + 1) . '] ' . ($attachment['original_name'] ?? 'attachment')
                    . "\n" . Str::limit((string) ($attachment['extracted_text'] ?? ''), 3500, '');
            })
            ->filter(fn (string $item) => trim($item) !== '')
            ->implode("\n\n");

        $historyContext = collect($options['history'] ?? [])
            ->take(-8)
            ->map(fn (array $message) => ($message['role'] ?? 'message') . ': ' . Str::limit((string) ($message['content'] ?? ''), 900, ''))
            ->implode("\n");
        $model = (string) ($options['model'] ?? $this->settings->defaultChatModelId());
        $promptMode = $useRag ? 'rag' : (in_array($mode, ['files', 'code', 'project', 'question_auto_answer'], true) ? $mode : 'chat');
        $instructions = $this->settings->promptFor($promptMode, $model);

        $prompt = "Режим: {$mode}\n"
            . "Модель интерфейса: {$model}\n\n"
            . "Последние сообщения диалога:\n" . ($historyContext ?: 'История пуста.') . "\n\n"
            . "Вопрос пользователя:\n{$question}\n\n"
            . "Прикреплённые файлы:\n" . ($attachmentsContext ?: 'Файлы не прикреплены или текст не извлечён.') . "\n\n"
            . "Источники платформы:\n" . ($useRag ? ($context ?: 'Источники не найдены.') : 'Поиск по базе знаний отключён для этого сообщения.');

        return $this->sdk->text($instructions, $prompt, $options);
    }

    /**
     * @param array<string, mixed> $runContext
     * @param array<int, array<string, mixed>> $sources
     */
    private function sdkCodeExplanation(array $runContext, array $sources): ?string
    {
        $context = collect($sources)
            ->take(6)
            ->map(fn (array $source, int $index) => '[' . ($index + 1) . '] ' . ($source['title'] ?? 'Источник') . "\nURL: " . ($source['href'] ?? '#') . "\n" . Str::limit((string) ($source['content'] ?? ''), 1200, ''))
            ->implode("\n\n");
        $instructions = $this->settings->promptFor('code');

        $language = (string) ($runContext['language'] ?? 'code');
        $prompt = "Контекст запуска:\n"
            . 'title: ' . ($runContext['title'] ?? '—') . "\n"
            . 'language: ' . $language . "\n"
            . 'intent: ' . ($runContext['intent'] ?? 'explain_code') . "\n"
            . 'run_status: ' . ($runContext['run_status'] ?? '—') . "\n"
            . 'exit_code: ' . ($runContext['exit_code'] ?? '—') . "\n"
            . 'execution_time: ' . ($runContext['execution_time'] ?? '—') . "\n"
            . 'memory_usage: ' . ($runContext['memory_usage'] ?? '—') . "\n"
            . 'backend_runner: ' . ($runContext['backend_runner'] ?? '—') . "\n"
            . 'backend_execution_note: ' . ($runContext['backend_execution_note'] ?? '—') . "\n\n"
            . "Код:\n```{$language}\n" . Str::limit((string) ($runContext['code'] ?? ''), 12000, '') . "\n```\n\n"
            . "STDIN:\n" . (($runContext['stdin'] ?? '') ?: '—') . "\n\n"
            . "STDOUT:\n" . (($runContext['stdout'] ?? '') ?: '—') . "\n\n"
            . "STDERR:\n" . (($runContext['stderr'] ?? '') ?: '—') . "\n\n"
            . "RAG sources:\n" . ($context ?: 'Материалы не найдены.');

        return $this->sdk->text($instructions, $prompt);
    }

}
