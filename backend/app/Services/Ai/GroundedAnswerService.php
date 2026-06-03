<?php

namespace App\Services\Ai;

use Illuminate\Support\Str;

class GroundedAnswerService
{
    public function __construct(private readonly AiSdkService $sdk)
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
     * @param array<int, array<string, mixed>> $sources
     */
    public function codeExplanation(string $language, string $code, ?string $stdin, ?string $stdout, ?string $stderr, array $sources): string
    {
        $external = $this->sdkCodeExplanation($language, $code, $stdin, $stdout, $stderr, $sources);

        if ($external !== null) {
            return $external;
        }

        $lines = [];
        $lines[] = "Разбор запуска кода (`{$language}`):";

        if ($stderr) {
            $lines[] = '';
            $lines[] = 'Обнаружен вывод в `STDERR`, поэтому сначала проверь ошибку выполнения или компиляции.';
            $lines[] = 'Ключевой фрагмент ошибки: `' . Str::limit(trim($stderr), 220) . '`';
        } elseif ($stdout) {
            $lines[] = '';
            $lines[] = 'Код выполнился и вернул вывод. Сравни `STDOUT` с ожидаемым результатом и проверь формат вывода.';
        } else {
            $lines[] = '';
            $lines[] = 'Запуск не вернул вывод. Проверь, читает ли программа `STDIN`, вызывает ли вывод в консоль и не завершается ли раньше времени.';
        }

        $lower = Str::lower(($stderr ?? '') . "\n" . $code);
        $rules = [
            'undefined' => 'Если ошибка связана с `undefined`, проверь имя переменной, область видимости и порядок объявления.',
            'syntax' => 'Если ошибка синтаксиса, проверь скобки, кавычки, точки с запятой и соответствие выбранному языку.',
            'permission' => 'Если ошибка доступа, в песочнице запрещены сеть и часть файловых операций.',
            'timeout' => 'Если запуск зависает, проверь бесконечные циклы и чтение ввода.',
            'memory' => 'Если не хватает памяти, уменьши размер данных или проверь рекурсию/структуры данных.',
        ];

        foreach ($rules as $needle => $hint) {
            if (str_contains($lower, $needle)) {
                $lines[] = '- ' . $hint;
            }
        }

        if ($sources !== []) {
            $lines[] = '';
            $lines[] = 'Похожие материалы платформы:';
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

        $baseInstructions = [
            'Ты AI-помощник информационного сообщества для программистов.',
            'Отвечай на русском языке.',
            'Давай практические шаги и предупреждай проверять версии библиотек, команды и окружение.',
        ];

        if ($useRag) {
            $baseInstructions[] = 'Используй найденные источники платформы как основной контекст и не выдавай неподтверждённые факты как точные.';
            $baseInstructions[] = 'Если контекста недостаточно, честно скажи, что данных мало, и предложи уточнить вопрос.';
            $baseInstructions[] = 'В конце кратко объясни, на какие источники стоит посмотреть в интерфейсе.';
        } else {
            $baseInstructions[] = 'Это обычный чат: отвечай по вопросу пользователя без обязательного поиска по базе знаний.';
            $baseInstructions[] = 'Если пользователь приложил файлы, анализируй их как контекст.';
            $baseInstructions[] = 'Не упоминай источники платформы, если они не были переданы.';
        }

        $instructions = implode("\n", $baseInstructions);

        $model = (string) ($options['model'] ?? config('ai.models.chat'));

        $prompt = "Режим: {$mode}\n"
            . "Модель интерфейса: {$model}\n\n"
            . "Последние сообщения диалога:\n" . ($historyContext ?: 'История пуста.') . "\n\n"
            . "Вопрос пользователя:\n{$question}\n\n"
            . "Прикреплённые файлы:\n" . ($attachmentsContext ?: 'Файлы не прикреплены или текст не извлечён.') . "\n\n"
            . "Источники платформы:\n" . ($useRag ? ($context ?: 'Источники не найдены.') : 'Поиск по базе знаний отключён для этого сообщения.');

        return $this->sdk->text($instructions, $prompt, $options);
    }

    /**
     * @param array<int, array<string, mixed>> $sources
     */
    private function sdkCodeExplanation(string $language, string $code, ?string $stdin, ?string $stdout, ?string $stderr, array $sources): ?string
    {
        $context = collect($sources)
            ->take(6)
            ->map(fn (array $source, int $index) => '[' . ($index + 1) . '] ' . ($source['title'] ?? 'Источник') . "\n" . Str::limit((string) ($source['content'] ?? ''), 1200, ''))
            ->implode("\n\n");

        $instructions = implode("\n", [
            'Ты AI-помощник для разбора кода в песочнице платформы программистов.',
            'Отвечай на русском языке.',
            'Объясняй ошибку или результат запуска кратко и по делу.',
            'Опирайся на stdout/stderr, код и найденные материалы платформы.',
        ]);

        $prompt = "Язык: {$language}\n\nКод:\n```{$language}\n" . Str::limit($code, 12000, '') . "\n```\n\nSTDIN:\n" . ($stdin ?: '—') . "\n\nSTDOUT:\n" . ($stdout ?: '—') . "\n\nSTDERR:\n" . ($stderr ?: '—') . "\n\nПохожие материалы:\n" . ($context ?: 'Материалы не найдены.');

        return $this->sdk->text($instructions, $prompt);
    }
}
