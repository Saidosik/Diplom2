export default function ContactsPage() {
    return (
        <section className="mx-auto max-w-4xl space-y-6 rounded-3xl border bg-card p-6 shadow-sm md:p-10">
            <div className="space-y-2">
                <p className="text-sm font-medium text-primary">Контакты</p>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Vektor</h1>
                <p className="text-muted-foreground">Дипломный проект информационного сообщества для программистов.</p>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
                <p>Автор проекта: Саид.</p>
                <p>Стек: Laravel, PostgreSQL, Redis, Reverb, Next.js, shadcn/ui, AI/RAG.</p>
            </div>
        </section>
    )
}
