import type { ComponentType } from "react"
import Link from "next/link"
import { Filter, Flame, Plus, Search, Sparkles, Tags, TrendingUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { PublicationCard } from "@/features/publications/components/publication-card"
import { PublicationBreadcrumbs } from "@/features/publications/components/publication-breadcrumbs"
import { PagePagination } from "@/components/shared/page-pagination"
import { publicationTypeLabels } from "@/features/publications/lib/publication-labels"
import { TagBadge } from "@/features/tags/components/tag-badge"
import type { Publication, PublicationPaginationMeta } from "@/features/publications/types"

type PublicationListPageProps = {
    publications: Publication[]
    filters?: {
        search?: string
        type?: string
        tag?: string
        sort?: string
        page?: string
    }
    meta?: PublicationPaginationMeta
}

const sortItems = [
    { value: "latest", label: "Новые" },
    { value: "popular", label: "Популярные" },
    { value: "discussed", label: "Обсуждаемые" },
    { value: "saved", label: "Сохраняемые" },
]

export function PublicationListPage({ publications, filters, meta }: PublicationListPageProps) {
    const search = filters?.search || ""
    const activeType = filters?.type || ""
    const activeTag = filters?.tag || ""
    const activeSort = filters?.sort || "latest"
    const stats = getPublicationStats(publications)

    return (
        <div className="space-y-6">
            <PublicationBreadcrumbs items={[{ label: "Публикации" }]} />

            <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
                <Card className="overflow-hidden border-primary/20 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_34%)] shadow-sm">
                    <CardHeader className="space-y-5 p-6 md:p-8">
                        <div className="inline-flex w-fit items-center gap-2 border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                            <Sparkles className="size-3.5 text-primary" />
                            Материалы сообщества
                        </div>
                        <div className="space-y-3">
                            <CardTitle className="max-w-3xl text-4xl tracking-tight md:text-6xl">
                                Публикации
                            </CardTitle>
                            <CardDescription className="max-w-3xl text-sm leading-7 md:text-base">
                                Статьи, заметки, новости и гайды от участников. Здесь можно читать опыт других разработчиков, сохранять полезное и обсуждать материалы в комментариях.
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button asChild>
                                <Link href="/publications/create">
                                    <Plus className="size-4" />
                                    Написать публикацию
                                </Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href="/publications/my">Мои публикации</Link>
                            </Button>
                        </div>
                    </CardHeader>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <TrendingUp className="size-5 text-primary" />
                            Текущая выдача
                        </CardTitle>
                        <CardDescription>
                            Быстрая сводка по публикациям, которые сейчас отображаются.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                        <SmallStat icon={Flame} label="реакций" value={stats.reactions} />
                        <SmallStat icon={Tags} label="тегов" value={stats.tags} />
                    </CardContent>
                </Card>
            </section>

            <Card className="shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Filter className="size-4 text-primary" />
                                Фильтрация публикаций
                            </CardTitle>
                            <CardDescription>
                                Поиск по названию, типу материала, тегу и активности.
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {sortItems.map((item) => (
                                <Button
                                    key={item.value}
                                    variant={activeSort === item.value ? "default" : "outline"}
                                    size="sm"
                                    asChild
                                >
                                    <Link href={makeSortHref(item.value, { search, type: activeType, tag: activeTag })}>
                                        {item.label}
                                    </Link>
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 p-4 pt-0">
                    <form className="flex flex-col gap-3 md:flex-row" action="/publications">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                name="search"
                                defaultValue={search}
                                placeholder="Поиск по названию или описанию"
                                className="pl-9"
                            />
                        </div>

                        <select
                            name="type"
                            defaultValue={activeType}
                            className="h-9 border border-input bg-input/30 px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                            <option value="">Все типы</option>
                            {Object.entries(publicationTypeLabels).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>

                        <Input
                            name="tag"
                            defaultValue={activeTag}
                            placeholder="Тег"
                            className="md:w-44"
                        />

                        <select
                            name="sort"
                            defaultValue={activeSort}
                            className="h-9 border border-input bg-input/30 px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                            {sortItems.map((item) => (
                                <option key={item.value} value={item.value}>{item.label}</option>
                            ))}
                        </select>

                        <Button type="submit">Найти</Button>
                    </form>

                    {(search || activeType || activeTag || activeSort !== "latest") && (
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span>Активные параметры:</span>
                            {search && <Badge variant="secondary">поиск: {search}</Badge>}
                            {activeType && <Badge variant="secondary">тип: {publicationTypeLabels[activeType as keyof typeof publicationTypeLabels] || activeType}</Badge>}
                            {activeTag && <Badge variant="secondary">тег: {activeTag}</Badge>}
                            {activeSort !== "latest" && <Badge variant="secondary">сортировка: {sortItems.find((item) => item.value === activeSort)?.label}</Badge>}
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/publications">Сбросить</Link>
                            </Button>
                        </div>
                    )}

                    {stats.topTags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 border-t pt-4 text-sm text-muted-foreground">
                            <span>Теги в выдаче:</span>
                            {stats.topTags.map((tag) => (
                                <TagBadge key={tag.slug} tag={tag} compact />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {publications.length > 0 ? (
                <div className="grid gap-5 xl:grid-cols-2">
                    {publications.map((publication) => (
                        <PublicationCard key={publication.id} publication={publication} />
                    ))}
                </div>
            ) : (
                <Empty className="min-h-96 border border-dashed">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Search className="size-6" />
                        </EmptyMedia>
                        <EmptyTitle>Публикации не найдены</EmptyTitle>
                        <EmptyDescription>
                            Попробуй изменить фильтр или напиши первую публикацию по этой теме.
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button asChild>
                            <Link href="/publications/create">Написать публикацию</Link>
                        </Button>
                    </EmptyContent>
                </Empty>
            )}

            <PagePagination
                meta={meta}
                basePath="/publications"
                searchParams={{ search, type: activeType, tag: activeTag, sort: activeSort }}
            />
        </div>
    )
}

function makeSortHref(sort: string, filters: { search: string; type: string; tag: string }) {
    const params = new URLSearchParams()

    if (filters.search) params.set("search", filters.search)
    if (filters.type) params.set("type", filters.type)
    if (filters.tag) params.set("tag", filters.tag)
    if (sort !== "latest") params.set("sort", sort)

    const query = params.toString()

    return query ? `/publications?${query}` : "/publications"
}

function getPublicationStats(publications: Publication[]) {
    const tagMap = new Map<string, { name: string; slug: string; color?: string | null; count: number }>()

    const reactions = publications.reduce((sum, publication) => {
        publication.tags?.forEach((tag) => {
            const key = tag.slug || tag.name
            const current = tagMap.get(key)
            tagMap.set(key, {
                name: tag.name,
                slug: tag.slug,
                color: tag.color,
                count: (current?.count || 0) + 1,
            })
        })

        return sum + (publication.likes_count || 0) + (publication.dislikes_count || 0)
    }, 0)

    return {
        reactions,
        tags: tagMap.size,
        topTags: Array.from(tagMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 8),
    }
}

function SmallStat({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: number }) {
    return (
        <div className="border bg-muted/25 p-4">
            <div className="flex items-center gap-2">
                <Icon className="size-4 text-primary" />
                <span className="text-2xl font-semibold">{value}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
    )
}
