<?php

namespace Database\Seeders;

use App\Enums\IssueQuestionStatus;
use App\Enums\PublicationStatus;
use App\Enums\PublicationType;
use App\Models\CodeRun;
use App\Models\CodeSnippet;
use App\Models\ChatConversation;
use App\Models\ChatMessage;
use App\Models\ChatParticipant;
use App\Models\FriendRequest;
use App\Models\Friendship;
use App\Models\Comment;
use App\Models\CommunityNotification;
use App\Models\IssueAnswer;
use App\Models\IssueQuestion;
use App\Models\Publication;
use App\Models\Reaction;
use App\Models\Report;
use App\Models\SavedItem;
use App\Models\Subscription;
use App\Models\Tag;
use App\Models\User;
use App\Services\Community\CommunityActivityService;
use App\Services\Ai\KnowledgeExtractorService;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CommunityPlatformSeeder extends Seeder
{
    private CommunityActivityService $community;

    /**
     * @var array<string, User>
     */
    private array $users = [];

    /**
     * @var array<string, Tag>
     */
    private array $tags = [];

    /**
     * @var array<string, Publication>
     */
    private array $publications = [];

    /**
     * @var array<string, IssueQuestion>
     */
    private array $questions = [];

    /**
     * @var array<string, IssueAnswer>
     */
    private array $answers = [];

    /**
     * @var array<string, CodeSnippet>
     */
    private array $snippets = [];

    public function run(): void
    {
        $this->community = app(CommunityActivityService::class);

        DB::statement(
            'TRUNCATE TABLE ai_chat_messages, ai_chat_sessions, ai_knowledge_chunks, ai_knowledge_documents, chat_attachments, chat_messages, chat_participants, chat_conversations, friendships, friend_requests, code_runs, code_snippets, community_activities, community_notifications, reputation_events, notification_settings, subscriptions, saved_items, reports, reactions, comments, taggables, tags, issue_answer_blocks, issue_answers, issue_blocks, issue_questions, publication_blocks, publications, users RESTART IDENTITY CASCADE'
        );

        Model::unguarded(function () {
            $this->seedUsers();
            $this->seedTags();
            $this->seedCodePlayground();
            $this->seedPublications();
            $this->seedQuestionsAndAnswers();
            $this->seedOpenQuestions();
            $this->seedSubscriptions();
            $this->seedComments();
            $this->seedReactionsAndSavedItems();
            $this->seedReports();
            $this->seedNotifications();
            $this->seedSocialAndChats();
            $this->rebuildAiKnowledgeIndex();
        });
    }

    private function seedUsers(): void
    {
        $users = [
            'admin' => ['Администратор сообщества', 'admin@devcommunity.test', 'admin', 'Модерация, качество контента и развитие платформы', 'Настраивает правила сообщества, проверяет жалобы и следит за качеством обсуждений.', 'Казань'],
            'maria' => ['Мария Backend', 'maria.backend@devcommunity.test', 'user', 'Laravel, PostgreSQL, очереди и архитектура API', 'Проектирует backend-сервисы, пишет о транзакциях, очередях, индексах и API-контрактах.', 'Москва'],
            'ilya' => ['Илья Frontend', 'ilya.frontend@devcommunity.test', 'user', 'Next.js, TypeScript, UI-системы и DX', 'Разбирает frontend-архитектуру, BFF-подход, состояние интерфейса и производительность.', 'Санкт-Петербург'],
            'alina' => ['Алина Reviewer', 'alina.reviewer@devcommunity.test', 'user', 'Code review, чистая архитектура и тестирование', 'Помогает участникам улучшать код, формулировки вопросов и структуру публикаций.', 'Иннополис'],
            'said' => ['Саид Junior', 'said.junior@devcommunity.test', 'user', 'Изучает fullstack-разработку и задаёт практические вопросы', 'Собирает pet-проекты на Laravel и Next.js, активно участвует в Q&A.', 'Набережные Челны'],
            'dmitry' => ['Дмитрий DevOps', 'dmitry.devops@devcommunity.test', 'user', 'Docker, Redis, CI/CD и наблюдаемость', 'Настраивает окружения, очереди, логи, мониторинг и автоматический деплой.', 'Екатеринбург'],
            'sofia' => ['София Data', 'sofia.data@devcommunity.test', 'user', 'PostgreSQL, полнотекстовый поиск и аналитика', 'Пишет про индексы, explain analyze, поиск по контенту и витрины данных.', 'Новосибирск'],
            'kirill' => ['Кирилл Security', 'kirill.security@devcommunity.test', 'user', 'Безопасность пользовательского контента и OAuth', 'Разбирает XSS, CSRF, хранение токенов, модерацию и безопасный рендеринг markdown.', 'Самара'],
            'nina' => ['Нина Product Engineer', 'nina.product@devcommunity.test', 'user', 'Рекомендации, ленты, вовлечение и продуктовая аналитика', 'Проектирует механики активности, персональные ленты и метрики качества сообщества.', 'Калининград'],
            'roman' => ['Роман Mobile', 'roman.mobile@devcommunity.test', 'user', 'React Native, API-контракты и адаптивные интерфейсы', 'Интересуется тем, как web-платформа может масштабироваться на мобильный клиент.', 'Пермь'],
            'vera' => ['Вера Docs', 'vera.docs@devcommunity.test', 'user', 'Техническое письмо, гайды и редактура', 'Помогает авторам превращать заметки в понятные статьи и структурированные инструкции.', 'Воронеж'],
            'pavel' => ['Павел QA', 'pavel.qa@devcommunity.test', 'user', 'E2E-тесты, API-тестирование и качество релизов', 'Пишет чек-листы, воспроизводит баги и помогает описывать ожидаемое поведение.', 'Уфа'],
            'ai' => ['Vektor AI', 'ai@devcommunity.test', 'user', 'Инструмент анализа вопросов, поиска материалов и предварительных Q&A-ответов', 'Служебный автор для ответов, сформированных встроенными AI-инструментами платформы.', 'Платформа'],
        ];

        foreach ($users as $key => [$name, $email, $role, $headline, $bio, $location]) {
            $this->users[$key] = User::query()->create([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make('12345678'),
                'role' => $role,
                'headline' => $headline,
                'bio' => $bio,
                'location' => $location,
                'website_url' => "https://devcommunity.test/users/{$key}",
                'github_url' => $key === 'ai' ? null : "https://github.com/{$key}-dev",
                'email_verified_at' => now()->subDays(30),
                'created_at' => now()->subDays(45 - min(30, strlen($key))),
                'updated_at' => now()->subDays(1),
            ]);

            $this->users[$key]->notificationSetting()->create([
                'inbox_enabled' => true,
                'email_enabled' => in_array($key, ['admin', 'maria', 'ilya'], true),
                'notify_answers' => true,
                'notify_comments' => true,
                'notify_comment_replies' => true,
                'notify_author_posts' => true,
                'notify_subscriptions' => true,
                'notify_moderation' => true,
                'notify_reputation' => true,
            ]);
        }
    }

    private function seedTags(): void
    {
        $tags = [
            ['Laravel', 'laravel', 'Фреймворк, API, очереди, middleware, сервисный слой', '#ef4444'],
            ['Next.js', 'next-js', 'App Router, BFF, server actions и SSR-интерфейсы', '#111827'],
            ['TypeScript', 'typescript', 'Типизация frontend-кода и API-контрактов', '#2563eb'],
            ['PostgreSQL', 'postgresql', 'Индексы, jsonb, транзакции и полнотекстовый поиск', '#0f766e'],
            ['Redis', 'redis', 'Кэш, очереди, realtime и rate limiting', '#dc2626'],
            ['Docker', 'docker', 'Контейнеризация, sandbox, локальная разработка', '#0284c7'],
            ['API', 'api', 'REST, BFF, контракты, ошибки и версионирование', '#7c3aed'],
            ['Архитектура', 'architecture', 'Модели, сервисы, слои и проектирование модулей', '#475569'],
            ['UI/UX', 'ui-ux', 'Интерфейсы, формы, доступность и продуктовая логика', '#db2777'],
            ['Безопасность', 'security', 'XSS, CSRF, OAuth, токены и модерация контента', '#b91c1c'],
            ['Очереди', 'queues', 'Фоновые задачи, jobs, retries и Horizon', '#ea580c'],
            ['Поиск', 'search', 'Поиск по контенту, фильтры, релевантность и подсказки', '#0891b2'],
            ['ИИ-инструменты', 'ai-tools', 'AI-поиск, подсказки редактора и предварительные ответы', '#8b5cf6'],
            ['Рекомендации', 'recommendations', 'Персональные ленты, score, интересы и подписки', '#16a34a'],
            ['Тренды', 'trends', 'Популярное за день, неделю, месяц и динамика тем', '#f59e0b'],
            ['Репутация', 'reputation', 'Баллы, уровни, рейтинг участников и полезные действия', '#0ea5e9'],
            ['Модерация', 'moderation', 'Жалобы, статусы проверки и качество сообщества', '#64748b'],
            ['Тестирование', 'testing', 'Feature-тесты, unit-тесты, E2E и стабильность релизов', '#22c55e'],
            ['Производительность', 'performance', 'Оптимизация запросов, кэша, SSR и рендера', '#84cc16'],
            ['Markdown', 'markdown', 'Контентные блоки, code fences и безопасный рендеринг', '#71717a'],
            ['shadcn/ui', 'shadcn-ui', 'Компоненты интерфейса и дизайн-система', '#18181b'],
            ['JWT', 'jwt', 'Access/refresh token, cookie и защищённые маршруты', '#4f46e5'],
            ['WebSocket', 'websocket', 'Realtime-обновления, уведомления и события', '#0d9488'],
            ['Code Playground', 'code-playground', 'Запуск кода, сниппеты и технические примеры', '#9333ea'],
        ];

        foreach ($tags as [$name, $slug, $description, $color]) {
            $this->tags[$slug] = Tag::query()->create([
                'name' => $name,
                'slug' => $slug,
                'description' => $description,
                'color' => $color,
                'status' => 'active',
                'created_at' => now()->subDays(40),
                'updated_at' => now()->subDays(2),
            ]);
        }
    }


    /**
     * @return array{0: string, 1: array<string, mixed>}
     */
    private function snippetBlock(string $key, string $note = ''): array
    {
        $snippet = $this->snippets[$key];

        return ['code_snippet', [
            'snippet_id' => $snippet->id,
            'title' => $snippet->title,
            'language' => $snippet->language,
            'code' => $snippet->code,
            'stdin' => $snippet->stdin,
            'href' => "/playground?snippet={$snippet->id}",
            'note' => $note,
        ]];
    }

    private function seedPublications(): void
    {
        $items = [
            [
                'key' => 'activity-feed-laravel',
                'author' => 'nina',
                'type' => PublicationType::Article,
                'title' => 'Как спроектировать ленту активности для сообщества разработчиков',
                'excerpt' => 'Разбор модели community_activities, типов событий, score и сценариев вывода на главной странице.',
                'slug' => 'activity-feed-for-developer-community',
                'tags' => ['architecture', 'trends', 'recommendations', 'laravel'],
                'minutes' => 9,
                'days' => 0,
                'blocks' => [
                    ['heading', ['text' => 'Зачем нужна лента активности']],
                    ['paragraph', ['text' => 'Лента показывает, что происходит в сообществе: новые вопросы, ответы, комментарии, реакции, подписки и изменения репутации.']],
                    ['file_tree', ['title' => 'Community module', 'tree' => "app/\n  Models/CommunityActivity.php\n  Services/Community/CommunityActivityService.php\ndatabase/\n  migrations/create_community_activities_table.php\nfrontend/src/features/community/"]],
                    ['code', ['language' => 'php', 'filename' => 'CommunityActivityService.php', 'code' => "CommunityActivity::query()->create([\n    'actor_id' => \$user->id,\n    'type' => 'answer_created',\n    'subject_type' => 'issue_answer',\n    'subject_id' => \$answer->id,\n]);"]],
                    ['terminal', ['shell' => 'bash', 'cwd' => '~/vektor/backend', 'command' => 'php artisan migrate --path=database/migrations/2026_05_20_000000_create_community_activities_table.php', 'output' => 'INFO  Running migrations.\nDONE  community_activities table created.']],
                    ['callout', ['variant' => 'success', 'title' => 'Практический вывод', 'text' => 'Хранить события отдельно полезнее, чем каждый раз собирать ленту из разных таблиц.']],
                    $this->snippetBlock('trend-score-js', 'Пример расчёта score можно открыть и запустить в песочнице.'),
                ],
            ],
            [
                'key' => 'ai-question-helper',
                'author' => 'vera',
                'type' => PublicationType::Guide,
                'title' => 'AI-помощник в редакторе вопросов: какие подсказки действительно полезны',
                'excerpt' => 'Как улучшать заголовки, находить похожие вопросы, подбирать теги и проверять полноту описания проблемы.',
                'slug' => 'ai-question-helper-editor-workflow',
                'tags' => ['ai-tools', 'ui-ux', 'search', 'markdown'],
                'minutes' => 11,
                'days' => 1,
                'blocks' => [
                    ['heading', ['text' => 'AI как часть формы, а не отдельный чат']],
                    ['paragraph', ['text' => 'Ассистент должен помогать в точке действия: когда пользователь пишет вопрос, публикацию или ищет похожие материалы.']],
                    ['markdown', ['text' => "### Чек-лист хорошего вопроса\n- проблема сформулирована конкретно;\n- есть код или конфигурация;\n- указано ожидаемое поведение;\n- приложен фактический результат;\n- выбраны релевантные теги."]],
                    ['quote', ['text' => 'Хороший AI-инструмент сокращает путь к качественному контенту, но не скрывает автоматическое происхождение ответа.']],
                ],
            ],
            [
                'key' => 'postgre-fulltext',
                'author' => 'sofia',
                'type' => PublicationType::Article,
                'title' => 'Поиск по публикациям и вопросам на PostgreSQL без отдельной поисковой системы',
                'excerpt' => 'ILIKE, триграммы, ts_vector и практический подход к релевантности в небольшом сообществе.',
                'slug' => 'postgresql-content-search-without-external-engine',
                'tags' => ['postgresql', 'search', 'performance'],
                'minutes' => 13,
                'days' => 3,
                'blocks' => [
                    ['heading', ['text' => 'От простого поиска к релевантности']],
                    ['paragraph', ['text' => 'Для старта достаточно поиска по title, excerpt и тегам, а затем можно добавить веса и полнотекстовые индексы.']],
                    ['code', ['language' => 'sql', 'filename' => 'database/indexes.sql', 'code' => "CREATE INDEX publications_search_idx\nON publications USING gin(to_tsvector('russian', title || ' ' || coalesce(excerpt, '')));"]],
                    ['diff', ['filename' => 'search.sql', 'language' => 'diff', 'code' => "- WHERE title ILIKE :query\n+ WHERE searchable_text @@ plainto_tsquery('russian', :query)"]],
                    ['callout', ['variant' => 'warning', 'title' => 'Не усложнять раньше времени', 'text' => 'Не стоит начинать с тяжёлой инфраструктуры, если объём контента пока небольшой.']],
                ],
            ],
            [
                'key' => 'redis-notifications',
                'author' => 'dmitry',
                'type' => PublicationType::Guide,
                'title' => 'Очереди уведомлений на Laravel и Redis: от события до inbox',
                'excerpt' => 'Как сохранять уведомления, учитывать настройки пользователя и не блокировать основной запрос.',
                'slug' => 'laravel-redis-notifications-queue-inbox',
                'tags' => ['laravel', 'redis', 'queues', 'websocket'],
                'minutes' => 10,
                'days' => 6,
                'blocks' => [
                    ['paragraph', ['text' => 'Уведомления лучше создавать через сервисный слой: он проверяет настройки пользователя и решает, нужно ли писать событие в inbox.']],
                    ['code', ['language' => 'php', 'code' => "dispatch(new SendCommunityNotificationJob(\$recipient, \$payload));"]],
                    $this->snippetBlock('redis-php', 'Быстрая проверка переменных окружения Redis перед запуском worker.'),
                    ['important', ['text' => 'Даже если realtime временно недоступен, уведомление должно сохраниться в базе.']],
                ],
            ],
            [
                'key' => 'next-bff-auth',
                'author' => 'ilya',
                'type' => PublicationType::Article,
                'title' => 'BFF в Next.js: безопасная прослойка между браузером и Laravel API',
                'excerpt' => 'Почему access token лучше держать в httpOnly cookie и как проксировать запросы через /api/laravel.',
                'slug' => 'nextjs-bff-laravel-api-auth',
                'tags' => ['next-js', 'api', 'jwt', 'security'],
                'minutes' => 12,
                'days' => 8,
                'blocks' => [
                    ['paragraph', ['text' => 'BFF-слой позволяет скрыть access token от JavaScript-кода в браузере и централизованно обрабатывать refresh-сценарии.']],
                    ['code', ['language' => 'ts', 'code' => "const response = await fetch('/api/laravel/me', {\n  credentials: 'include',\n})"]],
                    ['warning', ['text' => 'Если refresh endpoint закрыт обычным JWT middleware, протухший access token может не дойти до логики обновления.']],
                ],
            ],
            [
                'key' => 'safe-markdown-rendering',
                'author' => 'kirill',
                'type' => PublicationType::Guide,
                'title' => 'Безопасный рендеринг Markdown и code blocks в пользовательском контенте',
                'excerpt' => 'Как не превратить редактор публикаций в источник XSS и почему важно разделять хранение и отображение блоков.',
                'slug' => 'safe-markdown-rendering-user-content',
                'tags' => ['security', 'markdown', 'ui-ux'],
                'minutes' => 14,
                'days' => 13,
                'blocks' => [
                    ['paragraph', ['text' => 'Пользовательский markdown нельзя рендерить как HTML без санитайзера и белого списка разрешённых элементов.']],
                    ['code', ['language' => 'tsx', 'code' => "<MarkdownRenderer content={sanitize(markdown)} />"]],
                    $this->snippetBlock('escape-html-php', 'Сниппет показывает базовое экранирование пользовательского HTML.'),
                    ['important', ['text' => 'Кодовые блоки должны быть текстом, а не исполняемым HTML.']],
                ],
            ],
            [
                'key' => 'question-quality',
                'author' => 'alina',
                'type' => PublicationType::Post,
                'title' => 'Почему одни вопросы получают ответы быстрее других',
                'excerpt' => 'Практические правила формулировки вопроса: контекст, код, ожидание, фактический результат и минимальный пример.',
                'slug' => 'why-good-questions-get-faster-answers',
                'tags' => ['ui-ux', 'markdown', 'reputation'],
                'minutes' => 6,
                'days' => 2,
                'blocks' => [
                    ['paragraph', ['text' => 'Сообщество быстрее отвечает на вопросы, где сразу понятно окружение, шаги воспроизведения и ожидаемый результат.']],
                    ['markdown', ['text' => "**Формула:** контекст + код + ошибка + что уже пробовал = больше шансов получить точный ответ."]],
                ],
            ],
            [
                'key' => 'recommendation-score',
                'author' => 'nina',
                'type' => PublicationType::Article,
                'title' => 'Простая формула рекомендаций без ML: теги, свежесть и полезность',
                'excerpt' => 'Как построить персональную ленту на подписках, сохранённых материалах, реакциях и активности автора.',
                'slug' => 'recommendation-score-tags-freshness-usefulness',
                'tags' => ['recommendations', 'trends', 'architecture', 'postgresql'],
                'minutes' => 8,
                'days' => 15,
                'blocks' => [
                    ['paragraph', ['text' => 'На первом этапе рекомендации можно считать прозрачной формулой, которую легко объяснить в документации проекта.']],
                    ['code', ['language' => 'php', 'code' => "score = tagMatch * 5 + reactions * 3 + comments * 4 + freshnessBonus;"]],
                    $this->snippetBlock('trend-score-js', 'Такой сниппет удобно использовать как проверяемый пример расчёта.'),
                ],
            ],
            [
                'key' => 'docker-code-playground',
                'author' => 'dmitry',
                'type' => PublicationType::Guide,
                'title' => 'Песочница кода через Docker: как безопасно запускать сниппеты пользователей',
                'excerpt' => 'Ограничения по времени, памяти, языкам, stdin/stdout и изоляции процесса.',
                'slug' => 'docker-code-playground-safe-snippets',
                'tags' => ['docker', 'code-playground', 'security'],
                'minutes' => 12,
                'days' => 18,
                'blocks' => [
                    ['paragraph', ['text' => 'Песочница кода должна быть независимым инструментом платформы, а не частью учебного курса.']],
                    ['terminal', ['shell' => 'bash', 'cwd' => '~/sandbox', 'command' => 'docker run --rm --memory=128m --cpus=0.5 --network=none snippet-runner php main.php', 'output' => 'Hello from isolated snippet\nExit code: 0']],
                    ['diff', ['filename' => 'docker-runner.sh', 'language' => 'diff', 'code' => "- docker run snippet-runner php main.php\n+ docker run --rm --memory=128m --cpus=0.5 --network=none snippet-runner php main.php"]],
                    ['callout', ['variant' => 'warning', 'title' => 'Изоляция обязательна', 'text' => 'Запуск пользовательского кода без ограничений опасен даже в учебном проекте.']],
                ],
            ],
            [
                'key' => 'shadcn-community-ui',
                'author' => 'ilya',
                'type' => PublicationType::Post,
                'title' => 'UI сообщества: плотная лента, правый сайдбар и действия рядом с контентом',
                'excerpt' => 'Как сделать интерфейс полезным для программистов: меньше лендинга, больше контекста и быстрых действий.',
                'slug' => 'community-ui-feed-sidebar-actions',
                'tags' => ['ui-ux', 'shadcn-ui', 'next-js'],
                'minutes' => 7,
                'days' => 21,
                'blocks' => [
                    ['paragraph', ['text' => 'Главная страница сообщества должна отвечать не на вопрос “что это за сайт”, а на вопрос “что сейчас происходит”.']],
                    ['quote', ['text' => 'Хорошая карточка показывает тип контента, автора, теги, активность и следующий полезный шаг.']],
                ],
            ],
            [
                'key' => 'moderation-flow',
                'author' => 'admin',
                'type' => PublicationType::News,
                'title' => 'Обновлены правила модерации: жалобы, скрытие и разбор спорных материалов',
                'excerpt' => 'Платформа усиливает контроль качества: теперь жалобы классифицируются и попадают в отдельную очередь проверки.',
                'slug' => 'community-moderation-flow-update',
                'tags' => ['moderation', 'security', 'reputation'],
                'minutes' => 4,
                'days' => 4,
                'blocks' => [
                    ['paragraph', ['text' => 'Жалобы помогают сохранять качество контента, но решение должно приниматься модератором, а не автоматикой.']],
                    ['important', ['text' => 'Повторные нарушения могут снижать доверие к автору и влиять на видимость материалов.']],
                ],
            ],
            [
                'key' => 'testing-laravel-api',
                'author' => 'pavel',
                'type' => PublicationType::Guide,
                'title' => 'Feature-тесты для Laravel API: проверяем публикации, вопросы и реакции',
                'excerpt' => 'Набор тестовых сценариев для community-платформы: авторизация, права доступа, статусы и счётчики.',
                'slug' => 'laravel-api-feature-tests-community',
                'tags' => ['testing', 'laravel', 'api'],
                'minutes' => 10,
                'days' => 24,
                'blocks' => [
                    ['paragraph', ['text' => 'В community-проекте важно тестировать не только CRUD, но и побочные эффекты: уведомления, активность и репутацию.']],
                    ['code', ['language' => 'php', 'code' => "it('creates activity when answer is published', function () {\n    // assertion for community_activities\n});"]],
                ],
            ],
        ];

        foreach ($items as $index => $item) {
            $publishedAt = now()->subDays($item['days'])->subHours($index % 5);
            $author = $this->users[$item['author']];

            $publication = Publication::query()->create([
                'author_id' => $author->id,
                'type' => $item['type']->value,
                'status' => PublicationStatus::Published->value,
                'title' => $item['title'],
                'slug' => $item['slug'],
                'excerpt' => $item['excerpt'],
                'reading_time_minutes' => $item['minutes'],
                'published_at' => $publishedAt,
                'created_at' => $publishedAt,
                'updated_at' => $publishedAt->copy()->addMinutes(15),
            ]);

            foreach ($item['blocks'] as $blockIndex => [$type, $content]) {
                $publication->blocks()->create([
                    'type' => $type,
                    'sort_order' => ($blockIndex + 1) * 10,
                    'content' => $content,
                    'created_at' => $publishedAt,
                    'updated_at' => $publishedAt,
                ]);
            }

            $this->attachTags($publication, $item['tags']);
            $this->publications[$item['key']] = $publication;

            $this->community->record(
                $author,
                CommunityActivityService::ACTIVITY_PUBLICATION_CREATED,
                $publication,
                null,
                ['tags' => $item['tags'], 'reading_time_minutes' => $item['minutes']],
                $publication->title,
                $publication->excerpt,
                "/publications/{$publication->slug}",
                20 + max(0, 20 - $item['days'])
            );

            $this->community->awardReputation($author, 18, CommunityActivityService::REASON_PUBLICATION_CREATED, $publication, $author, [
                'title' => $publication->title,
            ]);
        }
    }

    private function seedQuestionsAndAnswers(): void
    {
        $questions = [
            [
                'key' => 'redis-queue-stuck',
                'author' => 'said',
                'title' => 'Почему Laravel Queue с Redis не обрабатывает jobs после деплоя?',
                'slug' => 'laravel-redis-queue-jobs-not-processing-after-deploy',
                'excerpt' => 'Jobs попадают в Redis, но worker не забирает их после обновления контейнеров.',
                'tags' => ['laravel', 'redis', 'queues', 'docker'],
                'views' => 482,
                'days' => 0,
                'accepted' => 'redis-worker-supervisor',
                'blocks' => [
                    ['paragraph', ['text' => 'После деплоя Laravel API задачи появляются в Redis, но обработчик не запускает handle(). Локально всё работает.']],
                    ['code', ['language' => 'env', 'filename' => '.env', 'code' => "QUEUE_CONNECTION=redis\nREDIS_CLIENT=phpredis"]],
                    ['terminal', ['shell' => 'bash', 'cwd' => '~/api', 'command' => 'php artisan queue:work redis --queue=default', 'output' => 'INFO  Processing jobs from the [default] queue.']],
                    ['file_tree', ['title' => 'Docker services', 'tree' => "docker-compose.yml\napp/\nworker/\nredis/"]],
                    ['callout', ['variant' => 'warning', 'title' => 'Подозрение', 'text' => 'Контейнер приложения перезапускается, но отдельный worker-контейнер не всегда поднимается.']],
                ],
                'answers' => [
                    ['key' => 'redis-worker-supervisor', 'author' => 'dmitry', 'accepted' => true, 'ai' => false, 'blocks' => [
                        ['paragraph', ['text' => 'Проверь, что worker запущен отдельным процессом и перезапускается после деплоя. В Docker Compose обычно нужен отдельный service для queue worker.']],
                        ['code', ['language' => 'yaml', 'code' => "queue:\n  build: .\n  command: php artisan queue:work redis --sleep=1 --tries=3\n  depends_on:\n    - redis"]],
                    ]],
                    ['key' => 'redis-cache-clear', 'author' => 'maria', 'accepted' => false, 'ai' => false, 'blocks' => [
                        ['paragraph', ['text' => 'Также проверь config:cache. Если очередь переключалась с sync на redis, контейнер мог продолжить использовать старую конфигурацию.']],
                        ['code', ['language' => 'bash', 'code' => "php artisan config:clear\nphp artisan queue:restart"]],
                    ]],
                    ['key' => 'redis-ai-draft', 'author' => 'ai', 'accepted' => false, 'ai' => true, 'sources' => ['redis-notifications', 'docker-code-playground'], 'blocks' => [
                        ['markdown', ['text' => "Похоже, проблема связана не с Redis, а с жизненным циклом worker-процесса. Проверьте три вещи: отдельный контейнер для очереди, актуальность config cache и команду `queue:restart` после релиза. Если jobs уже лежат в Redis, но не исполняются, значит producer работает, а consumer не запущен или слушает другую очередь."]],
                    ]],
                ],
            ],
            [
                'key' => 'next-cookie-refresh',
                'author' => 'roman',
                'title' => 'Как правильно обновлять access token в Next.js BFF без выхода пользователя?',
                'slug' => 'nextjs-bff-refresh-access-token-without-logout',
                'excerpt' => 'Access token живёт недолго, refresh token лежит в httpOnly cookie, но protected запрос иногда возвращает 401.',
                'tags' => ['next-js', 'jwt', 'api', 'security'],
                'views' => 391,
                'days' => 1,
                'accepted' => 'refresh-middleware-order',
                'blocks' => [
                    ['paragraph', ['text' => 'BFF проксирует запросы в Laravel. После истечения access token пользователь видит 401 вместо автоматического refresh.']],
                    ['code', ['language' => 'ts', 'code' => "await fetch('/api/laravel/me', { credentials: 'include' })"]],
                    ['quote', ['text' => 'Refresh endpoint должен быть доступен именно тогда, когда access token уже истёк.']],
                ],
                'answers' => [
                    ['key' => 'refresh-middleware-order', 'author' => 'ilya', 'accepted' => true, 'ai' => false, 'blocks' => [
                        ['paragraph', ['text' => 'Не закрывай refresh route обычным access-token middleware. BFF должен поймать 401, вызвать refresh endpoint, обновить cookie и повторить исходный запрос.']],
                        ['code', ['language' => 'ts', 'code' => "if (response.status === 401) {\n  await refreshToken();\n  return retryOriginalRequest();\n}"]],
                    ]],
                    ['key' => 'refresh-ai-draft', 'author' => 'ai', 'accepted' => false, 'ai' => true, 'sources' => ['next-bff-auth'], 'blocks' => [
                        ['markdown', ['text' => "Для такой схемы refresh лучше рассматривать как отдельный сценарий BFF, а не как обычный защищённый endpoint. Проверьте порядок middleware, флаги cookie (`httpOnly`, `secure`, `sameSite`) и повтор запроса после успешного обновления access token."]],
                    ]],
                ],
            ],
            [
                'key' => 'jsonb-editor-index',
                'author' => 'vera',
                'title' => 'Стоит ли хранить блоки публикации в jsonb или лучше делать отдельные таблицы под каждый тип?',
                'slug' => 'publication-blocks-jsonb-or-separate-tables',
                'excerpt' => 'Редактор должен поддерживать paragraph, markdown, code, warning, quote и image blocks.',
                'tags' => ['postgresql', 'architecture', 'markdown'],
                'views' => 257,
                'days' => 2,
                'accepted' => 'jsonb-hybrid-answer',
                'blocks' => [
                    ['paragraph', ['text' => 'Сейчас есть таблица publication_blocks с type, sort_order и content jsonb. Хватит ли этого для нормального редактора?']],
                    ['code', ['language' => 'json', 'filename' => 'publication-block.json', 'code' => '{"type":"code","content":{"language":"php","code":"return true;"}}']],
                    ['file_tree', ['title' => 'Блоки редактора', 'tree' => "heading\nparagraph\ncode\nterminal\ndiff\nfile_tree\ncallout"]],
                ],
                'answers' => [
                    ['key' => 'jsonb-hybrid-answer', 'author' => 'sofia', 'accepted' => true, 'ai' => false, 'blocks' => [
                        ['paragraph', ['text' => 'Гибридная модель подходит: type и sort_order остаются колонками, а разные payload-структуры лежат в jsonb. Главное — валидировать content по типу блока.']],
                        ['code', ['language' => 'php', 'code' => "match (\$type) {\n    'code' => ['language' => 'required', 'code' => 'required'],\n    'paragraph' => ['text' => 'required'],\n};"]],
                    ]],
                ],
            ],
            [
                'key' => 'trend-score-periods',
                'author' => 'pavel',
                'title' => 'Как считать популярное за день, неделю и месяц без отдельной аналитической базы?',
                'slug' => 'trend-score-day-week-month-without-analytics-db',
                'excerpt' => 'Нужно вывести на главной популярное за период, но пока вся активность хранится в PostgreSQL.',
                'tags' => ['trends', 'postgresql', 'performance'],
                'views' => 533,
                'days' => 0,
                'accepted' => null,
                'blocks' => [
                    ['paragraph', ['text' => 'Есть реакции, комментарии, ответы и сохранения. Хочу считать score по периоду и показывать вкладки день/неделя/месяц.']],
                    ['code', ['language' => 'php', 'code' => "period = request('period', 'week');\nsince = now()->subWeek();"]],
                ],
                'answers' => [
                    ['key' => 'trend-score-answer', 'author' => 'nina', 'accepted' => false, 'ai' => false, 'blocks' => [
                        ['paragraph', ['text' => 'Для старта используй withCount с условиями по created_at и прозрачную формулу score. Позже можно перенести расчёт в materialized view или отдельную таблицу daily_stats.']],
                    ]],
                ],
            ],
            [
                'key' => 'ai-answer-policy',
                'author' => 'alina',
                'title' => 'Как помечать предварительный ответ от ИИ, чтобы пользователи не путали его с ответом эксперта?',
                'slug' => 'how-to-label-ai-generated-answer-in-qa',
                'excerpt' => 'Нужно встроить AI-ответ в Q&A, но явно показать, что он требует проверки.',
                'tags' => ['ai-tools', 'ui-ux', 'moderation'],
                'views' => 326,
                'days' => 4,
                'accepted' => 'ai-answer-label-answer',
                'blocks' => [
                    ['paragraph', ['text' => 'AI генерирует предварительный ответ на вопрос. Как лучше хранить и отображать такой ответ?']],
                    ['warning', ['text' => 'Пользователь должен понимать, что ответ автоматически сформирован и не гарантирует точность.']],
                ],
                'answers' => [
                    ['key' => 'ai-answer-label-answer', 'author' => 'kirill', 'accepted' => true, 'ai' => false, 'blocks' => [
                        ['paragraph', ['text' => 'Добавь явные поля is_ai_generated, ai_model, ai_sources и ai_feedback_score. В интерфейсе показывай badge “Ответ от ИИ” и предупреждение о проверке.']],
                    ]],
                    ['key' => 'ai-answer-ui-draft', 'author' => 'ai', 'accepted' => false, 'ai' => true, 'sources' => ['ai-question-helper', 'safe-markdown-rendering'], 'blocks' => [
                        ['markdown', ['text' => "Лучше хранить AI-ответ в общей таблице ответов, но отделять его флагом `is_ai_generated`. Так он участвует в обычной ветке обсуждения, но интерфейс может показывать отдельную метку, источники и кнопки обратной связи."]],
                    ]],
                ],
            ],
            [
                'key' => 'postgres-jsonb-search',
                'author' => 'said',
                'title' => 'Как искать по тексту внутри jsonb-блоков публикаций?',
                'slug' => 'search-text-inside-publication-jsonb-blocks',
                'excerpt' => 'Title и excerpt ищутся нормально, но текст в markdown/code blocks не участвует в поиске.',
                'tags' => ['postgresql', 'search', 'markdown'],
                'views' => 205,
                'days' => 5,
                'accepted' => null,
                'blocks' => [
                    ['paragraph', ['text' => 'Публикация состоит из блоков. Нужно, чтобы AI-поиск и обычный поиск находили текст внутри блоков.']],
                    ['code', ['language' => 'sql', 'code' => "select content->>'text' from publication_blocks;"]],
                ],
                'answers' => [
                    ['key' => 'jsonb-search-answer', 'author' => 'sofia', 'accepted' => false, 'ai' => false, 'blocks' => [
                        ['paragraph', ['text' => 'Можно начать с join по publication_blocks и ilike по content::text. Для скорости лучше вынести searchable_text в отдельную колонку или индексируемую витрину.']],
                    ]],
                ],
            ],
            [
                'key' => 'reaction-reputation',
                'author' => 'maria',
                'title' => 'Как начислять репутацию за реакции и при этом не дать пользователям накручивать баллы?',
                'slug' => 'reputation-for-reactions-without-abuse',
                'excerpt' => 'Нужно связать лайки, принятые ответы и комментарии с reputation_events.',
                'tags' => ['reputation', 'moderation', 'architecture'],
                'views' => 438,
                'days' => 6,
                'accepted' => 'reputation-anti-abuse-answer',
                'blocks' => [
                    ['paragraph', ['text' => 'Репутация должна мотивировать полезные ответы, но нельзя начислять баллы за собственные лайки и массовую накрутку.']],
                ],
                'answers' => [
                    ['key' => 'reputation-anti-abuse-answer', 'author' => 'alina', 'accepted' => true, 'ai' => false, 'blocks' => [
                        ['paragraph', ['text' => 'Не начисляй баллы за self-like, ограничь одно действие на пользователя через unique index и логируй каждое изменение в reputation_events.']],
                    ]],
                    ['key' => 'reputation-policy-answer', 'author' => 'nina', 'accepted' => false, 'ai' => false, 'blocks' => [
                        ['paragraph', ['text' => 'Дополнительно можно считать вес реакции выше, если у автора реакции высокая репутация, но для первого релиза хватит простого фиксированного score.']],
                    ]],
                ],
            ],
            [
                'key' => 'sandbox-limits',
                'author' => 'roman',
                'title' => 'Какие ограничения нужны для песочницы кода в community-проекте?',
                'slug' => 'code-playground-runtime-limits-community-project',
                'excerpt' => 'Планирую запускать PHP, JS и Python сниппеты из вопросов, но хочу избежать зависаний и опасных команд.',
                'tags' => ['code-playground', 'docker', 'security'],
                'views' => 312,
                'days' => 8,
                'accepted' => 'sandbox-docker-limits',
                'blocks' => [
                    ['paragraph', ['text' => 'Песочница должна запускать короткие примеры кода, которые пользователи прикрепляют к вопросам.']],
                    ['terminal', ['shell' => 'bash', 'cwd' => '~/playground', 'command' => 'timeout 5s php snippet.php', 'output' => 'Result: 42']],
                    ['callout', ['variant' => 'info', 'title' => 'Сценарий', 'text' => 'Такие блоки удобно прикреплять к вопросу, чтобы участники сразу видели команду запуска и результат.']],
                ],
                'answers' => [
                    ['key' => 'sandbox-docker-limits', 'author' => 'dmitry', 'accepted' => true, 'ai' => false, 'blocks' => [
                        ['paragraph', ['text' => 'Минимум: timeout, memory limit, CPU limit, read-only filesystem, запрет сети и отдельный пользователь внутри контейнера.']],
                    ]],
                ],
            ],
            [
                'key' => 'shadcn-dialog-form',
                'author' => 'said',
                'title' => 'Почему форма в Dialog на shadcn/ui сбрасывается после ошибки валидации?',
                'slug' => 'shadcn-dialog-form-reset-after-validation-error',
                'excerpt' => 'После submit backend возвращает 422, но поля формы очищаются и пользователь теряет введённый текст.',
                'tags' => ['shadcn-ui', 'next-js', 'ui-ux'],
                'views' => 174,
                'days' => 11,
                'accepted' => null,
                'blocks' => [
                    ['paragraph', ['text' => 'Форма создания тега находится в Dialog. Если API возвращает validation error, модалка закрывается и поля сбрасываются.']],
                    ['code', ['language' => 'tsx', 'filename' => 'tag-dialog.tsx', 'code' => "<Dialog open={open} onOpenChange={setOpen}>...</Dialog>"]],
                    ['diff', ['filename' => 'tag-dialog.tsx', 'language' => 'diff', 'code' => "- onOpenChange={setOpen}\n+ onOpenChange={(next) => !pending && setOpen(next)}"]],
                ],
                'answers' => [
                    ['key' => 'dialog-state-answer', 'author' => 'ilya', 'accepted' => false, 'ai' => false, 'blocks' => [
                        ['paragraph', ['text' => 'Закрывай Dialog только после успешного ответа. Ошибки 422 нужно положить в состояние формы и не вызывать setOpen(false).']],
                    ]],
                ],
            ],
            [
                'key' => 'report-flow',
                'author' => 'pavel',
                'title' => 'Как организовать очередь жалоб на публикации и ответы?',
                'slug' => 'reports-review-queue-for-publications-and-answers',
                'excerpt' => 'Нужны статусы жалоб, связь с материалом и уведомление автору после решения модератора.',
                'tags' => ['moderation', 'security', 'api'],
                'views' => 229,
                'days' => 14,
                'accepted' => 'report-status-answer',
                'blocks' => [
                    ['paragraph', ['text' => 'Есть таблица reports, но нужно понять, какие статусы и связи нужны для рабочей модерации.']],
                ],
                'answers' => [
                    ['key' => 'report-status-answer', 'author' => 'admin', 'accepted' => true, 'ai' => false, 'blocks' => [
                        ['paragraph', ['text' => 'Для начала хватит статусов new, reviewed и rejected. Важно хранить reportable_type/reportable_id, reason, details и пользователя, который отправил жалобу.']],
                    ]],
                ],
            ],
            [
                'key' => 'websocket-feed',
                'author' => 'maria',
                'title' => 'Нужно ли обновлять ленту активности через WebSocket или достаточно обычного polling?',
                'slug' => 'activity-feed-websocket-or-polling',
                'excerpt' => 'Хочу показать живую активность на главной, но не перегружать архитектуру.',
                'tags' => ['websocket', 'trends', 'redis'],
                'views' => 284,
                'days' => 17,
                'accepted' => null,
                'blocks' => [
                    ['paragraph', ['text' => 'Лента активности обновляется при ответах, комментариях, лайках и публикациях. Нужно ли сразу подключать WebSocket?']],
                ],
                'answers' => [
                    ['key' => 'polling-first-answer', 'author' => 'dmitry', 'accepted' => false, 'ai' => false, 'blocks' => [
                        ['paragraph', ['text' => 'Для первой версии достаточно polling с коротким интервалом или обновления при навигации. WebSocket нужен, когда важна моментальная доставка.']],
                    ]],
                ],
            ],
            [
                'key' => 'publication-outline',
                'author' => 'vera',
                'title' => 'Какой набор блоков нужен для сильного конструктора публикаций?',
                'slug' => 'publication-builder-block-types-for-developers',
                'excerpt' => 'Нужны code, terminal, diff, file tree, callout и markdown-блоки, чтобы публикации выглядели как техническая документация.',
                'tags' => ['markdown', 'ui-ux', 'code-playground'],
                'views' => 367,
                'days' => 19,
                'accepted' => 'builder-blocks-answer',
                'blocks' => [
                    ['paragraph', ['text' => 'Хочу усилить редактор публикаций под программистов. Какие блоки лучше добавить первыми?']],
                    ['markdown', ['text' => 'Базовые блоки закрывают обычный текст, а специальные блоки нужны для команд, patch-фрагментов, структуры проекта и важных примечаний.']],
                    ['file_tree', ['title' => 'Набор блоков', 'tree' => "content/\n  heading\n  paragraph\n  markdown\nprogramming/\n  code\n  terminal\n  diff\n  file_tree\nnotes/\n  callout\n  warning\n  quote"]],
                ],
                'answers' => [
                    ['key' => 'builder-blocks-answer', 'author' => 'ilya', 'accepted' => true, 'ai' => false, 'blocks' => [
                        ['paragraph', ['text' => 'Для технического сообщества особенно важны terminal, diff, file tree и callout: они показывают не только код, но и команду запуска, структуру проекта, изменение конфигурации и вывод автора.']],
                        ['diff', ['filename' => 'editor-block-types.ts', 'language' => 'diff', 'code' => "+ terminal\n+ diff\n+ file_tree\n+ callout"]],
                    ]],
                ],
            ],
        ];

        foreach ($questions as $questionIndex => $item) {
            $publishedAt = now()->subDays($item['days'])->subHours(($questionIndex % 6) + 1);
            $author = $this->users[$item['author']];

            $question = IssueQuestion::query()->create([
                'author_id' => $author->id,
                'title' => $item['title'],
                'slug' => $item['slug'],
                'excerpt' => $item['excerpt'],
                'status' => IssueQuestionStatus::Published->value,
                'is_solved' => false,
                'views_count' => $item['views'],
                'published_at' => $publishedAt,
                'created_at' => $publishedAt,
                'updated_at' => $publishedAt,
            ]);

            foreach ($item['blocks'] as $blockIndex => [$type, $content]) {
                $question->blocks()->create([
                    'type' => $type,
                    'sort_order' => ($blockIndex + 1) * 10,
                    'content' => $content,
                    'created_at' => $publishedAt,
                    'updated_at' => $publishedAt,
                ]);
            }

            $this->attachTags($question, $item['tags']);
            $this->questions[$item['key']] = $question;

            $this->community->record(
                $author,
                CommunityActivityService::ACTIVITY_QUESTION_CREATED,
                $question,
                null,
                ['tags' => $item['tags'], 'views_count' => $item['views']],
                $question->title,
                $question->excerpt,
                "/questions/{$question->slug}",
                16 + max(0, 15 - $item['days'])
            );

            $this->community->awardReputation($author, 8, CommunityActivityService::REASON_QUESTION_CREATED, $question, $author, [
                'title' => $question->title,
            ]);

            $accepted = null;
            foreach ($item['answers'] as $answerIndex => $answerPayload) {
                $answerAt = $publishedAt->copy()->addHours(2 + $answerIndex * 3);
                $answerAuthor = $this->users[$answerPayload['author']];
                $answer = IssueAnswer::query()->create([
                    'issue_question_id' => $question->id,
                    'author_id' => $answerAuthor->id,
                    'status' => 'published',
                    'is_accepted' => $answerPayload['accepted'],
                    'is_ai_generated' => (bool) ($answerPayload['ai'] ?? false),
                    'ai_model' => ($answerPayload['ai'] ?? false) ? 'Vektor AI Assistant' : null,
                    'ai_sources' => ($answerPayload['ai'] ?? false) ? $this->sourcePayload($answerPayload['sources'] ?? []) : null,
                    'ai_feedback_score' => ($answerPayload['ai'] ?? false) ? ($answerIndex % 2 === 0 ? 4 : 2) : 0,
                    'created_at' => $answerAt,
                    'updated_at' => $answerAt,
                ]);

                foreach ($answerPayload['blocks'] as $blockIndex => [$type, $content]) {
                    $answer->blocks()->create([
                        'type' => $type,
                        'sort_order' => ($blockIndex + 1) * 10,
                        'content' => $content,
                        'created_at' => $answerAt,
                        'updated_at' => $answerAt,
                    ]);
                }

                $this->answers[$answerPayload['key']] = $answer;

                $this->community->record(
                    $answerAuthor,
                    CommunityActivityService::ACTIVITY_ANSWER_CREATED,
                    $answer,
                    $question,
                    ['question_id' => $question->id, 'is_ai_generated' => (bool) ($answerPayload['ai'] ?? false)],
                    ($answerPayload['ai'] ?? false) ? 'Сформирован предварительный ответ от ИИ' : 'Добавлен ответ на вопрос',
                    $question->title,
                    "/questions/{$question->slug}#answer-{$answer->id}",
                    ($answerPayload['ai'] ?? false) ? 6 : 14
                );

                if (! ($answerPayload['ai'] ?? false)) {
                    $this->community->awardReputation($answerAuthor, 12, CommunityActivityService::REASON_ANSWER_CREATED, $answer, $answerAuthor, [
                        'question_id' => $question->id,
                    ]);

                    $this->community->notify(
                        $author,
                        'question_answered',
                        'На ваш вопрос добавили ответ',
                        $answerAuthor->name . ' ответил на вопрос «' . $question->title . '».',
                        "/questions/{$question->slug}#answer-{$answer->id}",
                        ['question_id' => $question->id, 'answer_id' => $answer->id],
                        $answerAuthor
                    );
                }

                if ($answerPayload['accepted']) {
                    $accepted = $answer;
                }
            }

            if ($accepted) {
                $question->update([
                    'is_solved' => true,
                    'accepted_answer_id' => $accepted->id,
                    'updated_at' => $accepted->created_at->copy()->addMinutes(40),
                ]);

                $this->community->record(
                    $question->author,
                    CommunityActivityService::ACTIVITY_ANSWER_ACCEPTED,
                    $accepted,
                    $question,
                    ['question_id' => $question->id, 'answer_id' => $accepted->id],
                    'Ответ выбран решением',
                    $question->title,
                    "/questions/{$question->slug}#answer-{$accepted->id}",
                    24
                );

                $this->community->awardReputation($accepted->author, 25, CommunityActivityService::REASON_ANSWER_ACCEPTED, $accepted, $question->author, [
                    'question_id' => $question->id,
                ]);
            }
        }
    }



    private function seedOpenQuestions(): void
    {
        $items = [
            [
                'key' => 'ai-search-filters',
                'author' => 'said',
                'title' => 'Как объединить AI-поиск, обычные фильтры и теги в одной строке поиска?',
                'slug' => 'combine-ai-search-filters-and-tags',
                'excerpt' => 'Хочу, чтобы пользователь писал обычный запрос, а система одновременно находила материалы, предлагала теги и уточняла фильтры.',
                'tags' => ['ai-tools', 'search', 'ui-ux'],
                'views' => 91,
                'hours' => 5,
                'blocks' => [
                    ['paragraph', ['text' => 'Поиск должен принимать фразу вроде “Laravel Redis очередь не работает” и возвращать публикации, вопросы и релевантные теги.']],
                    ['markdown', ['text' => 'Нужны подсказки: похожие вопросы, материалы по тегам, авторы-эксперты и фильтры по типу контента.']],
                ],
            ],
            [
                'key' => 'terminal-block-renderer',
                'author' => 'vera',
                'title' => 'Как лучше хранить terminal block и diff block в редакторе публикаций?',
                'slug' => 'terminal-and-diff-block-storage-in-publication-editor',
                'excerpt' => 'Планирую добавить блоки терминала и diff, но хочу сохранить совместимость с текущим block renderer.',
                'tags' => ['markdown', 'ui-ux', 'code-playground'],
                'views' => 68,
                'hours' => 9,
                'blocks' => [
                    ['paragraph', ['text' => 'Code block хранит язык и исходный код. Terminal block хранит команду и вывод, diff block — файл и patch, а callout — краткий вывод или предупреждение.']],
                    ['terminal', ['shell' => 'bash', 'cwd' => '~/vektor', 'command' => 'php artisan test', 'output' => 'PASS  Tests\\Feature\\CommunityFeedTest\nTests: 24 passed']],
                    ['diff', ['filename' => 'types.ts', 'language' => 'diff', 'code' => "+ | 'terminal'\n+ | 'diff'\n+ | 'file_tree'\n+ | 'callout'"]],
                ],
            ],
            [
                'key' => 'tag-recommendation-cold-start',
                'author' => 'nina',
                'title' => 'Как строить рекомендации для нового пользователя без истории действий?',
                'slug' => 'recommendations-cold-start-for-new-user',
                'excerpt' => 'У пользователя ещё нет подписок, сохранений и реакций, но главная страница должна быть полезной.',
                'tags' => ['recommendations', 'trends', 'architecture'],
                'views' => 144,
                'hours' => 16,
                'blocks' => [
                    ['paragraph', ['text' => 'Для cold start можно использовать общие тренды, популярные теги и свежие вопросы без ответа. Но хочется сделать это аккуратно.']],
                ],
            ],
            [
                'key' => 'notification-digest',
                'author' => 'roman',
                'title' => 'Нужен ли дайджест уведомлений, если есть inbox и realtime-события?',
                'slug' => 'notification-digest-vs-inbox-realtime',
                'excerpt' => 'Пользователь может получать много уведомлений о комментариях, подписках и изменении репутации.',
                'tags' => ['websocket', 'reputation', 'ui-ux'],
                'views' => 83,
                'hours' => 22,
                'blocks' => [
                    ['paragraph', ['text' => 'Думаю добавить настройки: мгновенные уведомления, только inbox или ежедневный дайджест. Как это лучше спроектировать?']],
                ],
            ],
        ];

        foreach ($items as $index => $item) {
            $publishedAt = now()->subHours($item['hours']);
            $author = $this->users[$item['author']];

            $question = IssueQuestion::query()->create([
                'author_id' => $author->id,
                'title' => $item['title'],
                'slug' => $item['slug'],
                'excerpt' => $item['excerpt'],
                'status' => IssueQuestionStatus::Published->value,
                'is_solved' => false,
                'views_count' => $item['views'],
                'published_at' => $publishedAt,
                'created_at' => $publishedAt,
                'updated_at' => $publishedAt,
            ]);

            foreach ($item['blocks'] as $blockIndex => [$type, $content]) {
                $question->blocks()->create([
                    'type' => $type,
                    'sort_order' => ($blockIndex + 1) * 10,
                    'content' => $content,
                    'created_at' => $publishedAt,
                    'updated_at' => $publishedAt,
                ]);
            }

            $this->attachTags($question, $item['tags']);
            $this->questions[$item['key']] = $question;

            $this->community->record(
                $author,
                CommunityActivityService::ACTIVITY_QUESTION_CREATED,
                $question,
                null,
                ['tags' => $item['tags'], 'unanswered' => true],
                $question->title,
                $question->excerpt,
                "/questions/{$question->slug}",
                22 - $index
            );

            $this->community->awardReputation($author, 8, CommunityActivityService::REASON_QUESTION_CREATED, $question, $author, [
                'title' => $question->title,
            ]);
        }
    }

    private function seedSubscriptions(): void
    {
        $pairs = [
            ['said', 'tag', 'laravel'], ['said', 'tag', 'next-js'], ['said', 'tag', 'code-playground'],
            ['maria', 'tag', 'queues'], ['maria', 'tag', 'postgresql'], ['maria', 'user', 'sofia'],
            ['ilya', 'tag', 'next-js'], ['ilya', 'tag', 'shadcn-ui'], ['ilya', 'user', 'vera'],
            ['alina', 'tag', 'reputation'], ['alina', 'tag', 'moderation'], ['alina', 'user', 'said'],
            ['dmitry', 'tag', 'docker'], ['dmitry', 'tag', 'redis'], ['dmitry', 'tag', 'websocket'],
            ['sofia', 'tag', 'search'], ['sofia', 'tag', 'postgresql'], ['sofia', 'user', 'nina'],
            ['nina', 'tag', 'recommendations'], ['nina', 'tag', 'trends'], ['nina', 'question', 'trend-score-periods'],
            ['pavel', 'question', 'report-flow'], ['vera', 'question', 'publication-outline'], ['roman', 'question', 'sandbox-limits'],
        ];

        foreach ($pairs as [$userKey, $kind, $targetKey]) {
            $user = $this->users[$userKey];
            $target = match ($kind) {
                'tag' => $this->tags[$targetKey],
                'user' => $this->users[$targetKey],
                'question' => $this->questions[$targetKey],
            };

            $subscription = Subscription::query()->firstOrCreate([
                'user_id' => $user->id,
                'subscribable_type' => $target->getMorphClass(),
                'subscribable_id' => $target->getKey(),
            ], [
                'created_at' => now()->subDays(rand(1, 18)),
                'updated_at' => now()->subDays(rand(0, 5)),
            ]);

            $this->community->record(
                $user,
                CommunityActivityService::ACTIVITY_SUBSCRIPTION_CREATED,
                $subscription,
                $target,
                ['target_type' => $target->getMorphClass(), 'target_id' => $target->getKey()],
                'Добавлена подписка',
                $this->subscriptionDescription($target),
                $this->community->sourceLink($target),
                5
            );
        }
    }

    private function seedComments(): void
    {
        $commentSets = [
            ['publication', 'activity-feed-laravel', 'maria', 'Такой слой событий удобно использовать ещё и для профиля пользователя: можно показывать вкладку активности без сложных join.'],
            ['publication', 'activity-feed-laravel', 'pavel', 'Для тестов стоит проверять не только создание записи, но и корректный link на исходный материал.'],
            ['publication', 'ai-question-helper', 'said', 'Подсказка похожих вопросов особенно полезна перед публикацией, чтобы не плодить дубликаты.'],
            ['publication', 'postgre-fulltext', 'dmitry', 'Для небольшого проекта PostgreSQL действительно закрывает большую часть задач поиска.'],
            ['publication', 'redis-notifications', 'maria', 'Важный момент: уведомления лучше сохранять в транзакции вместе с доменным событием.'],
            ['publication', 'safe-markdown-rendering', 'ilya', 'На фронтенде ещё нужно разделять markdown preview и итоговый renderer.'],
            ['question', 'trend-score-periods', 'sofia', 'Можно добавить коэффициент свежести, который уменьшается через несколько дней после публикации.'],
            ['question', 'postgres-jsonb-search', 'kirill', 'Не забудь убрать HTML перед индексированием, иначе поиск начнёт находить служебную разметку.'],
            ['answer', 'redis-worker-supervisor', 'said', 'После отдельного queue service jobs начали обрабатываться, спасибо.'],
            ['answer', 'refresh-middleware-order', 'roman', 'Проблема была именно в middleware для refresh route.'],
            ['answer', 'ai-answer-label-answer', 'vera', 'Хорошо, что AI-ответ хранится в общей ветке, но визуально отделён от ответов участников.'],
        ];

        foreach ($commentSets as $index => [$kind, $targetKey, $userKey, $text]) {
            $target = match ($kind) {
                'publication' => $this->publications[$targetKey],
                'question' => $this->questions[$targetKey],
                'answer' => $this->answers[$targetKey],
            };
            $user = $this->users[$userKey];

            $comment = $this->createComment($target, $user, $text, null, now()->subHours(36 - $index));

            if ($index % 3 === 0) {
                $this->createComment($target, $this->users['alina'], 'Согласна, это улучшает качество обсуждения и помогает другим участникам быстрее разобраться в теме.', $comment, now()->subHours(34 - $index));
            }
        }
    }

    private function seedReactionsAndSavedItems(): void
    {
        $reactionUsers = ['maria', 'ilya', 'alina', 'said', 'dmitry', 'sofia', 'kirill', 'nina', 'roman', 'vera', 'pavel'];

        foreach (array_values($this->publications) as $index => $publication) {
            $count = 4 + ($index % 6);
            foreach (array_slice($reactionUsers, $index % 3, $count) as $userKey) {
                if ($this->users[$userKey]->id !== $publication->author_id) {
                    $this->react($publication, $this->users[$userKey], Reaction::LIKE, now()->subHours($index + strlen($userKey)));
                }
            }

            if ($index % 4 === 0) {
                $this->react($publication, $this->users['pavel'], Reaction::DISLIKE, now()->subHours($index + 3));
            }

            foreach (array_slice($reactionUsers, 0, 2 + ($index % 4)) as $userKey) {
                $this->save($publication, $this->users[$userKey], now()->subDays($index % 10));
            }
        }

        foreach (array_values($this->questions) as $index => $question) {
            $count = 3 + ($index % 5);
            foreach (array_slice($reactionUsers, ($index + 2) % 4, $count) as $userKey) {
                if ($this->users[$userKey]->id !== $question->author_id) {
                    $this->react($question, $this->users[$userKey], Reaction::LIKE, now()->subHours($index + strlen($userKey)));
                }
            }

            if ($index % 3 === 0) {
                $this->save($question, $this->users['vera'], now()->subDays(($index % 6) + 1));
            }
        }

        foreach (array_values($this->answers) as $index => $answer) {
            if ($answer->is_ai_generated) {
                continue;
            }

            foreach (array_slice($reactionUsers, $index % 5, 3) as $userKey) {
                if ($this->users[$userKey]->id !== $answer->author_id) {
                    $this->react($answer, $this->users[$userKey], Reaction::LIKE, now()->subHours($index + strlen($userKey)));
                }
            }

            if ($index % 2 === 0) {
                $this->save($answer, $this->users['said'], now()->subDays($index % 7));
            }
        }
    }


    private function seedCodePlayground(): void
    {
        $snippets = [
            [
                'key' => 'redis-php',
                'author' => 'dmitry',
                'title' => 'Проверка подключения к Redis через PHP',
                'language' => 'php',
                'code' => <<<'PHP'
$host = getenv('REDIS_HOST') ?: 'redis';
$port = getenv('REDIS_PORT') ?: 6379;

echo "Redis endpoint: {$host}:{$port}\n";
echo "Queue driver: redis\n";
PHP,
                'stdin' => null,
                'stdout' => "Redis endpoint: redis:6379\nQueue driver: redis\n",
                'visibility' => 'public',
            ],
            [
                'key' => 'trend-score-js',
                'author' => 'ilya',
                'title' => 'Форматирование ответа API для карточки публикации',
                'language' => 'javascript',
                'code' => <<<'JS'
const publication = {
  title: 'Activity Feed',
  reactions: 12,
  comments: 5,
  views: 240,
};

const score = publication.reactions * 3 + publication.comments * 4 + publication.views * 0.2;
console.log(`${publication.title}: ${score}`);
JS,
                'stdin' => null,
                'stdout' => "Activity Feed: 104\n",
                'visibility' => 'public',
            ],
            [
                'key' => 'normalize-query-python',
                'author' => 'sofia',
                'title' => 'Нормализация поискового запроса',
                'language' => 'python',
                'code' => <<<'PY'
query = input().strip().lower()
terms = [part for part in query.replace(',', ' ').split() if len(part) > 2]
print('|'.join(dict.fromkeys(terms)))
PY,
                'stdin' => 'Laravel Redis queue redis laravel',
                'stdout' => "laravel|redis|queue\n",
                'visibility' => 'public',
            ],
            [
                'key' => 'escape-html-php',
                'author' => 'kirill',
                'title' => 'Безопасное экранирование HTML в пользовательском вводе',
                'language' => 'php',
                'code' => <<<'PHP'
$input = '<script>alert("xss")</script>';
echo htmlspecialchars($input, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
PHP,
                'stdin' => null,
                'stdout' => "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;\n",
                'visibility' => 'public',
            ],
        ];

        foreach ($snippets as $index => $item) {
            $snippet = CodeSnippet::query()->create([
                'user_id' => $this->users[$item['author']]->id,
                'title' => $item['title'],
                'language' => $item['language'],
                'code' => $item['code'],
                'stdin' => $item['stdin'],
                'visibility' => $item['visibility'],
                'status' => 'active',
                'last_run_status' => 'finished',
                'last_run_at' => now()->subHours($index + 2),
                'created_at' => now()->subDays($index + 1),
                'updated_at' => now()->subHours($index + 2),
            ]);

            $this->snippets[$item['key']] = $snippet;

            CodeRun::query()->create([
                'user_id' => $snippet->user_id,
                'code_snippet_id' => $snippet->id,
                'language' => $snippet->language,
                'code' => $snippet->code,
                'stdin' => $snippet->stdin,
                'status' => 'finished',
                'stdout' => $item['stdout'],
                'stderr' => '',
                'exit_code' => 0,
                'message' => null,
                'execution_time' => 80 + ($index * 24),
                'memory_usage' => 0,
                'started_at' => now()->subHours($index + 2)->subSeconds(3),
                'finished_at' => now()->subHours($index + 2),
                'created_at' => now()->subHours($index + 2),
                'updated_at' => now()->subHours($index + 2),
            ]);

            $this->community->record(
                $snippet->user,
                CommunityActivityService::ACTIVITY_CODE_SNIPPET_CREATED,
                $snippet,
                null,
                ['language' => $snippet->language],
                null,
                'Участник сохранил публичный пример кода в песочнице.',
                "/playground?snippet={$snippet->id}",
                8
            );
        }
    }

    private function seedReports(): void
    {
        $this->report($this->publications['safe-markdown-rendering'], $this->users['said'], Report::REASON_OTHER, 'Прошу проверить пример санитайзера: в текущем виде он выглядит слишком общим для production-кода.', Report::STATUS_REVIEWED);
        $this->report($this->answers['jsonb-search-answer'], $this->users['kirill'], Report::REASON_MISINFORMATION, 'В ответе стоит уточнить риски поиска по content::text на большом объёме данных.', Report::STATUS_NEW);
        $this->report($this->questions['shadcn-dialog-form'], $this->users['alina'], Report::REASON_OTHER, 'Вопрос полезный, но автору стоит добавить версию react-hook-form и пример submit handler.', Report::STATUS_REJECTED);
    }

    private function seedNotifications(): void
    {
        $this->community->notify($this->users['said'], 'recommendation_created', 'Подобраны материалы по Laravel и Redis', 'В ленте появились публикации и вопросы по темам, на которые вы подписаны.', '/?view=for-you', ['tags' => ['Laravel', 'Redis']], $this->users['ai']);
        $this->community->notify($this->users['maria'], 'author_publication', 'Ваша публикация попала в тренды', 'Материал про репутацию активно сохраняют и обсуждают.', '/publications/recommendation-score-tags-freshness-usefulness', ['period' => 'week'], $this->users['nina']);
        $this->community->notify($this->users['admin'], 'moderation_update', 'В очереди есть новая жалоба', 'Проверьте ответ по поиску внутри jsonb-блоков.', '/moderation/reports', ['reports_count' => 1], $this->users['kirill']);

        CommunityNotification::query()
            ->where('user_id', $this->users['maria']->id)
            ->latest()
            ->limit(1)
            ->update(['read_at' => now()->subHours(2)]);
    }

    private function createComment(Model $target, User $user, string $content, ?Comment $parent = null, ?CarbonInterface $createdAt = null): Comment
    {
        $createdAt ??= now();

        $comment = Comment::query()->create([
            'user_id' => $user->id,
            'commentable_type' => $target->getMorphClass(),
            'commentable_id' => $target->getKey(),
            'parent_id' => $parent?->id,
            'content' => $content,
            'status' => Comment::STATUS_PUBLISHED,
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ]);

        $this->community->record(
            $user,
            CommunityActivityService::ACTIVITY_COMMENT_CREATED,
            $comment,
            $target,
            ['parent_id' => $parent?->id],
            $parent ? 'Добавлен ответ на комментарий' : 'Добавлен комментарий',
            Str::limit($content, 140),
            $this->community->sourceLink($comment),
            $parent ? 7 : 9
        );

        $this->community->awardReputation($user, 3, CommunityActivityService::REASON_COMMENT_CREATED, $comment, $user, [
            'target_type' => $target->getMorphClass(),
        ]);

        return $comment;
    }

    private function react(Model $target, User $user, string $type, ?CarbonInterface $createdAt = null): void
    {
        $createdAt ??= now();

        $reaction = Reaction::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'reactable_type' => $target->getMorphClass(),
                'reactable_id' => $target->getKey(),
            ],
            [
                'type' => $type,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]
        );

        $this->community->record(
            $user,
            CommunityActivityService::ACTIVITY_REACTION_ADDED,
            $reaction,
            $target,
            ['reaction' => $type],
            $type === Reaction::LIKE ? 'Материал получил полезную реакцию' : 'Материал получил отрицательную реакцию',
            $this->targetTitle($target),
            $this->community->sourceLink($target),
            $type === Reaction::LIKE ? 6 : 2
        );

        if ($type === Reaction::LIKE && $owner = $this->targetAuthor($target)) {
            $this->community->awardReputation($owner, 2, CommunityActivityService::REASON_LIKE_RECEIVED, $target, $user, [
                'reaction_id' => $reaction->id,
            ]);
        }
    }

    private function save(Model $target, User $user, ?CarbonInterface $createdAt = null): void
    {
        $createdAt ??= now();

        SavedItem::query()->firstOrCreate([
            'user_id' => $user->id,
            'saveable_type' => $target->getMorphClass(),
            'saveable_id' => $target->getKey(),
        ], [
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ]);
    }

    private function report(Model $target, User $user, string $reason, string $details, string $status): void
    {
        Report::query()->create([
            'user_id' => $user->id,
            'reportable_type' => $target->getMorphClass(),
            'reportable_id' => $target->getKey(),
            'reason' => $reason,
            'details' => $details,
            'status' => $status,
            'created_at' => now()->subDays(2),
            'updated_at' => now()->subDay(),
        ]);
    }

    /**
     * @param array<int, string> $tagSlugs
     */
    private function attachTags(Model $model, array $tagSlugs): void
    {
        if (! method_exists($model, 'tags')) {
            return;
        }

        $ids = collect($tagSlugs)
            ->map(fn (string $slug) => isset($this->tags[$slug]) ? $this->tags[$slug]->id : null)
            ->filter()
            ->values()
            ->all();

        $model->tags()->syncWithoutDetaching($ids);
    }

    /**
     * @param array<int, string> $publicationKeys
     * @return array<int, array{id:int,title:string,href:string}>
     */
    private function sourcePayload(array $publicationKeys): array
    {
        return collect($publicationKeys)
            ->map(fn (string $key) => $this->publications[$key] ?? null)
            ->filter()
            ->map(fn (Publication $publication) => [
                'id' => $publication->id,
                'title' => $publication->title,
                'href' => "/publications/{$publication->slug}",
            ])
            ->values()
            ->all();
    }

    private function targetAuthor(Model $target): ?User
    {
        if ($target instanceof Publication || $target instanceof IssueQuestion) {
            return $target->author;
        }

        if ($target instanceof IssueAnswer) {
            return $target->author;
        }

        return null;
    }

    private function targetTitle(Model $target): string
    {
        if ($target instanceof Publication || $target instanceof IssueQuestion) {
            return $target->title;
        }

        if ($target instanceof IssueAnswer) {
            return $target->question?->title ?? 'Ответ в обсуждении';
        }

        return 'Материал сообщества';
    }

    private function subscriptionDescription(Model $target): string
    {
        if ($target instanceof Tag) {
            return 'Подписка на тему #' . $target->name;
        }

        if ($target instanceof User) {
            return 'Подписка на автора ' . $target->name;
        }

        if ($target instanceof IssueQuestion) {
            return 'Подписка на обсуждение «' . $target->title . '»';
        }

        return 'Подписка на обновления';
    }

    private function seedSocialAndChats(): void
    {
        $pairs = [
            ['maria', 'ilya'],
            ['maria', 'dmitry'],
            ['ilya', 'alina'],
            ['said', 'alina'],
            ['nina', 'vera'],
            ['sofia', 'kirill'],
        ];

        foreach ($pairs as [$a, $b]) {
            [$one, $two] = Friendship::orderedPair((int) $this->users[$a]->id, (int) $this->users[$b]->id);
            Friendship::query()->firstOrCreate([
                'user_one_id' => $one,
                'user_two_id' => $two,
            ], [
                'requested_by_id' => $this->users[$a]->id,
                'friended_at' => now()->subDays(rand(1, 14)),
                'created_at' => now()->subDays(rand(1, 14)),
                'updated_at' => now()->subDays(1),
            ]);
        }

        FriendRequest::query()->create([
            'sender_id' => $this->users['pavel']->id,
            'recipient_id' => $this->users['said']->id,
            'status' => FriendRequest::STATUS_PENDING,
            'message' => 'Хочу обсудить чек-лист для проверки Q&A-модуля.',
            'created_at' => now()->subHours(5),
            'updated_at' => now()->subHours(5),
        ]);

        FriendRequest::query()->create([
            'sender_id' => $this->users['roman']->id,
            'recipient_id' => $this->users['ilya']->id,
            'status' => FriendRequest::STATUS_PENDING,
            'message' => 'Интересует адаптация интерфейса под мобильный клиент.',
            'created_at' => now()->subHours(9),
            'updated_at' => now()->subHours(9),
        ]);

        $direct = $this->directConversation('maria', 'dmitry');
        $this->message($direct, 'maria', 'Привет! Посмотрела ошибку с очередями: похоже, worker слушает не тот queue name.', now()->subHours(6));
        $this->message($direct, 'dmitry', 'Да, в deploy-конфиге был default, а job уходит в code-runs. Исправляю supervisor.', now()->subHours(5)->subMinutes(40));
        $this->message($direct, 'maria', 'После правки проверь ещё Reverb: результат запуска должен прилетать через playground.run.finished.', now()->subHours(5));

        $group = ChatConversation::query()->create([
            'type' => ChatConversation::TYPE_GROUP,
            'owner_id' => $this->users['nina']->id,
            'title' => 'Редакция и рекомендации',
            'description' => 'Обсуждение качества публикаций, рекомендаций и AI-подсказок.',
            'last_message_at' => now()->subMinutes(25),
            'created_at' => now()->subDays(2),
            'updated_at' => now()->subMinutes(25),
        ]);

        foreach (['nina', 'vera', 'ilya', 'alina'] as $key) {
            ChatParticipant::query()->create([
                'chat_conversation_id' => $group->id,
                'user_id' => $this->users[$key]->id,
                'role' => $key === 'nina' ? ChatParticipant::ROLE_OWNER : ChatParticipant::ROLE_MEMBER,
                'last_read_at' => $key === 'alina' ? now()->subHours(1) : now()->subMinutes(10),
                'joined_at' => now()->subDays(2),
                'created_at' => now()->subDays(2),
                'updated_at' => now()->subMinutes(25),
            ]);
        }

        $this->message($group, 'nina', 'Предлагаю в рекомендациях сильнее учитывать выбранные интересы и сохранённые вопросы.', now()->subHours(2));
        $this->message($group, 'vera', 'Да, и в редакторе публикаций лучше показывать подсказки по структуре до публикации.', now()->subHour());
        $last = $this->message($group, 'ilya', 'На фронте можно отдать это как отдельную вкладку “Для вас”, без ленты активности.', now()->subMinutes(25));

        $group->forceFill([
            'last_message_id' => $last->id,
            'last_message_at' => $last->created_at,
        ])->save();
    }

    private function directConversation(string $first, string $second): ChatConversation
    {
        $firstId = (int) $this->users[$first]->id;
        $secondId = (int) $this->users[$second]->id;
        $key = $firstId < $secondId ? "{$firstId}:{$secondId}" : "{$secondId}:{$firstId}";

        $conversation = ChatConversation::query()->create([
            'type' => ChatConversation::TYPE_DIRECT,
            'owner_id' => $firstId,
            'direct_key' => $key,
            'last_message_at' => now()->subHours(5),
            'created_at' => now()->subDays(1),
            'updated_at' => now()->subHours(5),
        ]);

        foreach ([$firstId, $secondId] as $userId) {
            ChatParticipant::query()->create([
                'chat_conversation_id' => $conversation->id,
                'user_id' => $userId,
                'role' => ChatParticipant::ROLE_MEMBER,
                'last_read_at' => $userId === $firstId ? now()->subHours(4) : now()->subHours(6),
                'joined_at' => now()->subDays(1),
                'created_at' => now()->subDays(1),
                'updated_at' => now()->subHours(5),
            ]);
        }

        return $conversation;
    }

    private function message(ChatConversation $conversation, string $sender, string $body, \DateTimeInterface $createdAt): ChatMessage
    {
        $message = ChatMessage::query()->create([
            'chat_conversation_id' => $conversation->id,
            'sender_id' => $this->users[$sender]->id,
            'type' => ChatMessage::TYPE_TEXT,
            'body' => $body,
            'metadata' => [],
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ]);

        $conversation->forceFill([
            'last_message_id' => $message->id,
            'last_message_at' => $message->created_at,
        ])->save();

        return $message;
    }

    private function rebuildAiKnowledgeIndex(): void
    {
        app(KnowledgeExtractorService::class)->rebuild();
    }

}
