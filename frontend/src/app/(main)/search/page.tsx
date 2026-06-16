import Link from "next/link"
import {
    ArrowRight,
    CircleHelp,
    Code2,
    FileCode2,
    Hash,
    MessageSquareText,
    Newspaper,
    Search,
    Sparkles,
    UserRound,
} from "lucide-react"

import { getAccessTokenCookie } from "@/lib/auth/cookies"
import createLaravelApi from "@/lib/http/laravel"
import type { SearchFilterType, SearchResponse, SearchResult, SearchSort } from "@/features/search/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { AiSearchPanel } from "@/features/search/components/ai-search-panel"
import { TagBadge } from "@/features/tags/components/tag-badge"
import { getUserProfileHrefOrFallback } from "@/features/users/lib/user-links"

const filters: Array<{ label: string; value: SearchFilterType }> = [
    { label: "Все", value: "all" },
    { label: "Публикации", value: "publications" },
    { label: "Вопросы", value: "questions" },
    { label: "Ответы", value: "answers" },
    { label: "Теги", value: "tags" },
    { label: "Участники", value: "users" },
    { label: "Сниппеты", value: "snippets" },
]

const sorts: Array<{ label: string; value: SearchSort }> = [
    { label: "Релевантность", value: "relevance" },
    { label: "Новые", value: "newest" },
    { label: "Популярные", value: "popular" },
]

type SearchPageProps = {
    searchParams?: Promise<{
        q?: string
        type?: string
        sort?: string
        page?: string
    }> | {
        q?: string
        type?: string
        sort?: string
        page?: string
    }
}

function normalizeType(value?: string): SearchFilterType {
    return filters.some((filter) => filter.value === value) ? value as SearchFilterType : "all"
}

function normalizeSort(value?: string): SearchSort {
    return sorts.some((sort) => sort.value === value) ? value as SearchSort : "relevance"
}

async function getSearchResults(params: { q: string; type: SearchFilterType; sort: SearchSort; page: number }): Promise<SearchResponse> {
    if (params.q.trim().length < 2) {
        return emptySearchResponse(params)
    }

    const token = await getAccessTokenCookie()
    const api = createLaravelApi(token)

    try {
        const response = await api.get<SearchResponse>("/search", {
            params: {
                q: params.q,
                type: params.type,
                sort: params.sort,
                page: params.page,
                per_page: 20,
            },
        })

        return response.data
    } catch (error) {
        console.log("[SEARCH_PAGE_ERROR]", error)
        return emptySearchResponse(params)
    }
}

function emptySearchResponse(params: { q: string; type: SearchFilterType; sort: SearchSort; page: number }): SearchResponse {
    return {
        data: [],
        groups: {},
        suggestions: [],
        meta: {
            q: params.q,
            type: params.type,
            sort: params.sort,
            page: params.page,
            per_page: 20,
            total: 0,
            last_page: 1,
            driver: "pgsql",
            engine: "pg_trgm",
        },
    }
}

function searchHref(params: { q: string; type?: SearchFilterType; sort?: SearchSort; page?: number }) {
    const query = new URLSearchParams()

    if (params.q) query.set("q", params.q)
    if (params.type && params.type !== "all") query.set("type", params.type)
    if (params.sort && params.sort !== "relevance") query.set("sort", params.sort)
    if (params.page && params.page > 1) query.set("page", String(params.page))

    const stringified = query.toString()
    return stringified ? `/search?${stringified}` : "/search"
}

export default async function SearchPage({ searchParams }: SearchPageProps = {}) {
    const params = await Promise.resolve(searchParams ?? {})
    const q = String(params.q ?? "").trim()
    const activeType = normalizeType(params.type)
    const activeSort = normalizeSort(params.sort)
    const page = Math.max(Number(params.page ?? 1), 1)
    const response = await getSearchResults({ q, type: activeType, sort: activeSort, page })
    const results = response.data ?? []
    const meta = response.meta

    return (
        <div className="space-y-6">
            <Card className="border-primary/20 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.15),transparent_36%)] shadow-sm">
                <CardHeader className="gap-5 p-6 md:p-8">
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                        <Search className="size-3.5 text-primary" />
                        PostgreSQL pg_trgm
                    </div>
                    <div className="space-y-3">
                        <CardTitle className="text-4xl tracking-tight md:text-6xl">Поиск по платформе</CardTitle>
                        <CardDescription className="max-w-3xl text-base leading-7">
                            Поиск по публикациям, вопросам, ответам, тегам, участникам и публичным сниппетам с ранжированием по релевантности.
                        </CardDescription>
                    </div>
                    <form action="/search" className="flex flex-col gap-3 sm:flex-row">
                        <Input
                            name="q"
                            defaultValue={q}
                            minLength={2}
                            placeholder="Например: Laravel Redis queue, PostgreSQL индекс, Next.js auth..."
                            className="h-11 rounded-xl bg-background/80"
                        />
                        <input type="hidden" name="type" value={activeType === "all" ? "" : activeType} />
                        <input type="hidden" name="sort" value={activeSort === "relevance" ? "" : activeSort} />
                        <Button type="submit" size="lg" className="shrink-0">
                            <Search className="size-4" />
                            Найти
                        </Button>
                    </form>
                </CardHeader>
            </Card>

            <section className="grid gap-4 xl:grid-cols-[260px_1fr]">
                <aside className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Тип контента</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2">
                            {filters.map((filter) => {
                                const count = filter.value === "all"
                                    ? meta.total
                                    : response.groups?.[filter.value]?.count ?? 0

                                return (
                                    <Button key={filter.value} asChild variant={activeType === filter.value ? "default" : "ghost"} className="justify-between">
                                        <Link href={searchHref({ q, type: filter.value, sort: activeSort })}>
                                            <span>{filter.label}</span>
                                            <span className="text-xs opacity-70">{count}</span>
                                        </Link>
                                    </Button>
                                )
                            })}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Сортировка</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2">
                            {sorts.map((sort) => (
                                <Button key={sort.value} asChild variant={activeSort === sort.value ? "default" : "ghost"} className="justify-start">
                                    <Link href={searchHref({ q, type: activeType, sort: sort.value })}>{sort.label}</Link>
                                </Button>
                            ))}
                        </CardContent>
                    </Card>

                    {response.suggestions?.length ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Похожие теги</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-wrap gap-2">
                                {response.suggestions.map((tag) => (
                                    <Badge key={tag.id} asChild variant="outline">
                                        <Link href={tag.href}>#{tag.name}</Link>
                                    </Badge>
                                ))}
                            </CardContent>
                        </Card>
                    ) : null}
                </aside>

                <main className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3 text-sm text-muted-foreground">
                        <div>
                            {q.length >= 2 ? (
                                <>Найдено: <span className="font-medium text-foreground">{meta.total}</span></>
                            ) : (
                                <>Введите минимум 2 символа для поиска.</>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {q.length >= 2 ? (
                                <Button asChild size="sm" variant="outline">
                                    <Link href={`/assistant?q=${encodeURIComponent(q)}`}>
                                        <Sparkles className="size-4" />
                                        Спросить AI
                                    </Link>
                                </Button>
                            ) : null}
                            <Badge variant="secondary">{meta.engine}</Badge>
                            <Badge variant="outline">{activeSort}</Badge>
                        </div>
                    </div>

                    {q.length >= 2 ? <AiSearchPanel query={q} type={activeType} /> : null}

                    {q.length < 2 ? (
                        <SearchEmpty title="Начните поиск" description="Введите технологию, ошибку, тему, имя пользователя или фрагмент кода." />
                    ) : results.length > 0 ? (
                        <>
                            <div className="grid gap-3">
                                {results.map((result) => (
                                    <SearchResultCard key={`${result.type}-${result.id}`} result={result} />
                                ))}
                            </div>
                            <SearchPagination q={q} type={activeType} sort={activeSort} page={meta.page} lastPage={meta.last_page} />
                        </>
                    ) : (
                        <SearchEmpty title="Ничего не найдено" description="Попробуйте другой запрос, технологию, тег или часть текста ошибки." />
                    )}
                </main>
            </section>
        </div>
    )
}

function SearchEmpty({ title, description }: { title: string; description: string }) {
    return (
        <Card>
            <CardContent className="p-8">
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Search className="size-5" />
                        </EmptyMedia>
                        <EmptyTitle>{title}</EmptyTitle>
                        <EmptyDescription>{description}</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            </CardContent>
        </Card>
    )
}

function SearchResultCard({ result }: { result: SearchResult }) {
    const Icon = resultIcon(result.type)
    const label = resultLabel(result.type)
    const meta = result.meta ?? {}

    return (
        <Card className="transition-colors hover:border-primary/50 hover:bg-muted/30">
            <CardHeader className="gap-3">
                <div className="flex items-start gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border bg-primary/10 text-primary">
                        <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{label}</Badge>
                            {result.matched_fields?.map((field) => (
                                <Badge key={field} variant="outline">{fieldLabel(field)}</Badge>
                            ))}
                            <Badge variant="outline">{Math.round(result.score)} баллов</Badge>
                        </div>
                        <Link href={result.type === "user" ? getUserProfileHrefOrFallback({ id: result.id, username: typeof result.meta?.username === "string" ? result.meta.username : null }) : result.href} className="group inline-flex items-start gap-2 text-lg font-medium leading-snug hover:text-primary">
                            <span>{result.title}</span>
                            <ArrowRight className="mt-1 size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                        {result.description ? (
                            <CardDescription className="line-clamp-3 leading-6">{result.description}</CardDescription>
                        ) : null}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {result.author ? (
                    <Link href={getUserProfileHrefOrFallback(result.author)} className="hover:text-primary">
                        {result.author.name}
                    </Link>
                ) : null}
                {typeof meta.answers_count === "number" ? <span>{meta.answers_count} ответов</span> : null}
                {typeof meta.views_count === "number" ? <span>{meta.views_count} просмотров</span> : null}
                {typeof meta.likes_count === "number" ? <span>{meta.likes_count} реакций</span> : null}
                {typeof meta.language === "string" ? <span>{meta.language}</span> : null}
                {typeof meta.reputation_score === "number" ? <span>{meta.reputation_score} репутации</span> : null}
                {result.tags?.slice(0, 5).map((tag) => (
                    <TagBadge key={tag.id} tag={tag} compact />
                ))}
            </CardContent>
        </Card>
    )
}

function SearchPagination({ q, type, sort, page, lastPage }: { q: string; type: SearchFilterType; sort: SearchSort; page: number; lastPage: number }) {
    if (lastPage <= 1) return null

    return (
        <div className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3">
            <Button asChild variant="outline" className={page <= 1 ? "pointer-events-none opacity-40" : ""}>
                <Link href={searchHref({ q, type, sort, page: Math.max(1, page - 1) })}>Назад</Link>
            </Button>
            <span className="text-sm text-muted-foreground">
                Страница {page} из {lastPage}
            </span>
            <Button asChild variant="outline" className={page >= lastPage ? "pointer-events-none opacity-40" : ""}>
                <Link href={searchHref({ q, type, sort, page: Math.min(lastPage, page + 1) })}>Вперёд</Link>
            </Button>
        </div>
    )
}

function resultIcon(type: SearchResult["type"]) {
    return {
        publication: Newspaper,
        question: CircleHelp,
        answer: MessageSquareText,
        tag: Hash,
        user: UserRound,
        snippet: FileCode2,
    }[type] ?? Code2
}

function resultLabel(type: SearchResult["type"]) {
    return {
        publication: "Публикация",
        question: "Вопрос",
        answer: "Ответ",
        tag: "Тег",
        user: "Участник",
        snippet: "Сниппет",
    }[type]
}

function fieldLabel(field: string) {
    const labels: Record<string, string> = {
        title: "заголовок",
        description: "описание",
        tags: "теги",
        content: "контент",
        answer: "ответ",
        question: "вопрос",
        name: "имя",
        slug: "slug",
        headline: "профиль",
        bio: "био",
        language: "язык",
        code: "код",
    }

    return labels[field] ?? field
}
