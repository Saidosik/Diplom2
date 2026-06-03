import type { ElementType, ReactNode } from "react"
import Link from "next/link"
import {
    ArrowRight,
    CheckCircle2,
    CircleHelp,
    Clock3,
    Compass,
    Flame,
    Hash,
    Lightbulb,
    MessageSquare,
    Newspaper,
    Search,
    Sparkles,
    Tags,
    Trophy,
    Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty"
import createLaravelApi from "@/lib/http/laravel"
import { getAccessTokenCookie } from "@/lib/auth/cookies"
import type { CommunityDiscovery, CommunityFeedItem, CommunityOverview, CommunityRecommendation, CommunityTag, CommunityTopUser, CommunityTrend } from "@/features/community/types"
import type { IssueQuestion } from "@/features/issues/types"
import type { Publication } from "@/features/publications/types"

export const dynamic = "force-dynamic"
export const revalidate = 0

type HomePageSearchParams = {
    period?: string
    view?: string
}

type HomePageProps = {
    searchParams?: Promise<HomePageSearchParams> | HomePageSearchParams
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

const communityFeatures = [
    {
        title: "Рекомендации",
        description: "Лента собирает публикации, вопросы и теги, которые стоит посмотреть в первую очередь.",
        icon: Compass,
    },
    {
        title: "Тренды",
        description: "Популярное за день, неделю и месяц помогает видеть актуальные темы сообщества.",
        icon: Flame,
    },
    {
        title: "Интеллектуальные инструменты",
        description: "Подбор тегов, проверка структуры вопроса и подготовка публикаций встроены в редакторы.",
        icon: Sparkles,
    },
    {
        title: "Репутация",
        description: "Баллы растут за полезные публикации, ответы, принятые решения и активность.",
        icon: Trophy,
    },
]

const periodTabs = [
    { label: "День", value: "day" },
    { label: "Неделя", value: "week" },
    { label: "Месяц", value: "month" },
]

const feedTabs = [
    { label: "Для вас", value: "for-you" },
    { label: "Популярное", value: "popular" },
    { label: "Тренды", value: "trends" },
    { label: "Без ответа", value: "unanswered" },
]

async function getCommunityDiscovery(period: string): Promise<CommunityDiscovery> {
    const token = await getAccessTokenCookie()
    const api = createLaravelApi(token)

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
                feed: [],
                recommendations: [],
                trends: [],
            }
        } catch {
            return { ...emptyDiscovery, period: period as CommunityDiscovery["period"] }
        }
    }
}

function unwrapCollection<T>(value: T[] | { data: T[] } | undefined): T[] {
    if (!value) {
        return []
    }

    return Array.isArray(value) ? value : value.data
}

function normalizePeriod(value?: string) {
    return ["day", "week", "month"].includes(value || "") ? value! : "week"
}

function normalizeView(value?: string) {
    return feedTabs.some((tab) => tab.value === value) ? value! : "for-you"
}

export default async function HomePage({ searchParams }: HomePageProps = {}) {
    const params = await Promise.resolve(searchParams ?? {})
    const period = normalizePeriod(params.period)
    const view = normalizeView(params.view)
    const overview = await getCommunityDiscovery(period)
    const popularPublications = unwrapCollection<Publication>(overview.popular_publications).slice(0, 4)
    const actualQuestions = unwrapCollection<IssueQuestion>(overview.actual_questions).slice(0, 5)
    const topUsers = overview.top_users.slice(0, 5)
    const popularTags = overview.popular_tags.slice(0, 12)
    const trendItems = overview.trends.slice(0, 8)
    const recommendations = overview.recommendations.slice(0, 10)
    const unansweredQuestions = unwrapCollection<IssueQuestion>(overview.unanswered_questions).slice(0, 6)
    const feedItems = overview.feed.length > 0
        ? overview.feed
        : [
            ...popularPublications.slice(0, 2).map((publication) => ({
                type: "publication" as const,
                label: publication.type_label ?? "Публикация",
                reason: "Рекомендация сообщества",
                score: 0,
                created_at: publication.published_at,
                item: publication,
            })),
            ...actualQuestions.slice(0, 3).map((question) => ({
                type: "question" as const,
                label: question.workflow_status_label ?? "Вопрос",
                reason: "Актуальный вопрос",
                score: 0,
                created_at: question.published_at,
                item: question,
            })),
        ]

    return (
        <div className="space-y-6">
            <section className="grid gap-4 xl:grid-cols-[1.45fr_0.55fr]">
                <Card className="relative overflow-hidden border-primary/20 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.2),transparent_34%),radial-gradient(circle_at_bottom_right,hsl(var(--primary)/0.12),transparent_28%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/0.45))]">
                    <CardContent className="grid gap-8 p-6 md:p-8 xl:grid-cols-[1.1fr_0.9fr]">
                        <div className="space-y-6">
                            <div className="inline-flex w-fit items-center gap-2 border bg-background/65 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
                                <Sparkles className="size-3.5 text-primary" />
                                dev community platform
                            </div>

                            <div className="space-y-3">
                                <h1 className="max-w-4xl text-3xl font-semibold tracking-tight md:text-5xl">
                                    Лента знаний, вопросов, трендов и решений для программистов
                                </h1>
                                <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                                    «Вектор» объединяет публикации, Q&amp;A, рекомендации, теги, репутацию, подписки, уведомления и встроенные интеллектуальные инструменты для авторов.
                                </p>
                            </div>

                            <div className="grid gap-3 rounded-2xl border bg-background/70 p-3 shadow-sm backdrop-blur md:grid-cols-[1fr_auto]">
                                <div className="flex items-center gap-3 px-2">
                                    <Search className="size-4 text-primary" />
                                    <div>
                                        <p className="text-sm font-medium">Поиск по базе сообщества</p>
                                        <p className="text-xs text-muted-foreground">
                                            Публикации, вопросы, теги и ответы доступны через общий поиск и фильтры разделов.
                                        </p>
                                    </div>
                                </div>
                                <Button asChild>
                                    <Link href="/questions">
                                        Перейти к вопросам
                                        <ArrowRight className="size-4" />
                                    </Link>
                                </Button>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Button asChild size="lg">
                                    <Link href="/questions/create">
                                        Задать вопрос
                                        <ArrowRight className="size-4" />
                                    </Link>
                                </Button>
                                <Button asChild size="lg" variant="secondary">
                                    <Link href="/publications/create">Написать публикацию</Link>
                                </Button>
                            </div>
                        </div>

                        <div className="grid content-start gap-3 sm:grid-cols-2">
                            <StatCard icon={Newspaper} label="Публикаций" value={overview.stats.publications_count} />
                            <StatCard icon={CircleHelp} label="Вопросов" value={overview.stats.questions_count} />
                            <StatCard icon={CheckCircle2} label="Решённых" value={overview.stats.solved_questions_count} />
                            <StatCard icon={Users} label="Участников" value={overview.stats.members_count} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card/80">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lightbulb className="size-5 text-primary" />
                            Навигация по сообществу
                        </CardTitle>
                        <CardDescription>
                            Быстрый переход к разделам, где пользователь может читать, отвечать, публиковать и подписываться.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        <QuickAction href="/trends" title="Популярное" description="Материалы за день, неделю и месяц" icon={Flame} />
                        <QuickAction href="/questions?filter=unanswered" title="Вопросы без ответа" description="Помочь участникам и получить репутацию" icon={MessageSquare} />
                        <QuickAction href="/tags" title="Темы и теги" description="Найти стек, на который стоит подписаться" icon={Tags} />
                        <QuickAction href="/users" title="Участники" description="Найти авторов, экспертов и активных участников" icon={Users} />
                    </CardContent>
                </Card>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {communityFeatures.map((item) => (
                    <FeatureCard key={item.title} {...item} />
                ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="gap-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Compass className="size-5 text-primary" />
                                        Рекомендации
                                    </CardTitle>
                                    <CardDescription>
                                        Персональная подборка материалов, вопросов и тегов на основе подписок, сохранений, реакций и трендов.
                                    </CardDescription>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {feedTabs.map((tab) => (
                                        <Button key={tab.value} asChild size="sm" variant={view === tab.value ? "default" : "outline"}>
                                            <Link href={`/?view=${tab.value}&period=${period}`}>{tab.label}</Link>
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Популярное за</span>
                                {periodTabs.map((tab) => (
                                    <Button key={tab.value} asChild size="sm" variant={period === tab.value ? "secondary" : "ghost"}>
                                        <Link href={`/?view=${view}&period=${tab.value}`}>{tab.label}</Link>
                                    </Button>
                                ))}
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-3">
                            {view === "for-you" ? (
                                recommendations.length > 0 ? (
                                    recommendations.map((recommendation) => (
                                        <RecommendationCard key={`${recommendation.type}-${recommendation.href}`} recommendation={recommendation} />
                                    ))
                                ) : (
                                    <EmptyState
                                        icon={Compass}
                                        title="Рекомендации пока пустые"
                                        description="Подпишитесь на теги, сохраните материалы или поставьте реакции, чтобы подборка стала точнее."
                                        actionHref="/tags"
                                        actionLabel="Выбрать теги"
                                    />
                                )
                            ) : view === "trends" ? (
                                trendItems.length > 0 ? (
                                    trendItems.map((trend, index) => <TrendItemRow key={`${trend.type}-${trend.href}`} trend={trend} index={index + 1} />)
                                ) : (
                                    <EmptyState icon={Flame} title="Тренды пока пустые" description="Тренды появятся после реакций, комментариев и новых материалов." />
                                )
                            ) : view === "unanswered" ? (
                                unansweredQuestions.length > 0 ? (
                                    unansweredQuestions.map((question) => (
                                        <QuestionFeedCard key={question.id} question={question} label="Без ответа" reason="Можно помочь участнику и получить репутацию" />
                                    ))
                                ) : (
                                    <EmptyState icon={CircleHelp} title="Нет вопросов без ответа" description="Сейчас все опубликованные вопросы уже получили ответы." />
                                )
                            ) : feedItems.length > 0 ? (
                                feedItems.map((item) => <FeedItemCard key={`${item.type}-${item.item.id}`} feedItem={item} />)
                            ) : (
                                <EmptyState
                                    icon={Compass}
                                    title="Популярное пока пустое"
                                    description="После публикаций, вопросов и реакций здесь появится популярный контент."
                                    actionHref="/questions/create"
                                    actionLabel="Задать первый вопрос"
                                />
                            )}
                        </CardContent>
                    </Card>

                    <section className="grid gap-4 lg:grid-cols-2">
                        <ContentPanel
                            title="Популярные публикации"
                            description="Материалы, которые чаще читают, оценивают и сохраняют."
                            href="/publications"
                            action="Все публикации"
                            icon={Newspaper}
                        >
                            {popularPublications.length > 0 ? (
                                <div className="grid gap-3">
                                    {popularPublications.map((publication) => (
                                        <PublicationRow key={publication.id} publication={publication} />
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    icon={Newspaper}
                                    title="Публикаций пока нет"
                                    description="После добавления материалов здесь появится лента сообщества."
                                    actionHref="/publications/create"
                                    actionLabel="Создать публикацию"
                                />
                            )}
                        </ContentPanel>

                        <ContentPanel
                            title="Актуальные вопросы"
                            description="Открытые обсуждения, вопросы с ответами и найденные решения."
                            href="/questions"
                            action="Все вопросы"
                            icon={CircleHelp}
                        >
                            {actualQuestions.length > 0 ? (
                                <div className="grid gap-3">
                                    {actualQuestions.map((question) => (
                                        <QuestionRow key={question.id} question={question} />
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    icon={CircleHelp}
                                    title="Вопросов пока нет"
                                    description="Здесь будут отображаться открытые, нерешённые и решённые вопросы участников."
                                    actionHref="/questions/create"
                                    actionLabel="Задать вопрос"
                                />
                            )}
                        </ContentPanel>
                    </section>
                </div>

                <aside className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Flame className="size-5 text-primary" />
                                Тренды
                            </CardTitle>
                            <CardDescription>
                                Популярные темы, публикации и вопросы за выбранный период.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {trendItems.length > 0 ? (
                                trendItems.map((trend, index) => (
                                    <TrendItemRow key={`${trend.type}-${trend.href}`} trend={trend} index={index + 1} />
                                ))
                            ) : popularTags.length > 0 ? (
                                popularTags.slice(0, 8).map((tag, index) => (
                                    <TrendTagRow key={tag.id} tag={tag} index={index + 1} />
                                ))
                            ) : (
                                <p className="text-sm leading-6 text-muted-foreground">Тренды появятся после активности по тегам.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="size-5 text-primary" />
                                Активные участники
                            </CardTitle>
                            <CardDescription>
                                Авторы и эксперты с высокой репутацией.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {topUsers.length > 0 ? (
                                <div className="grid gap-3">
                                    {topUsers.map((user, index) => (
                                        <TopUserRow key={user.id} user={user} index={index + 1} />
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    icon={Trophy}
                                    title="Рейтинг пока пуст"
                                    description="Когда участники начнут отвечать, публиковать и получать реакции, здесь появятся лидеры."
                                />
                            )}
                        </CardContent>
                    </Card>
                </aside>
            </section>
        </div>
    )
}

function StatCard({
    icon: Icon,
    label,
    value,
}: {
    icon: ElementType
    label: string
    value: number
}) {
    return (
        <div className="border bg-background/65 p-4 shadow-sm backdrop-blur">
            <div className="mb-4 flex size-9 items-center justify-center border bg-primary/10 text-primary">
                <Icon className="size-4" />
            </div>
            <div className="text-2xl font-semibold tracking-tight">{value}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
        </div>
    )
}

function QuickAction({
    icon: Icon,
    title,
    description,
    href,
}: {
    icon: ElementType
    title: string
    description: string
    href: string
}) {
    return (
        <Link href={href} className="group flex items-start gap-3 border bg-background/60 p-4 transition-colors hover:border-primary/50 hover:bg-muted/40">
            <div className="flex size-10 shrink-0 items-center justify-center border bg-primary/10 text-primary">
                <Icon className="size-4" />
            </div>
            <div className="min-w-0">
                <p className="font-medium group-hover:text-primary">{title}</p>
                <p className="text-sm leading-5 text-muted-foreground">{description}</p>
            </div>
        </Link>
    )
}

function FeatureCard({
    icon: Icon,
    title,
    description,
}: {
    icon: ElementType
    title: string
    description: string
}) {
    return (
        <Card className="transition-colors hover:ring-primary/40">
            <CardContent className="space-y-4 p-5">
                <div className="flex size-10 items-center justify-center border bg-primary/10 text-primary">
                    <Icon className="size-5" />
                </div>
                <div className="space-y-1.5">
                    <h3 className="font-medium">{title}</h3>
                    <p className="text-sm leading-6 text-muted-foreground">{description}</p>
                </div>
            </CardContent>
        </Card>
    )
}

function ContentPanel({
    icon: Icon,
    title,
    description,
    href,
    action,
    children,
}: {
    icon: ElementType
    title: string
    description: string
    href: string
    action: string
    children: ReactNode
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Icon className="size-5 text-primary" />
                    {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
                <CardAction>
                    <Button asChild variant="ghost" size="sm">
                        <Link href={href}>
                            {action}
                            <ArrowRight className="size-4" />
                        </Link>
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    )
}


function RecommendationCard({ recommendation }: { recommendation: CommunityRecommendation }) {
    const isTag = recommendation.type === "tag"
    const badge = isTag ? "Тег" : recommendation.type === "publication" ? "Публикация" : "Вопрос"
    const icon = isTag ? <Hash className="size-4 text-muted-foreground" /> : <ArrowRight className="size-4 text-muted-foreground" />

    return (
        <Link href={recommendation.href} className="group block border bg-background/50 p-4 transition-colors hover:border-primary/50 hover:bg-muted/40">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{badge}</Badge>
                        <Badge variant="outline" className="gap-1">
                            <Sparkles className="size-3" />
                            {recommendation.score} баллов
                        </Badge>
                    </div>
                    <h3 className="line-clamp-2 text-lg font-semibold leading-snug group-hover:text-primary">
                        {recommendation.title}
                    </h3>
                    {recommendation.description ? (
                        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{recommendation.description}</p>
                    ) : null}
                    <p className="text-sm leading-6 text-primary/90">{recommendation.reason}</p>
                </div>
                {icon}
            </div>
        </Link>
    )
}

function FeedItemCard({ feedItem }: { feedItem: CommunityFeedItem }) {
    if (feedItem.type === "publication") {
        return <PublicationFeedCard publication={feedItem.item as Publication} reason={feedItem.reason} label={feedItem.label} />
    }

    return <QuestionFeedCard question={feedItem.item as IssueQuestion} reason={feedItem.reason} label={feedItem.label} />
}

function PublicationFeedCard({ publication, reason, label }: { publication: Publication; reason?: string; label?: string }) {
    return (
        <article className="group border bg-background/50 p-4 transition-colors hover:border-primary/50 hover:bg-muted/40">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{label ?? publication.type_label ?? "публикация"}</Badge>
                        <Badge variant="outline" className="gap-1">
                            <Flame className="size-3" />
                            {reason ?? "рекомендация"}
                        </Badge>
                    </div>
                    <h3 className="line-clamp-2 text-lg font-semibold leading-snug">
                        <Link href={`/publications/${publication.slug}`} className="transition-colors group-hover:text-primary">
                            {publication.title}
                        </Link>
                    </h3>
                    {publication.excerpt ? (
                        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{publication.excerpt}</p>
                    ) : null}
                </div>
                <div className="grid min-w-28 grid-cols-3 gap-2 text-center text-xs text-muted-foreground md:grid-cols-1">
                    <Metric value={publication.likes_count ?? 0} label="реакций" />
                    <Metric value={publication.comments_count ?? 0} label="комментариев" />
                    <Metric value={publication.saved_count ?? 0} label="сохранений" />
                </div>
            </div>
        </article>
    )
}

function QuestionFeedCard({ question, reason, label }: { question: IssueQuestion; reason?: string; label?: string }) {
    return (
        <article className="group border bg-background/50 p-4 transition-colors hover:border-primary/50 hover:bg-muted/40">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={question.is_solved ? "default" : "secondary"}>
                            {label ?? question.workflow_status_label ?? question.status_label ?? "открыт"}
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                            <Clock3 className="size-3" />
                            {reason ?? "актуальный вопрос"}
                        </Badge>
                    </div>
                    <h3 className="line-clamp-2 text-lg font-semibold leading-snug">
                        <Link href={`/questions/${question.slug}`} className="transition-colors group-hover:text-primary">
                            {question.title}
                        </Link>
                    </h3>
                    {question.excerpt ? (
                        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{question.excerpt}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                        {question.tags?.slice(0, 4).map((tag) => (
                            <TagLink key={tag.id || tag.slug} tag={tag} />
                        ))}
                    </div>
                </div>
                <div className="grid min-w-28 grid-cols-3 gap-2 text-center text-xs text-muted-foreground md:grid-cols-1">
                    <Metric value={question.answers_count ?? 0} label="ответов" />
                    <Metric value={question.views_count ?? 0} label="просмотров" />
                    <Metric value={question.likes_count ?? 0} label="реакций" />
                </div>
            </div>
        </article>
    )
}

function Metric({ value, label }: { value: number; label: string }) {
    return (
        <span className="border bg-muted/20 px-2 py-1">
            <strong className="text-foreground">{value}</strong> {label}
        </span>
    )
}

function PublicationRow({ publication }: { publication: Publication }) {
    return (
        <Link
            href={`/publications/${publication.slug}`}
            className="group border bg-background/40 p-4 transition-colors hover:border-primary/50 hover:bg-muted/40"
        >
            <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{publication.type_label ?? "публикация"}</Badge>
                    {publication.reading_time_minutes ? (
                        <span className="text-xs text-muted-foreground">{publication.reading_time_minutes} мин.</span>
                    ) : null}
                </div>
                <h3 className="font-medium leading-snug group-hover:text-primary">{publication.title}</h3>
                {publication.excerpt ? (
                    <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{publication.excerpt}</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{publication.likes_count ?? 0} реакций</span>
                    <span>{publication.comments_count ?? 0} комментариев</span>
                    <span>{publication.author?.name ?? "Автор"}</span>
                </div>
            </div>
        </Link>
    )
}

function QuestionRow({ question }: { question: IssueQuestion }) {
    return (
        <article className="group border bg-background/40 p-4 transition-colors hover:border-primary/50 hover:bg-muted/40">
            <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={question.is_solved ? "default" : "secondary"}>
                        {question.workflow_status_label ?? question.status_label ?? "открыт"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{question.answers_count ?? 0} ответов</span>
                </div>
                <h3 className="font-medium leading-snug">
                    <Link href={`/questions/${question.slug}`} className="transition-colors group-hover:text-primary">
                        {question.title}
                    </Link>
                </h3>
                {question.excerpt ? (
                    <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{question.excerpt}</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                    {question.tags?.slice(0, 3).map((tag) => (
                        <TagLink key={tag.id || tag.slug} tag={tag} />
                    ))}
                </div>
            </div>
        </article>
    )
}

function TagLink({ tag }: { tag: { id?: number; slug: string; name: string; color?: string | null } }) {
    const tagColor = tag.color?.trim() || "#ffffff"

    return (
        <Link
            href={`/tags/${tag.slug}`}
            className="border px-2 py-1 text-xs font-medium transition-all hover:-translate-y-0.5 hover:bg-muted/50"
            style={{
                borderColor: tagColor,
                color: tagColor,
                backgroundColor: /^#[0-9a-f]{6}$/i.test(tagColor) ? `${tagColor}14` : "rgb(255 255 255 / 0.06)",
            }}
        >
            #{tag.name}
        </Link>
    )
}

function TrendItemRow({ trend, index }: { trend: CommunityTrend; index: number }) {
    return (
        <Link href={trend.href} className="group flex items-center justify-between gap-3 border bg-background/45 p-3 transition-colors hover:border-primary/50 hover:bg-muted/40">
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center border bg-primary/10 text-xs font-semibold text-primary">
                    {index}
                </span>
                <div className="min-w-0">
                    <p className="truncate font-medium group-hover:text-primary">{trend.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{trend.metric_label ?? `${trend.score} баллов тренда`}</p>
                </div>
            </div>
            <Hash className="size-4 text-muted-foreground" />
        </Link>
    )
}

function TrendTagRow({ tag, index }: { tag: CommunityTag; index: number }) {
    return (
        <Link href={`/tags/${tag.slug}`} className="group flex items-center justify-between gap-3 border bg-background/45 p-3 transition-colors hover:border-primary/50 hover:bg-muted/40">
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center border bg-primary/10 text-xs font-semibold text-primary">
                    {index}
                </span>
                <div className="min-w-0">
                    <p className="truncate font-medium group-hover:text-primary">#{tag.name}</p>
                    <p className="text-xs text-muted-foreground">{tag.usage_count} материалов</p>
                </div>
            </div>
            <Hash className="size-4 text-muted-foreground" />
        </Link>
    )
}

function TopUserRow({ user, index }: { user: CommunityTopUser; index: number }) {
    return (
        <Link
            href={`/users/${user.id}`}
            className="border bg-background/40 p-4 transition-colors hover:border-primary/50 hover:bg-muted/40"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center border bg-muted/40 text-xs font-semibold">
                        {index}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate font-medium">{user.name}</p>
                        <p className="truncate text-sm text-muted-foreground">
                            {user.headline ?? user.reputation_level?.label ?? "участник сообщества"}
                        </p>
                    </div>
                </div>
                <Badge variant="secondary">{user.reputation_score}</Badge>
            </div>
        </Link>
    )
}

function EmptyState({
    icon: Icon,
    title,
    description,
    actionHref,
    actionLabel,
}: {
    icon: ElementType
    title: string
    description: string
    actionHref?: string
    actionLabel?: string
}) {
    return (
        <Empty className="border py-10">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <Icon className="size-5" />
                </EmptyMedia>
                <EmptyTitle>{title}</EmptyTitle>
                <EmptyDescription>{description}</EmptyDescription>
            </EmptyHeader>
            {actionHref && actionLabel ? (
                <EmptyContent>
                    <Button asChild size="sm">
                        <Link href={actionHref}>{actionLabel}</Link>
                    </Button>
                </EmptyContent>
            ) : null}
        </Empty>
    )
}
