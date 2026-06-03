import Link from "next/link"
import { ArrowRight, CircleHelp, Flame, Hash, Newspaper, Sparkles, Tags } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import createLaravelApi from "@/lib/http/laravel"
import { getAccessTokenCookie } from "@/lib/auth/cookies"
import type { CommunityRecommendation } from "@/features/community/types"

export const dynamic = "force-dynamic"
export const revalidate = 0

type RecommendationsPageProps = {
    searchParams?: Promise<{ period?: string }> | { period?: string }
}

type RecommendationResponse = {
    period: "day" | "week" | "month"
    personalized?: boolean
    data: CommunityRecommendation[]
    meta?: {
        matched_tags?: Array<{ id: number; name: string; slug: string; color?: string | null }>
        followed_authors_count?: number
        signals_count?: number
    }
}

const periods = [
    { label: "День", value: "day" },
    { label: "Неделя", value: "week" },
    { label: "Месяц", value: "month" },
]

function normalizePeriod(value?: string) {
    return ["day", "week", "month"].includes(value || "") ? value! : "week"
}

async function getRecommendations(period: string): Promise<RecommendationResponse> {
    const token = await getAccessTokenCookie()
    const api = createLaravelApi(token)

    try {
        const response = await api.get<RecommendationResponse>("/community/recommendations", { params: { period } })
        return response.data
    } catch {
        return { period: period as RecommendationResponse["period"], personalized: false, data: [] }
    }
}

export default async function RecommendationsPage({ searchParams }: RecommendationsPageProps = {}) {
    const params = await Promise.resolve(searchParams ?? {})
    const activePeriod = normalizePeriod(params.period)
    const response = await getRecommendations(activePeriod)
    const recommendations = response.data ?? []
    const matchedTags = response.meta?.matched_tags ?? []

    return (
        <div className="space-y-6">
            <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
                <Card className="border-primary/20 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_34%)] shadow-sm">
                    <CardHeader className="space-y-4 p-6 md:p-8">
                        <div className="inline-flex w-fit items-center gap-2 border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                            <Sparkles className="size-3.5 text-primary" />
                            {response.personalized ? "персональная подборка" : "подборка сообщества"}
                        </div>
                        <div className="space-y-3">
                            <CardTitle className="text-4xl tracking-tight md:text-6xl">Рекомендации</CardTitle>
                            <CardDescription className="max-w-3xl text-base leading-7">
                                Материалы, вопросы и теги, подобранные по подпискам, сохранениям, реакциям, интересам и текущим трендам.
                            </CardDescription>
                        </div>
                    </CardHeader>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>Период</CardTitle>
                        <CardDescription>Период влияет на популярность и свежесть материалов в подборке.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        {periods.map((period) => (
                            <Button key={period.value} asChild variant={activePeriod === period.value ? "default" : "outline"}>
                                <Link href={`/recommendations?period=${period.value}`}>{period.label}</Link>
                            </Button>
                        ))}
                        <Button asChild variant="ghost">
                            <Link href="/interests">Настроить интересы</Link>
                        </Button>
                    </CardContent>
                </Card>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="space-y-2 p-5">
                        <div className="flex size-10 items-center justify-center border bg-primary/10 text-primary">
                            <Sparkles className="size-5" />
                        </div>
                        <div className="text-3xl font-semibold tracking-tight">{recommendations.length}</div>
                        <p className="text-sm text-muted-foreground">элементов в подборке</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="space-y-2 p-5">
                        <div className="flex size-10 items-center justify-center border bg-primary/10 text-primary">
                            <Tags className="size-5" />
                        </div>
                        <div className="text-3xl font-semibold tracking-tight">{matchedTags.length}</div>
                        <p className="text-sm text-muted-foreground">тем в профиле интересов</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="space-y-2 p-5">
                        <div className="flex size-10 items-center justify-center border bg-primary/10 text-primary">
                            <Flame className="size-5" />
                        </div>
                        <div className="text-3xl font-semibold tracking-tight">{response.meta?.signals_count ?? 0}</div>
                        <p className="text-sm text-muted-foreground">сигналов персонализации</p>
                    </CardContent>
                </Card>
            </section>

            {matchedTags.length > 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Ваши темы</CardTitle>
                        <CardDescription>Теги, которые влияют на персональную подборку.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                        {matchedTags.map((tag) => (
                            <Button key={tag.id} asChild variant="outline" size="sm">
                                <Link href={`/tags/${tag.slug}`}>#{tag.name}</Link>
                            </Button>
                        ))}
                    </CardContent>
                </Card>
            ) : null}

            <section className="grid gap-4 xl:grid-cols-2">
                {recommendations.length > 0 ? (
                    recommendations.map((recommendation) => (
                        <RecommendationCard key={`${recommendation.type}-${recommendation.href}`} recommendation={recommendation} />
                    ))
                ) : (
                    <Card className="xl:col-span-2">
                        <CardContent className="p-8">
                            <Empty>
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <Sparkles className="size-5" />
                                    </EmptyMedia>
                                    <EmptyTitle>Рекомендации пока пустые</EmptyTitle>
                                    <EmptyDescription>
                                        Подпишитесь на теги, сохраните публикации или оцените вопросы, чтобы система собрала персональную подборку.
                                    </EmptyDescription>
                                    <Button asChild variant="outline">
                                        <Link href="/interests">Выбрать интересы</Link>
                                    </Button>
                                </EmptyHeader>
                            </Empty>
                        </CardContent>
                    </Card>
                )}
            </section>
        </div>
    )
}

function RecommendationCard({ recommendation }: { recommendation: CommunityRecommendation }) {
    const icon = recommendation.type === "publication"
        ? <Newspaper className="size-5" />
        : recommendation.type === "question"
            ? <CircleHelp className="size-5" />
            : <Hash className="size-5" />
    const label = recommendation.type === "publication" ? "Публикация" : recommendation.type === "question" ? "Вопрос" : "Тег"

    return (
        <Link href={recommendation.href} className="group block">
            <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/40">
                <CardHeader>
                    <div className="mb-2 flex items-start justify-between gap-4">
                        <div className="flex size-10 shrink-0 items-center justify-center border bg-primary/10 text-primary">
                            {icon}
                        </div>
                        <Badge variant="secondary">{recommendation.score} баллов</Badge>
                    </div>
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{label}</Badge>
                        </div>
                        <CardTitle className="line-clamp-2 group-hover:text-primary">{recommendation.title}</CardTitle>
                        {recommendation.description ? (
                            <CardDescription className="line-clamp-3 leading-6">{recommendation.description}</CardDescription>
                        ) : null}
                    </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-4 text-sm">
                    <span className="line-clamp-2 text-primary/90">{recommendation.reason}</span>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </CardContent>
            </Card>
        </Link>
    )
}
