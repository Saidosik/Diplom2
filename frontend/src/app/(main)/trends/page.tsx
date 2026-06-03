import type { ElementType, ReactNode } from "react"
import Link from "next/link"
import { ArrowRight, CircleHelp, Flame, Newspaper, Tags, Trophy } from "lucide-react"

import createLaravelApi from "@/lib/http/laravel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { CommunityDiscovery, CommunityOverview, CommunityTag, CommunityTopUser } from "@/features/community/types"
import type { IssueQuestion } from "@/features/issues/types"
import type { Publication } from "@/features/publications/types"

export const dynamic = "force-dynamic"
export const revalidate = 0

type TrendsPageProps = {
    searchParams?: Promise<{ period?: string }> | { period?: string }
}

const emptyOverview: CommunityOverview = {
    stats: {
        publications_count: 0,
        questions_count: 0,
        solved_questions_count: 0,
        unanswered_questions_count: 0,
        comments_count: 0,
        members_count: 0,
    },
    popular_publications: [],
    actual_questions: [],
    top_users: [],
    popular_tags: [],
}

const emptyDiscovery: CommunityDiscovery = {
    ...emptyOverview,
    period: "week",
    feed: [],
    recommendations: [],
    trends: [],
    unanswered_questions: [],
}

const periods = [
    { label: "За день", value: "day" },
    { label: "За неделю", value: "week" },
    { label: "За месяц", value: "month" },
]

async function getCommunityDiscovery(period: string): Promise<CommunityDiscovery> {
    const api = createLaravelApi()

    try {
        const response = await api.get<CommunityDiscovery>("/community/discovery", { params: { period } })
        return response.data
    } catch {
        try {
            const response = await api.get<CommunityOverview>("/community/overview")
            return {
                ...emptyDiscovery,
                ...response.data,
                period: period as CommunityDiscovery["period"],
            }
        } catch {
            return { ...emptyDiscovery, period: period as CommunityDiscovery["period"] }
        }
    }
}

function unwrapCollection<T>(value: T[] | { data: T[] } | undefined): T[] {
    if (!value) return []
    return Array.isArray(value) ? value : value.data
}

function normalizePeriod(value?: string) {
    return ["day", "week", "month"].includes(value || "") ? value! : "week"
}

export default async function TrendsPage({ searchParams }: TrendsPageProps = {}) {
    const params = await Promise.resolve(searchParams ?? {})
    const activePeriod = normalizePeriod(params.period)
    const overview = await getCommunityDiscovery(activePeriod)
    const publications = unwrapCollection<Publication>(overview.popular_publications)
    const questions = unwrapCollection<IssueQuestion>(overview.actual_questions)
    const tags = overview.popular_tags
    const users = overview.top_users

    return (
        <div className="space-y-6">
            <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
                <Card className="border-primary/20 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_34%)] shadow-sm">
                    <CardHeader className="space-y-4 p-6 md:p-8">
                        <div className="inline-flex w-fit items-center gap-2 border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                            <Flame className="size-3.5 text-primary" />
                            динамика сообщества
                        </div>
                        <div className="space-y-3">
                            <CardTitle className="text-4xl tracking-tight md:text-6xl">Тренды</CardTitle>
                            <CardDescription className="max-w-3xl text-base leading-7">
                                Сводка популярных публикаций, вопросов, тегов и участников за выбранный период.
                            </CardDescription>
                        </div>
                    </CardHeader>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>Период</CardTitle>
                        <CardDescription>Данные пересчитываются через trend score за выбранный период.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        {periods.map((period) => (
                            <Button key={period.value} asChild variant={activePeriod === period.value ? "default" : "outline"}>
                                <Link href={`/trends?period=${period.value}`}>{period.label}</Link>
                            </Button>
                        ))}
                    </CardContent>
                </Card>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <TrendStat icon={Newspaper} label="Публикаций" value={overview.stats.publications_count} />
                <TrendStat icon={CircleHelp} label="Вопросов" value={overview.stats.questions_count} />
                <TrendStat icon={Tags} label="Тегов в тренде" value={tags.length} />
                <TrendStat icon={Trophy} label="Активных авторов" value={users.length} />
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
                <TrendList title="Популярные публикации" description="Материалы, которые получают реакции, комментарии и сохранения.">
                    {publications.length > 0 ? publications.map((publication, index) => (
                        <TrendContentRow
                            key={publication.id}
                            index={index + 1}
                            href={`/publications/${publication.slug}`}
                            title={publication.title}
                            description={publication.excerpt || "Публикация сообщества"}
                            badge={publication.type_label || "публикация"}
                            meta={`${publication.likes_count || 0} реакций · ${publication.comments_count || 0} комментариев`}
                        />
                    )) : <EmptyText text="Публикаций пока нет." />}
                </TrendList>

                <TrendList title="Актуальные вопросы" description="Вопросы, где можно подключиться к обсуждению и получить репутацию.">
                    {questions.length > 0 ? questions.map((question, index) => (
                        <TrendContentRow
                            key={question.id}
                            index={index + 1}
                            href={`/questions/${question.slug}`}
                            title={question.title}
                            description={question.excerpt || "Вопрос сообщества"}
                            badge={question.workflow_status_label || question.status_label || "вопрос"}
                            meta={`${question.answers_count || 0} ответов · ${question.views_count || 0} просмотров`}
                        />
                    )) : <EmptyText text="Вопросов пока нет." />}
                </TrendList>
            </section>

            <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
                <TrendList title="Теги в тренде" description="Темы, по которым участники чаще всего создают материалы.">
                    {tags.length > 0 ? tags.map((tag, index) => <TrendTagRow key={tag.id} tag={tag} index={index + 1} />) : <EmptyText text="Теги пока не набрали активность." />}
                </TrendList>

                <TrendList title="Лидеры сообщества" description="Участники с высокой репутацией и вкладом в базу знаний.">
                    {users.length > 0 ? users.map((user, index) => <TrendUserRow key={user.id} user={user} index={index + 1} />) : <EmptyText text="Рейтинг участников пока пуст." />}
                </TrendList>
            </section>
        </div>
    )
}

function TrendStat({ icon: Icon, label, value }: { icon: ElementType; label: string; value: number }) {
    return (
        <Card>
            <CardContent className="space-y-4 p-5">
                <div className="flex size-10 items-center justify-center border bg-primary/10 text-primary">
                    <Icon className="size-5" />
                </div>
                <div>
                    <div className="text-3xl font-semibold tracking-tight">{value}</div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                </div>
            </CardContent>
        </Card>
    )
}

function TrendList({ title, description, children }: { title: string; description: string; children: ReactNode }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">{children}</CardContent>
        </Card>
    )
}

function TrendContentRow({ index, href, title, description, badge, meta }: { index: number; href: string; title: string; description: string; badge: string; meta: string }) {
    return (
        <Link href={href} className="group flex gap-3 border bg-background/45 p-4 transition-colors hover:border-primary/50 hover:bg-muted/40">
            <span className="flex size-8 shrink-0 items-center justify-center border bg-primary/10 text-xs font-semibold text-primary">{index}</span>
            <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{badge}</Badge>
                    <span className="text-xs text-muted-foreground">{meta}</span>
                </div>
                <h2 className="line-clamp-1 font-medium group-hover:text-primary">{title}</h2>
                <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
            <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
        </Link>
    )
}

function TrendTagRow({ tag, index }: { tag: CommunityTag; index: number }) {
    return (
        <Link href={`/tags/${tag.slug}`} className="flex items-center justify-between gap-3 border bg-background/45 p-3 transition-colors hover:border-primary/50 hover:bg-muted/40">
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center border bg-primary/10 text-xs font-semibold text-primary">{index}</span>
                <div className="min-w-0">
                    <p className="truncate font-medium">#{tag.name}</p>
                    <p className="text-xs text-muted-foreground">{tag.usage_count} материалов</p>
                </div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground" />
        </Link>
    )
}

function TrendUserRow({ user, index }: { user: CommunityTopUser; index: number }) {
    return (
        <Link href={`/users/${user.id}`} className="flex items-center justify-between gap-3 border bg-background/45 p-3 transition-colors hover:border-primary/50 hover:bg-muted/40">
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center border bg-primary/10 text-xs font-semibold text-primary">{index}</span>
                <div className="min-w-0">
                    <p className="truncate font-medium">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.headline || user.reputation_level?.label || "участник сообщества"}</p>
                </div>
            </div>
            <Badge variant="secondary">{user.reputation_score}</Badge>
        </Link>
    )
}

function EmptyText({ text }: { text: string }) {
    return <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">{text}</p>
}
