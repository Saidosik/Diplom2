export default function TermsPage() {
    return (
        <section className="mx-auto max-w-4xl space-y-6 rounded-3xl border bg-card p-6 shadow-sm md:p-10">
            <div className="space-y-2">
                <p className="text-sm font-medium text-primary">Документы платформы</p>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Условия использования</h1>
                <p className="text-muted-foreground">Используйте платформу для учебного обмена знаниями, публикаций, вопросов, обсуждений и проверки кода.</p>
            </div>
            <div className="space-y-4 text-sm leading-7 text-muted-foreground">
                <p>Запрещены вредоносный код, публикация чужих персональных данных, спам, оскорбления и материалы, нарушающие законодательство.</p>
                <p>Ответы сообщества и AI-ответы носят справочный характер. Перед применением решений проверяйте версии библиотек, окружение и безопасность команд.</p>
            </div>
        </section>
    )
}
