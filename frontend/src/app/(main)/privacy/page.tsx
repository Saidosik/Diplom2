export default function PrivacyPage() {
    return (
        <section className="mx-auto max-w-4xl space-y-6 rounded-3xl border bg-card p-6 shadow-sm md:p-10">
            <div className="space-y-2">
                <p className="text-sm font-medium text-primary">Документы платформы</p>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Политика конфиденциальности</h1>
                <p className="text-muted-foreground">Платформа Vektor является учебным дипломным проектом и хранит только данные, необходимые для работы сообщества.</p>
            </div>
            <div className="space-y-4 text-sm leading-7 text-muted-foreground">
                <p>Мы используем данные аккаунта, публикации, вопросы, ответы, комментарии, файлы и настройки профиля для отображения контента, работы поиска, уведомлений, чатов и AI-помощника.</p>
                <p>Файлы пользователя хранятся в личном хранилище. Файлы, прикреплённые к опубликованному контенту, могут быть доступны читателям этого контента.</p>
                <p>AI-функции могут использовать текст запроса, прикреплённые файлы и найденные материалы платформы для генерации ответа. Не прикрепляйте секреты, пароли, приватные ключи и персональные данные третьих лиц.</p>
            </div>
        </section>
    )
}
