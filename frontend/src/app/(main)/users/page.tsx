import Link from "next/link"
import { ArrowRight, Search, Trophy, UserRound, Users } from "lucide-react"

import createLaravelApi from "@/lib/http/laravel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import type { CommunityDiscovery, CommunityOverview, CommunityTopUser } from "@/features/community/types"

export const dynamic = "force-dynamic"
export const revalidate = 0

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

async function getCommunityDiscovery(): Promise<CommunityDiscovery> {
    const api = createLaravelApi()

    try {
        const response = await api.get<CommunityDiscovery>("/community/discovery", { params: { period: "month" } })
        return response.data
    } catch {
        try {
            const response = await api.get<CommunityOverview>("/community/overview")
            return { ...emptyDiscovery, ...response.data }
        } catch {
            return emptyDiscovery
        }
    }
}

async function getUsers(query: string): Promise<CommunityTopUser[]> {
    if (!query) {
        return []
    }

    const api = createLaravelApi()

    try {
        const response = await api.get<{ data: CommunityTopUser[] }>("/community/users", { params: { q: query, limit: 24 } })
        return response.data.data
    } catch {
        return []
    }
}

type UsersPageProps = {
    searchParams?: Promise<{ q?: string }> | { q?: string }
}

export default async function UsersPage({ searchParams }: UsersPageProps = {}) {
    const params = await Promise.resolve(searchParams ?? {})
    const query = (params.q || "").trim()
    const overview = await getCommunityDiscovery()
    const searchedUsers = await getUsers(query)
    const users = query ? searchedUsers : (overview.top_users || [])

    return (
        <div className="space-y-6">
            <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
                <Card className="border-primary/20 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_34%)] shadow-sm">
                    <CardHeader className="space-y-4 p-6 md:p-8">
                        <div className="inline-flex w-fit items-center gap-2 border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                            <Users className="size-3.5 text-primary" />
                            каталог участников
                        </div>
                        <div className="space-y-3">
                            <CardTitle className="text-4xl tracking-tight md:text-6xl">Участники</CardTitle>
                            <CardDescription className="max-w-3xl text-base leading-7">
                                Страница участников показывает экспертов, авторов и активных пользователей сообщества.
                            </CardDescription>
                        </div>
                    </CardHeader>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Search className="size-5 text-primary" />
                            Поиск участника
                        </CardTitle>
                        <CardDescription>Поиск по имени, описанию профиля и профессиональному заголовку.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-3">
                            <Input name="q" defaultValue={query} placeholder="Laravel, backend, PostgreSQL" />
                            <Button className="w-full">Найти</Button>
                        </form>
                    </CardContent>
                </Card>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
                <StatCard title="Участников" value={overview.stats.members_count} />
                <StatCard title="Комментариев" value={overview.stats.comments_count} />
                <StatCard title="Решённых вопросов" value={overview.stats.solved_questions_count} />
            </section>

            {users.length > 0 ? (
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {users.map((user, index) => <UserCard key={user.id} user={user} index={index + 1} />)}
                </section>
            ) : (
                <Empty className="min-h-80 border border-dashed">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <UserRound className="size-6" />
                        </EmptyMedia>
                        <EmptyTitle>{query ? "Ничего не найдено" : "Участники пока не отображаются"}</EmptyTitle>
                        <EmptyDescription>
                            Когда пользователи начнут публиковать материалы и отвечать на вопросы, здесь появится рейтинг.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            )}
        </div>
    )
}

function StatCard({ title, value }: { title: string; value: number }) {
    return (
        <Card>
            <CardContent className="p-5">
                <div className="text-3xl font-semibold tracking-tight">{value}</div>
                <p className="text-sm text-muted-foreground">{title}</p>
            </CardContent>
        </Card>
    )
}

function UserCard({ user, index }: { user: CommunityTopUser; index: number }) {
    return (
        <Card className="transition-colors hover:border-primary/40">
            <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center border bg-primary/10 font-semibold text-primary">
                            {index}
                        </span>
                        <div className="min-w-0">
                            <h2 className="truncate font-semibold">{user.name}</h2>
                            <p className="truncate text-sm text-muted-foreground">{user.headline || user.reputation_level?.label || "участник сообщества"}</p>
                        </div>
                    </div>
                    <Badge variant="secondary" className="gap-1">
                        <Trophy className="size-3" />
                        {user.reputation_score}
                    </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
                    <span className="border bg-muted/20 p-2">{user.stats?.publications_count || 0}<br />публикаций</span>
                    <span className="border bg-muted/20 p-2">{user.stats?.questions_count || 0}<br />вопросов</span>
                    <span className="border bg-muted/20 p-2">{user.stats?.answers_count || 0}<br />ответов</span>
                </div>

                <Button asChild variant="outline" className="w-full">
                    <Link href={`/users/${user.id}`}>
                        Открыть профиль
                        <ArrowRight className="size-4" />
                    </Link>
                </Button>
            </CardContent>
        </Card>
    )
}
