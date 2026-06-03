"use client"

import * as React from "react"
import Link from "next/link"
import {
    ArrowRight,
    Binary,
    BookOpen,
    Braces,
    BrainCircuit,
    CircuitBoard,
    CircleHelp,
    Code2,
    Cpu,
    Landmark,
    MousePointerClick,
    Newspaper,
    Play,
    Rocket,
    Sparkles,
    SquareTerminal,
    UsersRound,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const eras = [
    {
        year: "1843",
        title: "Первые алгоритмы",
        subtitle: "Ада Лавлейс описывает программу для аналитической машины.",
        icon: Landmark,
        color: "from-amber-500/20",
        code: "ALGORITHM → IDEA → MACHINE",
        text: "Программирование началось с точных инструкций: человек формулирует шаги, а машина выполняет их без лишних предположений.",
    },
    {
        year: "1940–1950",
        title: "Машинный код",
        subtitle: "Команды записываются почти напрямую для железа.",
        icon: Binary,
        color: "from-cyan-500/20",
        code: "10110000 01100001",
        text: "Разработчики работали рядом с процессором: каждая инструкция, адрес памяти и переход имели значение.",
    },
    {
        year: "1970–1980",
        title: "Языки высокого уровня",
        subtitle: "C, Pascal и Basic делают код понятнее человеку.",
        icon: SquareTerminal,
        color: "from-emerald-500/20",
        code: "for (i = 0; i < n; i++)",
        text: "Код становится ближе к человеческой логике: появляются функции, переменные, структуры данных и понятные учебные программы.",
    },
    {
        year: "1990–2000",
        title: "Интернет и веб",
        subtitle: "HTML, CSS и JavaScript превращают браузер в платформу.",
        icon: Braces,
        color: "from-violet-500/20",
        code: "<main>Hello, web!</main>",
        text: "Сайты становятся интерактивными, а разработка выходит за пределы лабораторий: свои проекты начинают создавать миллионы людей.",
    },
    {
        year: "2010–2020",
        title: "Open source и сообщества",
        subtitle: "GitHub, форумы и сообщества ускоряют обмен знаниями.",
        icon: UsersRound,
        color: "from-blue-500/20",
        code: "git commit -m \"share knowledge\"",
        text: "Разработчики делятся опытом, публикуют решения, задают вопросы и собирают портфолио из настоящих проектов.",
    },
    {
        year: "Сегодня",
        title: "ИИ и инженерное мышление",
        subtitle: "Разработчик проектирует, проверяет и улучшает решения быстрее.",
        icon: BrainCircuit,
        color: "from-rose-500/20",
        code: "human + ai = faster learning",
        text: "Современная разработка требует не только знания синтаксиса, но и умения анализировать задачу, читать чужой код и принимать инженерные решения.",
    },
]

const museumObjects = [
    {
        title: "Публикации",
        description: "Разборы тем, заметки, инструкции и примеры кода по веб-разработке и программированию.",
        icon: Newspaper,
        href: "/publications",
    },
    {
        title: "Вопросы и ответы",
        description: "Обсуждение ошибок, поиск решений и полезные ответы, которые можно сохранить для дальнейшей работы.",
        icon: CircleHelp,
        href: "/questions",
    },
    {
        title: "Участники",
        description: "Профили, репутация, активные авторы и эксперты сообщества.",
        icon: UsersRound,
        href: "/users",
    },
]

const stats = [
    ["6", "эпох развития"],
    ["2", "раздела сообщества"],
    ["24/7", "доступ к материалам"],
]

export function ProgrammingMuseumLanding() {
    const [activeIndex, setActiveIndex] = React.useState(3)
    const activeEra = eras[activeIndex]
    const ActiveIcon = activeEra.icon

    return (
        <main className="min-h-screen overflow-hidden bg-background text-foreground">
            <section className="relative border-b">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.25),transparent_32rem),radial-gradient(circle_at_70%_30%,hsl(var(--accent)/0.16),transparent_28rem)]" />
                <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-primary/10 to-transparent" />

                <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-5 md:px-6">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                            <Code2 className="size-5" />
                        </div>
                        <div className="leading-tight">
                            <p className="font-semibold tracking-tight">DevCommunity</p>
                            <p className="text-xs text-muted-foreground">сообщество программистов</p>
                        </div>
                    </Link>

                    <nav className="hidden items-center gap-1 md:flex">
                        <Button variant="ghost" asChild><Link href="/publications">Публикации</Link></Button>
                        <Button variant="ghost" asChild><Link href="/questions">Вопросы</Link></Button>
                                            </nav>

                    <div className="flex items-center gap-2">
                        <Button variant="ghost" asChild className="hidden sm:inline-flex">
                            <Link href="/auth?mode=login">Войти</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/auth?mode=register">Начать</Link>
                        </Button>
                    </div>
                </header>

                <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 pb-16 pt-10 md:grid-cols-[1.05fr_0.95fr] md:px-6 md:pb-24 md:pt-16">
                    <div className="flex flex-col justify-center space-y-8">
                        <div className="space-y-5">
                            <Badge className="w-fit rounded-full px-3 py-1" variant="secondary">
                                <Sparkles className="size-3.5" />
                                Интерактивный музей истории программирования
                            </Badge>

                            <div className="space-y-4">
                                <h1 className="max-w-4xl text-5xl font-semibold tracking-tight md:text-7xl">
                                    Пройдите путь от первых алгоритмов до современных веб-приложений
                                </h1>
                                <p className="max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl">
                                    Исследуйте ключевые эпохи программирования, читайте материалы, задавайте вопросы и обсуждайте решения с другими участниками.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Button size="lg" asChild>
                                <Link href="/publications">
                                    Открыть материалы
                                    <ArrowRight className="size-4" />
                                </Link>
                            </Button>
                            <Button size="lg" variant="outline" asChild>
                                <Link href="/questions">
                                    Задать вопрос
                                    <CircleHelp className="size-4" />
                                </Link>
                            </Button>
                        </div>

                        <div className="grid max-w-xl grid-cols-3 gap-3">
                            {stats.map(([value, label]) => (
                                <div key={label} className="rounded-3xl border bg-card/70 p-4 shadow-sm backdrop-blur">
                                    <p className="text-2xl font-semibold">{value}</p>
                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-to-br from-primary/20 via-transparent to-accent/20 blur-2xl" />
                        <Card className="overflow-hidden rounded-[2rem] border bg-card/80 shadow-2xl shadow-primary/10 backdrop-blur">
                            <div className="border-b bg-muted/30 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="size-3 rounded-full bg-destructive/80" />
                                        <span className="size-3 rounded-full bg-amber-500/80" />
                                        <span className="size-3 rounded-full bg-emerald-500/80" />
                                    </div>
                                    <span className="text-xs text-muted-foreground">museum.timeline.ts</span>
                                </div>
                            </div>
                            <CardContent className="space-y-6 p-6">
                                <div className={cn("rounded-3xl border bg-gradient-to-br p-5", activeEra.color, "to-card")}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-3">
                                            <Badge variant="outline" className="bg-background/60">
                                                {activeEra.year}
                                            </Badge>
                                            <div>
                                                <h2 className="text-2xl font-semibold tracking-tight">{activeEra.title}</h2>
                                                <p className="mt-1 text-sm text-muted-foreground">{activeEra.subtitle}</p>
                                            </div>
                                        </div>
                                        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-background/70 ring-1 ring-border">
                                            <ActiveIcon className="size-6 text-primary" />
                                        </div>
                                    </div>

                                    <div className="mt-5 rounded-2xl border bg-zinc-950 p-4 font-mono text-sm text-zinc-100 shadow-inner">
                                        <span className="text-emerald-300">{activeEra.code}</span>
                                    </div>

                                    <p className="mt-5 text-sm leading-7 text-muted-foreground">
                                        {activeEra.text}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {eras.map((era, index) => {
                                        const Icon = era.icon
                                        const active = index === activeIndex

                                        return (
                                            <button
                                                key={era.year}
                                                type="button"
                                                onClick={() => setActiveIndex(index)}
                                                className={cn(
                                                    "group rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:bg-muted/50",
                                                    active && "border-primary bg-primary/10 shadow-sm",
                                                )}
                                            >
                                                <Icon className={cn("mb-2 size-4 text-muted-foreground", active && "text-primary")} />
                                                <p className="text-xs font-medium">{era.year}</p>
                                                <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{era.title}</p>
                                            </button>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            <section className="mx-auto w-full max-w-7xl space-y-8 px-4 py-14 md:px-6 md:py-20">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                    <div className="space-y-3">
                        <Badge variant="outline" className="w-fit">
                            <MousePointerClick className="size-3.5" />
                            выберите маршрут
                        </Badge>
                        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-5xl">
                            От истории к практике
                        </h2>
                    </div>
                    <p className="max-w-xl text-sm leading-7 text-muted-foreground">
                        Материалы, обсуждения и курсы помогают пройти тему последовательно: сначала разобраться в идее, затем увидеть примеры и закрепить знания.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {museumObjects.map((item) => {
                        const Icon = item.icon

                        return (
                            <Link key={item.title} href={item.href} className="group">
                                <Card className="h-full overflow-hidden rounded-3xl transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10">
                                    <CardContent className="relative h-full space-y-5 p-6">
                                        <div className="absolute right-0 top-0 size-28 translate-x-10 -translate-y-10 rounded-full bg-primary/10 transition group-hover:scale-125" />
                                        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                                            <Icon className="size-6" />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-semibold tracking-tight">{item.title}</h3>
                                            <p className="text-sm leading-7 text-muted-foreground">{item.description}</p>
                                        </div>
                                        <div className="inline-flex items-center gap-2 text-sm font-medium text-primary">
                                            Перейти
                                            <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        )
                    })}
                </div>
            </section>

            <section className="border-y bg-muted/20">
                <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-14 md:grid-cols-[0.9fr_1.1fr] md:px-6 md:py-20">
                    <Card className="rounded-3xl bg-card/80">
                        <CardContent className="space-y-5 p-6">
                            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                                <Rocket className="size-6" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-3xl font-semibold tracking-tight">Свободное чтение для гостей</h2>
                                <p className="text-sm leading-7 text-muted-foreground">
                                    Публикации, вопросы, ответы, комментарии и курсы доступны для просмотра без регистрации. Для сохранения материалов, реакций и участия в обсуждениях потребуется аккаунт.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-4 sm:grid-cols-2">
                        {[
                            [BookOpen, "Читать материалы", "Открывайте публикации, вопросы и учебные разделы без входа."],
                            [CircleHelp, "Участвовать в обсуждениях", "После авторизации можно оставлять комментарии и ответы."],
                            [Sparkles, "Сохранять полезное", "Отмечайте публикации и ответы, чтобы быстро вернуться к ним позже."],
                            [CircuitBoard, "Проходить курсы", "Следите за прогрессом и двигайтесь по урокам шаг за шагом."],
                        ].map(([Icon, title, description]) => {
                            const TypedIcon = Icon as typeof Cpu
                            return (
                                <div key={String(title)} className="rounded-3xl border bg-card/70 p-5">
                                    <TypedIcon className="size-5 text-primary" />
                                    <h3 className="mt-4 font-semibold">{String(title)}</h3>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{String(description)}</p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            <section className="mx-auto w-full max-w-7xl px-4 py-14 md:px-6 md:py-20">
                <div className="overflow-hidden rounded-[2rem] border bg-zinc-950 text-zinc-50 shadow-2xl">
                    <div className="grid gap-8 p-6 md:grid-cols-[1fr_0.8fr] md:p-10">
                        <div className="space-y-5">
                            <Badge className="bg-zinc-800 text-zinc-100 hover:bg-zinc-800">
                                <Play className="size-3.5" />
                                практический маршрут
                            </Badge>
                            <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
                                Исследуйте, обсуждайте, закрепляйте
                            </h2>
                            <p className="max-w-2xl text-sm leading-7 text-zinc-300">
                                Начните с исторического таймлайна, перейдите к публикациям с примерами кода, задайте вопрос по сложной теме и продолжите обучение в курсах.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <Button asChild className="bg-zinc-50 text-zinc-950 hover:bg-zinc-200">
                                    <Link href="/publications">Перейти к публикациям</Link>
                                </Button>
                                <Button asChild variant="outline" className="border-zinc-700 bg-transparent text-zinc-50 hover:bg-zinc-900 hover:text-zinc-50">
                                    <Link href="/auth?mode=register">Создать профиль</Link>
                                </Button>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-5 font-mono text-sm leading-7 text-zinc-300">
                            <p><span className="text-violet-300">museum</span>.<span className="text-cyan-300">open</span>()</p>
                            <p><span className="text-emerald-300">guest</span>.read(publications)</p>
                            <p><span className="text-amber-300">user</span>.ask(question)</p>
                            <p><span className="text-rose-300">user</span>.save(answer)</p>
                            <p><span className="text-blue-300">progress</span>.start(course)</p>
                            <p className="text-zinc-500">// знания превращаются в практику</p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    )
}
