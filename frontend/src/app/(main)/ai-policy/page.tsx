export default function AiPolicyPage() {
    return (
        <section className="mx-auto max-w-4xl space-y-6 rounded-3xl border bg-card p-6 shadow-sm md:p-10">
            <div className="space-y-2">
                <p className="text-sm font-medium text-primary">AI Policy</p>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Правила AI-ответов</h1>
                <p className="text-muted-foreground">AI помогает быстрее найти направление решения, но не заменяет проверку человеком.</p>
            </div>
            <div className="space-y-4 text-sm leading-7 text-muted-foreground">
                <p>AI-ответы помечаются отдельной меткой. Они могут содержать ошибки, устаревшие команды или неполный учёт окружения.</p>
                <p>Вопросы могут автоматически получать предварительный AI-ответ. Участники сообщества могут уточнять, исправлять и дополнять его обычными ответами.</p>
            </div>
        </section>
    )
}
