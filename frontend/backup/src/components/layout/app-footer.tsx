import Link from "next/link"
import { Code2 } from "lucide-react"

const columns = [
    {
        title: "Платформа",
        links: [
            { label: "Публикации", href: "/publications" },
            { label: "Вопросы", href: "/questions" },
            { label: "AI-помощник", href: "/assistant" },
            { label: "Песочница", href: "/playground" },
        ],
    },
    {
        title: "Сообщество",
        links: [
            { label: "Участники", href: "/users" },
            { label: "Теги", href: "/tags" },
            { label: "Друзья", href: "/friends" },
            { label: "Чаты", href: "/chats" },
        ],
    },
    {
        title: "Документы",
        links: [
            { label: "Политика конфиденциальности", href: "/privacy" },
            { label: "Условия использования", href: "/terms" },
            { label: "Правила AI-ответов", href: "/ai-policy" },
            { label: "Контакты", href: "/contacts" },
        ],
    },
    {
        title: "Дипломный проект",
        links: [
            { label: "Laravel backend", href: "/search?q=Laravel" },
            { label: "Next.js frontend", href: "/search?q=Next.js" },
            { label: "PostgreSQL и Redis", href: "/search?q=PostgreSQL%20Redis" },
            { label: "Reverb realtime", href: "/search?q=Reverb" },
        ],
    },
]

export function AppFooter() {
    return (
        <footer className="mt-10 border-t bg-zinc-950 text-zinc-300">
            <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-6 py-10 md:grid-cols-[220px_1fr] md:py-14">
                <div className="space-y-5">
                    <Link href="/" className="inline-flex items-center gap-3 text-white">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-white/10">
                            <Code2 className="size-5" />
                        </span>
                        <span className="font-semibold">Vektor</span>
                    </Link>
                    <p className="text-sm leading-6 text-zinc-400">
                        Информационное сообщество для программистов: публикации, Q&A, чаты, сниппеты, файлы и AI-помощник.
                    </p>
                </div>

                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    {columns.map((column) => (
                        <div key={column.title} className="space-y-3">
                            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-200">{column.title}</h2>
                            <nav className="grid gap-2 text-sm" aria-label={column.title}>
                                {column.links.map((link) => (
                                    <Link key={link.href} href={link.href} className="text-zinc-400 transition-colors hover:text-white">
                                        {link.label}
                                    </Link>
                                ))}
                            </nav>
                        </div>
                    ))}
                </div>
            </div>

            <div className="border-t border-white/10">
                <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-6 py-5 text-xs text-zinc-500 md:flex-row md:items-center md:justify-between">
                    <p>© 2026 Vektor. Дипломный проект Саида. Все материалы используются в учебных целях.</p>
                    <div className="flex flex-wrap gap-3">
                        <Link href="/privacy" className="hover:text-zinc-200">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-zinc-200">Terms</Link>
                        <Link href="/ai-policy" className="hover:text-zinc-200">AI Policy</Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}
