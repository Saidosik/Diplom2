# Анализ вариантов использования платформы «Вектор»

## 1. Назначение системы

«Вектор» — информационное сообщество программистов: веб-платформа с публичной лентой, публикациями, вопросами и ответами, тегами, профилями участников, репутацией, уведомлениями, социальными связями, чатами, AI-помощником и песочницей для запуска кода. Название и описание подтверждены метаданными приложения и компонентом бренда (`frontend/src/app/layout.tsx`, `frontend/src/components/layout/site-brand.tsx`).

## 2. Найденные акторы

| Актор | Тип | Подтверждение | Комментарий |
| --- | --- | --- | --- |
| Посетитель | пользовательская роль | публичные маршруты API (`backend/routes/api.php`) и публичные пункты навигации (`frontend/src/config/navigation.ts`) | Может читать публичный контент, искать, регистрироваться и входить. |
| Зарегистрированный пользователь | пользовательская роль | защищённая группа `jwt` + `email_verified` в `backend/routes/api.php` | Имеет доступ к профилю, файлам, публикациям, Q&A, чатам, AI и песочнице. |
| Сотрудник | обобщённая роль | `AdminMiddleware` допускает `isStaff()` (`backend/app/Http/Middleware/AdminMiddleware.php`, `backend/app/Models/User.php`) | Общая роль для администратора и модератора. |
| Модератор | пользовательская роль | роль `moderator` в модели/миграциях (`backend/app/Models/User.php`, `backend/database/migrations/0001_01_01_000000_create_users_table.php`) | Специализация сотрудника. |
| Администратор | пользовательская роль | роль `admin`, middleware `system_admin` (`backend/app/Models/User.php`, `backend/app/Http/Middleware/SystemAdminMiddleware.php`) | Специализация сотрудника с системными действиями. |
| OAuth-провайдер (Google/Yandex) | внешняя система | `SocialAuthController`, `config/services.php` | Используется для входа через Google/Yandex. |
| Почтовый сервис | внешняя система | Laravel notifications/password reset, `config/mail.php`, `config/services.php` | Используется для писем подтверждения email и сброса пароля. |
| AI-провайдер | внешняя система | `config/ai.php`, `AiSdkService`, AI-маршруты | Используется для RAG, чата, ассистирования и объяснения кода. |
| Изолированная среда выполнения кода | внешняя исполняющая среда | `DockerCodeRunner`, `CodePlaygroundController` | Пользователь инициирует запуск кода, выполнение происходит в изолированном Docker-контейнере. |

## 3. Варианты использования

Диаграмма содержит 20 бизнес-ориентированных use cases, чтобы не превращать её в список endpoints.

### Публичные и аутентификационные сценарии

1. **Просматривать ленту и материалы** — публичный просмотр ленты, публикаций, вопросов, тегов, трендов и рекомендаций.
2. **Искать материалы и участников** — глобальный поиск по контенту и пользователям.
3. **Просматривать публичный профиль** — просмотр профиля, публикаций, вопросов, ответов, комментариев и репутации пользователя.
4. **Зарегистрироваться и подтвердить email** — регистрация с принятием политики и отправкой письма подтверждения.
5. **Войти в систему** — вход по email/паролю и получение JWT.
6. **Войти через OAuth** — альтернативный вход/создание пользователя через Google или Yandex.
7. **Восстановить пароль** — запрос ссылки сброса и установка нового пароля.
8. **Отправить email-уведомление** — общий обязательный подпроцесс отправки письма для регистрации/подтверждения и восстановления пароля.

### Сценарии зарегистрированного пользователя

9. **Управлять профилем и файлами** — просмотр/редактирование профиля, аватара, удаление аккаунта, загрузка и управление пользовательскими файлами.
10. **Создавать и вести публикации** — создание, редактирование, удаление и просмотр своих публикаций.
11. **Задавать вопросы и отвечать** — создание/редактирование вопросов и ответов, принятие ответа.
12. **Взаимодействовать с контентом** — комментарии, реакции, жалобы, сохранённые материалы и подписки.
13. **Настраивать интересы и уведомления** — интересы по тегам, уведомления, настройки уведомлений, события репутации.
14. **Общаться с участниками** — друзья, заявки в друзья, присутствие, прямые и групповые чаты.
15. **Работать с AI-помощником** — AI-чат, RAG-поиск, ассистирование вопросов/публикаций/ответов, объяснение кода.
16. **Запускать код в песочнице** — запуск кода, работа со сниппетами и историей запусков.

### Сценарии сотрудников и администратора

17. **Модерировать жалобы** — просмотр и изменение статусов жалоб.
18. **Модерировать контент и чаты** — модерация публикаций, вопросов, ответов, комментариев, чатов и сообщений.
19. **Управлять пользователями и тегами** — просмотр/изменение/удаление/восстановление пользователей, CRUD тегов.
20. **Управлять AI-индексом, логами и правовыми страницами** — системные действия администратора: перестроение AI-индекса, просмотр логов, редактирование правовых страниц.

## 4. Отношения UML

### Generalization

* `Зарегистрированный пользователь --|> Посетитель`: зарегистрированный пользователь наследует публичные возможности посетителя.
* `Сотрудник --|> Зарегистрированный пользователь`: сотрудник является авторизованным пользователем с дополнительными правами.
* `Модератор --|> Сотрудник`: роль `moderator` входит в `isStaff()`.
* `Администратор --|> Сотрудник`: роль `admin` входит в `isStaff()` и имеет дополнительные системные действия.

### Association

Ассоциации проведены от акторов к тем use cases, которые они инициируют или в которых участвуют. Внешние сервисы находятся за границей системы и соединены только с соответствующими сценариями: OAuth — с OAuth-входом, почтовый сервис — с отправкой писем, AI-провайдер — с AI-помощником, изолированная среда — с запуском кода.

### `<<include>>`

* `Зарегистрироваться и подтвердить email ..> Отправить email-уведомление`: регистрация всегда вызывает `sendEmailVerificationNotification()`.
* `Восстановить пароль ..> Отправить email-уведомление`: запрос восстановления всегда пытается отправить reset link через Laravel Password Broker.

### `<<extend>>`

* `Войти через OAuth ..> Войти в систему`: OAuth-вход является альтернативным/условным способом аутентификации, доступным только при выборе провайдера Google/Yandex.

## 5. Подтверждение основных use cases файлами проекта

| Use case | Подтверждающие файлы |
| --- | --- |
| Просматривать ленту и материалы | `backend/routes/api.php`, `backend/app/Http/Controllers/Api/Community/CommunityDiscoveryController.php`, `backend/app/Http/Controllers/Api/Publication/PublicationController.php`, `backend/app/Http/Controllers/Api/Issue/IssueQuestionController.php`, `frontend/src/config/navigation.ts` |
| Искать материалы и участников | `backend/routes/api.php`, `backend/app/Http/Controllers/Api/Search/GlobalSearchController.php`, `frontend/src/features/search/api.ts`, `frontend/src/app/(main)/search/page.tsx` |
| Просматривать публичный профиль | `backend/routes/api.php`, `backend/app/Http/Controllers/Api/User/PublicProfileController.php`, `frontend/src/features/users/api.ts`, `frontend/src/app/(main)/users/page.tsx` |
| Зарегистрироваться и подтвердить email | `backend/routes/api.php`, `backend/app/Http/Controllers/Api/User/AuthController.php`, `backend/app/Http/Controllers/Api/User/VerifyEmailAcountController.php`, `backend/app/Notifications/VerifyEmailNotification.php`, `frontend/src/components/auth/RegisterForm.tsx` |
| Войти в систему | `backend/routes/api.php`, `backend/app/Http/Controllers/Api/User/AuthController.php`, `frontend/src/components/auth/LoginForm.tsx`, `frontend/src/features/auth/api.ts` |
| Войти через OAuth | `backend/routes/api.php`, `backend/app/Http/Controllers/Api/User/SocialAuthController.php`, `backend/config/services.php`, `frontend/src/components/auth/AuthSocialButtons.tsx` |
| Восстановить пароль | `backend/routes/api.php`, `backend/app/Http/Controllers/Api/User/PasswordController.php`, `backend/app/Notifications/ResetPasswordNotification.php`, `frontend/src/components/auth/ForgotPasswordForm.tsx`, `frontend/src/components/auth/PasswordResetForm.tsx` |
| Управлять профилем и файлами | `backend/routes/api.php`, `backend/app/Http/Controllers/Api/User/ProfileController.php`, `backend/app/Http/Controllers/Api/User/UserFileController.php`, `frontend/src/features/auth/api.ts`, `frontend/src/features/files/api.ts` |
| Создавать и вести публикации | `backend/routes/api.php`, `backend/app/Http/Controllers/Api/Publication/PublicationController.php`, `frontend/src/features/publications/api.ts`, `frontend/src/app/(main)/publications/page.tsx` |
| Задавать вопросы и отвечать | `backend/routes/api.php`, `backend/app/Http/Controllers/Api/Issue/IssueQuestionController.php`, `backend/app/Http/Controllers/Api/Issue/IssueAnswerController.php`, `frontend/src/features/issues/api.ts`, `frontend/src/app/(main)/questions/page.tsx` |
| Взаимодействовать с контентом | `backend/routes/api.php`, `backend/app/Http/Controllers/Api/Interaction/CommentController.php`, `backend/app/Http/Controllers/Api/Interaction/ReactionController.php`, `backend/app/Http/Controllers/Api/Interaction/ReportController.php`, `backend/app/Http/Controllers/Api/Interaction/SavedItemController.php`, `backend/app/Http/Controllers/Api/Community/SubscriptionController.php`, `frontend/src/features/interactions/api.ts` |
| Настраивать интересы и уведомления | `backend/routes/api.php`, `backend/app/Http/Controllers/Api/Community/InterestController.php`, `backend/app/Http/Controllers/Api/Community/InboxController.php`, `backend/app/Http/Controllers/Api/Community/NotificationSettingController.php`, `backend/app/Http/Controllers/Api/Community/ReputationController.php`, `frontend/src/features/community/api.ts` |
| Общаться с участниками | `backend/routes/api.php`, `backend/app/Http/Controllers/Api/Social/FriendController.php`, `backend/app/Http/Controllers/Api/Social/PresenceController.php`, `backend/app/Http/Controllers/Api/Chat/ChatController.php`, `frontend/src/features/social/api.ts`, `frontend/src/features/chat/api.ts` |
| Работать с AI-помощником | `backend/routes/api.php`, `backend/app/Http/Controllers/Api/Ai/AiAssistantController.php`, `backend/app/Http/Controllers/Api/Ai/RagController.php`, `backend/app/Services/Ai/AiSdkService.php`, `backend/config/ai.php`, `frontend/src/features/ai-chat/api.ts`, `frontend/src/features/ai-rag/api.ts` |
| Запускать код в песочнице | `backend/routes/api.php`, `backend/app/Http/Controllers/Api/Playground/CodePlaygroundController.php`, `backend/app/Services/CodeRunner/DockerCodeRunner.php`, `backend/config/code_runner.php`, `frontend/src/features/playground/api.ts` |
| Модерировать жалобы | `backend/routes/api.php`, `backend/app/Http/Controllers/Api/Admin/AdminReportController.php`, `frontend/src/features/admin/api.ts` |
| Модерировать контент и чаты | `backend/routes/api.php`, `backend/app/Http/Controllers/Api/Admin/AdminContentController.php`, `backend/app/Http/Controllers/Api/Admin/AdminChatModerationController.php`, `frontend/src/features/admin/api.ts` |
| Управлять пользователями и тегами | `backend/routes/api.php`, `backend/app/Http/Controllers/Api/Admin/AdminUserController.php`, `backend/app/Http/Controllers/Api/Admin/AdminTagController.php`, `frontend/src/features/admin/api.ts` |
| Управлять AI-индексом, логами и правовыми страницами | `backend/routes/api.php`, `backend/app/Http/Controllers/Api/Admin/AdminAiIndexController.php`, `backend/app/Http/Controllers/Api/Admin/AdminLogController.php`, `backend/app/Http/Controllers/Api/Admin/AdminLegalPageController.php`, `backend/app/Http/Middleware/SystemAdminMiddleware.php`, `frontend/src/features/admin/api.ts` |

## 6. Предположения и спорные места

* **Название системы** взято как «Вектор», потому что оно указано в метаданных приложения и компоненте бренда. README фронтенда является шаблонным Next.js README и не даёт предметного названия.
* **Сотрудник** введён как обобщённый актор для ролей `admin` и `moderator`, потому что `AdminMiddleware` разрешает доступ ролям, для которых `User::isStaff()` возвращает `true`.
* **Изолированная среда выполнения кода** показана как внешний актор-система, а не как внутренний класс, потому что пользовательский сценарий запуска кода фактически передаётся в отдельный Docker-процесс с ограничениями сети, памяти и прав. При строгой трактовке границы деплоя этот актор можно убрать, оставив только ассоциацию пользователя с use case «Запускать код в песочнице».
* **Почтовый сервис** обобщён: конкретный транспорт зависит от конфигурации Laravel (`mail`, Postmark/Resend/SES в `config/services.php`).
* **AI-провайдер** обобщён: конфигурация допускает OpenRouter/OpenAI-compatible/Ollama и другие провайдеры через `config/ai.php`.

## 7. Что намеренно не включено

* База данных, очереди, контроллеры, модели, ресурсы API и UI-компоненты не вынесены в акторы, потому что это внутренние части системы.
* Learning/course/progress-модели и контроллеры не включены в диаграмму: в текущем `backend/routes/api.php` нет подтверждённых пользовательских маршрутов для курсов/прогресса, а во фронтенд-навигации нет соответствующего раздела.
* Отдельные CRUD-операции (`create`, `update`, `delete`, `restore`, `show`) не вынесены отдельными use cases, а объединены в бизнес-цели: «Управлять пользователями и тегами», «Модерировать контент и чаты», «Создавать и вести публикации».
* Служебные endpoints вроде `/refresh`, `/broadcasting/auth`, `/presence/heartbeat` не показаны как отдельные use cases, потому что они поддерживают пользовательские сценарии, но не являются самостоятельными бизнес-целями актора.
* Публичная страница политики конфиденциальности не вынесена отдельным use case, чтобы удержать обзорную диаграмму в пределах 20 бизнес-сценариев; она учтена в регистрации и системном администрировании правовых страниц.

## 8. Инструкции по открытию

### PlantUML

Файл: `docs/diagrams/use-case.puml`.

Открыть можно в любой PlantUML-совместимой IDE/плагине или сгенерировать изображение командой:

```bash
plantuml -tsvg docs/diagrams/use-case.puml
```

### draw.io / diagrams.net

Файл: `docs/diagrams/use-case.drawio`.

Открыть можно через diagrams.net:

1. `File` → `Open From` → `Device`.
2. Выбрать `docs/diagrams/use-case.drawio`.
3. Диаграмма состоит из отдельных редактируемых акторов, use cases, границы системы и связей; это не вставленное изображение.
