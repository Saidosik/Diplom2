import type { ComponentType } from "react"
import Link from "next/link"
import { CheckCircle2, CircleHelp, Filter, MessageSquare, Plus, Search, Sparkles, Tags, TrendingUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { IssueBreadcrumbs } from "@/features/issues/components/issue-breadcrumbs"
import { IssueQuestionCard } from "@/features/issues/components/issue-question-card"
import { PagePagination } from "@/components/shared/page-pagination"
import { getQuestionWorkflowStatus } from "@/features/issues/lib/issue-workflow"
import type { IssuePaginationMeta, IssueQuestion } from "@/features/issues/types"

type IssueQuestionListPageProps = {
    questions: IssueQuestion[]
    filters?: {
        search?: string
        filter?: string
        tag?: string
        page?: string
    }
    meta?: IssuePaginationMeta
}

const filterItems = [
    { label: "Все", value: "", href: "/questions", description: "полная лента" },
    { label: "Без ответов", value: "unanswered", href: "/questions?filter=unanswered", description: "нужна помощь" },
    { label: "Нерешённые", value: "unsolved", href: "/questions?filter=unsolved", description: "есть обсуждение" },
    { label: "Решённые", value: "solved", href: "/questions?filter=solved", description: "есть решение" },
]

export function IssueQuestionListPage({ questions, filters, meta }: IssueQuestionListPageProps) {
    const search = filters?.search || ""
    const activeFilter = filters?.filter || ""
    const tag = filters?.tag || ""

    const stats = getQuestionStats(questions)

    return (
        <div className="space-y-6">
            <IssueBreadcrumbs items={[{ label: "Вопросы" }]} />

            <section className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
                <Card className="overflow-hidden border-primary/20 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_32%)]">
                    <CardHeader className="space-y-4 p-6 md:p-8">
                        <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                            <Sparkles className="size-3.5 text-primary" />
                            Раздел вопросов
                        </div>
                        <div className="space-y-3">
                            <CardTitle className="max-w-3xl text-3xl md:text-5xl">
                                Вопросы и решения участников
                            </CardTitle>
                            <CardDescription className="max-w-3xl text-sm leading-7 md:text-base">
                                Здесь участники задают вопросы, получают ответы, отмечают найденное решение и помогают другим разработчикам быстрее разобраться с проблемой.
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button asChild>
                                <Link href="/questions/create">
                                    <Plus className="size-4" />
                                    Задать вопрос
                                </Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href="/questions/my">Мои вопросы</Link>
                            </Button>
                        </div>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="size-5 text-primary" />
                            Текущая выдача
                        </CardTitle>
                        <CardDescription>
                            Показатели по вопросам, которые сейчас отображены с учётом поиска и фильтров.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2">
                        <QuestionStat icon={CircleHelp} label="Открытых" value={stats.open} />
                        <QuestionStat icon={MessageSquare} label="С ответами" value={stats.hasAnswers} />
                        <QuestionStat icon={CheckCircle2} label="Решённых" value={stats.solved} />
                        <QuestionStat icon={Tags} label="Тегов" value={stats.tags} />
                    </CardContent>
                </Card>
            </section>

            <Card className="shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Filter className="size-4 text-primary" />
                                Фильтрация вопросов
                            </CardTitle>
                            <CardDescription>
                                Можно быстро найти нерешённые вопросы, вопросы без ответа или материалы по конкретному тегу.
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {filterItems.map((item) => (
                                <Button
                                    key={item.value || "all"}
                                    variant={activeFilter === item.value ? "default" : "outline"}
                                    size="sm"
                                    asChild
                                >
                                    <Link href={item.href}>{item.label}</Link>
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 p-4 pt-0">
                    <form className="flex flex-col gap-3 md:flex-row">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                name="search"
                                defaultValue={search}
                                placeholder="Поиск по вопросу, ошибке или описанию проблемы"
                                className="pl-9"
                            />
                        </div>

                        <Input
                            name="tag"
                            defaultValue={tag}
                            placeholder="Тег: laravel, nextjs, postgresql"
                            className="md:max-w-64"
                        />

                        <select
                            name="filter"
                            defaultValue={activeFilter}
                            className="h-9 rounded-4xl border border-input bg-input/30 px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                            <option value="">Все вопросы</option>
                            <option value="unanswered">Без ответов</option>
                            <option value="unsolved">Нерешённые</option>
                            <option value="solved">Решённые</option>
                        </select>

                        <Button type="submit">Найти</Button>
                    </form>

                    {(search || tag || activeFilter) && (
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span>Активные параметры:</span>
                            {search && <Badge variant="secondary">поиск: {search}</Badge>}
                            {tag && <Badge variant="secondary">тег: {tag}</Badge>}
                            {activeFilter && <Badge variant="secondary">фильтр: {getFilterLabel(activeFilter)}</Badge>}
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/questions">Сбросить</Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {questions.length > 0 ? (
                <div className="grid gap-5 xl:grid-cols-2">
                    {questions.map((question) => (
                        <IssueQuestionCard key={question.id} question={question} />
                    ))}
                </div>
            ) : (
                <Empty className="min-h-96 border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <CircleHelp className="size-6" />
                        </EmptyMedia>
                        <EmptyTitle>Вопросы не найдены</EmptyTitle>
                        <EmptyDescription>
                            Попробуй изменить фильтр или задай первый вопрос в сообществе.
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button asChild>
                            <Link href="/questions/create">Задать вопрос</Link>
                        </Button>
                    </EmptyContent>
                </Empty>
            )}

            <PagePagination
                meta={meta}
                basePath="/questions"
                searchParams={{ search, filter: activeFilter, tag }}
            />
        </div>
    )
}

function getQuestionStats(questions: IssueQuestion[]) {
    const tagSet = new Set<string>()

    return questions.reduce(
        (acc, question) => {
            const status = getQuestionWorkflowStatus(question)

            if (status === "open") acc.open += 1
            if (status === "has_answers") acc.hasAnswers += 1
            if (status === "solved") acc.solved += 1

            question.tags?.forEach((tag) => tagSet.add(tag.slug || tag.name))
            acc.tags = tagSet.size

            return acc
        },
        { open: 0, hasAnswers: 0, solved: 0, tags: 0 },
    )
}

function getFilterLabel(filter: string) {
    return filterItems.find((item) => item.value === filter)?.label || filter
}

function QuestionStat({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: number }) {
    return (
        <div className="rounded-2xl border bg-muted/25 p-4">
            <div className="flex items-center gap-2">
                <Icon className="size-4 text-primary" />
                <span className="text-2xl font-semibold">{value}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
    )
}
