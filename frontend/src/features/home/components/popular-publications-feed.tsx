"use client"

import Link from "next/link"
import type { ComponentType, ReactNode } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
    AlertCircle,
    Bookmark,
    Clock3,
    Eye,
    Flame,
    Loader2,
    MessageSquare,
    RefreshCw,
    Search,
    TrendingUp,
    Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useSessionRefreshKey } from "@/lib/auth/use-session-refresh-key"
import { cn } from "@/lib/utils"
import { getPopularPublications } from "@/features/publications/api"
import { formatPublicationDate, getPublicationTypeLabel } from "@/features/publications/lib/publication-labels"
import { TagBadge } from "@/features/tags/components/tag-badge"
import { UserAvatar } from "@/features/users/components/user-avatar"
import type { PopularPublicationPeriod, Publication, PublicationTag, PublicationType } from "@/features/publications/types"

const periods: Array<{ value: PopularPublicationPeriod; label: string }> = [
    { value: "day", label: "День" },
    { value: "week", label: "Неделя" },
    { value: "month", label: "Месяц" },
    { value: "all", label: "Всё время" },
]

const sortOptions = [
    { value: "popular", label: "Популярные" },
    { value: "new", label: "Новые" },
    { value: "discussed", label: "Обсуждаемые" },
    { value: "rating", label: "По рейтингу" },
    { value: "views", label: "По просмотрам" },
] as const

type SortMode = (typeof sortOptions)[number]["value"]
type FeedStatus = "idle" | "loading" | "loading-more" | "error"

const INITIAL_LIMIT = 10
const LOAD_MORE_LIMIT = 8
const availableTypes = ["article", "guide", "tutorial", "news", "post", "opinion", "release", "question_related"] as PublicationType[]
const FALLBACK_PUBLICATION_TYPE = "post" as PublicationType

export function PopularPublicationsFeed() {
    const [period, setPeriod] = useState<PopularPublicationPeriod>("week")
    const [publications, setPublications] = useState<Publication[]>([])
    const [nextPage, setNextPage] = useState<number | null>(1)
    const [hasMore, setHasMore] = useState(false)
    const [status, setStatus] = useState<FeedStatus>("loading")
    const [error, setError] = useState<string | null>(null)
    const [query, setQuery] = useState("")
    const [sort, setSort] = useState<SortMode>("popular")
    const [typeFilter, setTypeFilter] = useState<PublicationType | "all">("all")
    const sessionRefreshKey = useSessionRefreshKey()

    const loadPublications = useCallback(
        async (page: number, mode: "replace" | "append") => {
            setStatus(mode === "replace" ? "loading" : "loading-more")
            setError(null)

            if (mode === "replace") {
                setPublications([])
                setNextPage(null)
                setHasMore(false)
            }

            try {
                const response = await getPopularPublications({
                    period,
                    limit: mode === "replace" ? INITIAL_LIMIT : LOAD_MORE_LIMIT,
                    page,
                    sort,
                    type: typeFilter,
                })

                const nextPublications = Array.isArray(response.data)
                    ? response.data.filter(isRenderablePublication)
                    : []

                setPublications((current) =>
                    mode === "replace" ? nextPublications : mergePublications(current, nextPublications)
                )
                setHasMore(Boolean(response.meta?.has_more))
                setNextPage(response.meta?.next_page ?? null)
                setStatus("idle")
            } catch (loadError) {
                setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить публикации")
                setStatus("error")
            }
        },
        [period, sort, typeFilter]
    )

    useEffect(() => {
        void loadPublications(1, "replace")
    }, [loadPublications, sessionRefreshKey])

    const typeOptions = useMemo(
        () => availableTypes.map((type) => [type, getPublicationTypeLabel(type)] as [PublicationType, string]),
        []
    )

    const safePublications = useMemo(
        () => publications.filter(isRenderablePublication),
        [publications]
    )

    const filteredPublications = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase()

        if (!normalizedQuery) {
            return safePublications
        }

        return safePublications.filter((publication) => {
            const tags = safeTags(publication).map((tag) => tag.name)
            const searchSurface = [safeText(publication.title), safeText(publication.excerpt), safeText(publication.author?.name), ...tags]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()

            return searchSurface.includes(normalizedQuery)
        })
    }, [safePublications, query])

    const isInitialLoading = status === "loading" && safePublications.length === 0
    const isLoadingMore = status === "loading-more"

    return (
        <section className="space-y-5" aria-labelledby="popular-publications-title">
            <FeedHeader period={period} onPeriodChange={setPeriod} />

            <FeedToolbar
                query={query}
                sort={sort}
                typeFilter={typeFilter}
                typeOptions={typeOptions}
                onQueryChange={setQuery}
                onSortChange={setSort}
                onTypeFilterChange={setTypeFilter}
            />

            <div className="grid gap-5 xl:grid-cols-[minmax(0,820px)_320px] xl:items-start">
                <div className="min-w-0 space-y-3">
                    {isInitialLoading ? (
                        <PublicationListSkeleton />
                    ) : status === "error" && safePublications.length === 0 ? (
                        <ErrorState message={error ?? "Неизвестная ошибка"} onRetry={() => loadPublications(1, "replace")} />
                    ) : safePublications.length === 0 ? (
                        <EmptyState title="Пока нет публикаций" description="Для выбранного периода не найдено материалов." />
                    ) : filteredPublications.length === 0 ? (
                        <EmptyState title="Ничего не найдено" description="Попробуйте изменить поиск, тип материала или сортировку." />
                    ) : (
                        <div className="space-y-3">
                            {filteredPublications.map((publication, index) => (
                                <PublicationCard key={publicationKey(publication, index)} publication={publication} index={index} />
                            ))}
                        </div>
                    )}

                    {!isInitialLoading && safePublications.length > 0 && filteredPublications.length > 0 ? (
                        <div className="flex flex-col items-center gap-3 pt-3">
                            {status === "error" && error ? <p className="text-sm text-destructive">{error}</p> : null}
                            {hasMore && nextPage ? (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="lg"
                                    onClick={() => loadPublications(nextPage, "append")}
                                    disabled={isLoadingMore}
                                    className="rounded-none"
                                >
                                    {isLoadingMore ? (
                                        <>
                                            <Loader2 className="size-4 animate-spin" />
                                            Загружаем…
                                        </>
                                    ) : (
                                        "Загрузить ещё"
                                    )}
                                </Button>
                            ) : (
                                <p className="text-sm text-muted-foreground">Больше публикаций нет</p>
                            )}
                        </div>
                    ) : null}
                </div>

                {safePublications.length > 0 ? <FeedAside publications={safePublications} /> : null}
            </div>
        </section>
    )
}

function FeedHeader({
    period,
    onPeriodChange,
}: {
    period: PopularPublicationPeriod
    onPeriodChange: (period: PopularPublicationPeriod) => void
}) {
    return (
        <header className="rounded-none border bg-card/50 p-4 md:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.24em] text-primary">
                        <span>Вектор</span>
                        <span className="text-muted-foreground">/</span>
                        <span>Лента сообщества</span>
                    </div>
                    <div>
                        <h1 id="popular-publications-title" className="text-2xl font-bold tracking-tight md:text-3xl">
                            Популярные публикации
                        </h1>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                            Материалы, которые читают, сохраняют и обсуждают участники платформы.
                        </p>
                    </div>
                </div>

                <ToggleGroup
                    type="single"
                    value={period}
                    onValueChange={(value) => {
                        if (value) onPeriodChange(value as PopularPublicationPeriod)
                    }}
                    className="flex flex-wrap justify-start rounded-none border bg-background/60 p-1 lg:justify-end"
                    aria-label="Период популярных публикаций"
                >
                    {periods.map((item) => (
                        <ToggleGroupItem key={item.value} value={item.value} className="rounded-none px-3 text-xs sm:text-sm">
                            {item.label}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </div>
        </header>
    )
}

function FeedToolbar({
    query,
    sort,
    typeFilter,
    typeOptions,
    onQueryChange,
    onSortChange,
    onTypeFilterChange,
}: {
    query: string
    sort: SortMode
    typeFilter: PublicationType | "all"
    typeOptions: Array<[PublicationType, string]>
    onQueryChange: (value: string) => void
    onSortChange: (value: SortMode) => void
    onTypeFilterChange: (value: PublicationType | "all") => void
}) {
    return (
        <div className="rounded-none border bg-card/40 p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <label className="relative min-w-0 flex-1">
                    <span className="sr-only">Поиск по публикациям</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(event) => onQueryChange(event.target.value)}
                        placeholder="Поиск по заголовку, автору или тегу"
                        className="h-10 rounded-none bg-background/70 pl-9"
                    />
                </label>

                <Select value={sort} onValueChange={(value) => onSortChange(value as SortMode)}>
                    <SelectTrigger className="h-10 w-full rounded-none bg-background/70 lg:w-48" aria-label="Сортировка публикаций">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {sortOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Фильтр по типу публикации">
                <Button
                    type="button"
                    size="sm"
                    variant={typeFilter === "all" ? "default" : "outline"}
                    onClick={() => onTypeFilterChange("all")}
                    className="rounded-none"
                >
                    Все
                </Button>
                {typeOptions.map(([type, label]) => (
                    <Button
                        key={type}
                        type="button"
                        size="sm"
                        variant={typeFilter === type ? "default" : "outline"}
                        onClick={() => onTypeFilterChange(type)}
                        className="rounded-none"
                    >
                        {label}
                    </Button>
                ))}
            </div>
        </div>
    )
}

function PublicationCard({ publication, index }: { publication: Publication; index: number }) {
    const rating = getPublicationRating(publication)
    const slug = safeSlug(publication)
    const href = slug ? `/publications/${slug}` : "#"
    const title = safeText(publication.title) || "Без названия"
    const excerpt = safeText(publication.excerpt)

    return (
        <article className="group rounded-none border bg-card/70 transition-colors hover:border-primary/45 hover:bg-card/90">
            <div className="grid gap-0 md:grid-cols-[72px_minmax(0,1fr)]">
                <div className="hidden border-r bg-background/30 px-3 py-4 text-center md:block">
                    <p className="text-xs text-muted-foreground">#{index + 1}</p>
                    <p className={cn("mt-2 text-lg font-bold", rating >= 0 ? "text-primary" : "text-destructive")}>{formatSigned(rating)}</p>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">рейтинг</p>
                </div>

                <div className="p-4 md:p-5">
                    <PublicationAuthor publication={publication} />

                    <Link href={href} className="mt-3 block focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
                        <h2 className="line-clamp-2 text-xl font-semibold tracking-tight transition-colors group-hover:text-primary md:text-2xl">
                            {title}
                        </h2>
                    </Link>

                    {excerpt ? (
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground md:text-[15px]">
                            {excerpt}
                        </p>
                    ) : null}

                    <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <PublicationTags publication={publication} />
                        <PublicationMetrics publication={publication} />
                    </div>
                </div>
            </div>
        </article>
    )
}

function PublicationTags({ publication }: { publication: Publication }) {
    return (
        <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="rounded-none border-primary/30 bg-primary/5 text-primary">
                {getPublicationTypeLabel(safePublicationType(publication.type), safeText(publication.content_type_label || publication.type_label || publication.type) || "Публикация")}
            </Badge>
            {safeTags(publication).slice(0, 4).map((tag) => (
                <TagBadge key={tag.slug} tag={tag} compact />
            ))}
        </div>
    )
}

function PublicationAuthor({ publication }: { publication: Publication }) {
    const author = publication.author

    return (
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <UserAvatar
                user={{ name: safeText(author?.name) || "Автор", avatar: author?.avatar || null, avatar_url: author?.avatar_url || null }}
                className="size-8"
                size="sm"
            />
            <span className="min-w-0 truncate">
                <span className="font-medium text-foreground">{safeText(author?.name) || "Автор"}</span>
                <span> · {formatPublicationDate(publication.published_at || publication.created_at)}</span>
                <span> · {positiveNumber(publication.reading_time_minutes || publication.reading_time, 1)} мин</span>
            </span>
        </div>
    )
}

function PublicationMetrics({ publication }: { publication: Publication }) {
    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-muted-foreground">
            <Metric icon={Eye}>{formatCompact(publication.views_count)}</Metric>
            <Metric icon={MessageSquare}>{positiveNumber(publication.comments_count)}</Metric>
            <Metric icon={Bookmark}>{positiveNumber(publication.saved_count)}</Metric>
            <Metric icon={Clock3}>{positiveNumber(publication.reading_time_minutes || publication.reading_time, 1)} мин</Metric>
        </div>
    )
}

function Metric({ icon: Icon, children }: { icon: ComponentType<{ className?: string }>; children: ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <Icon className="size-3.5 text-primary" />
            {children}
        </span>
    )
}

function FeedAside({ publications }: { publications: Publication[] }) {
    const trends = getTrendingTags(publications)
    const authors = getActiveAuthors(publications)
    const active = [...publications].sort((a, b) => activityScore(b) - activityScore(a)).slice(0, 4)

    return (
        <aside className="hidden xl:block">
            <div className="sticky top-20 space-y-3">
                <AsideSection title="Тренды недели" icon={TrendingUp}>
                    {trends.length > 0 ? (
                        trends.map((tag) => (
                            <Link
                                key={tag.slug}
                                href={`/tags/${tag.slug}`}
                                className="flex items-center justify-between rounded-none px-2 py-1.5 text-sm transition-colors hover:bg-muted/50 hover:text-primary"
                            >
                                <span>#{tag.name}</span>
                                <span className="text-xs text-muted-foreground">{tag.count}</span>
                            </Link>
                        ))
                    ) : (
                        <p className="px-2 py-1.5 text-sm text-muted-foreground">Теги появятся после публикаций.</p>
                    )}
                </AsideSection>

                <AsideSection title="Обсуждают" icon={Flame}>
                    {active.map((publication, index) => {
                        const slug = safeSlug(publication)

                        return (
                            <Link
                                key={publicationKey(publication, index)}
                                href={slug ? `/publications/${slug}` : "#"}
                                className="block rounded-none px-2 py-2 text-sm transition-colors hover:bg-muted/50 hover:text-primary"
                            >
                                <span className="line-clamp-2">{safeText(publication.title) || "Без названия"}</span>
                                <span className="mt-1 block text-xs text-muted-foreground">
                                    {positiveNumber(publication.comments_count)} комментариев · {formatCompact(publication.views_count)} просмотров
                                </span>
                            </Link>
                        )
                    })}
                </AsideSection>

                <AsideSection title="Авторы" icon={Users}>
                    {authors.map((author) => (
                        <div key={author.id} className="flex items-center justify-between gap-2 rounded-none px-2 py-1.5 text-sm">
                            <span className="inline-flex min-w-0 items-center gap-2">
                                <UserAvatar user={{ name: author.name, avatar: author.avatar, avatar_url: author.avatar_url }} className="size-7" size="sm" />
                                <span className="truncate">{author.name}</span>
                            </span>
                            <span className="text-xs text-muted-foreground">{author.count}</span>
                        </div>
                    ))}
                </AsideSection>
            </div>
        </aside>
    )
}

function AsideSection({
    title,
    icon: Icon,
    children,
}: {
    title: string
    icon: ComponentType<{ className?: string }>
    children: ReactNode
}) {
    return (
        <section className="rounded-none border bg-card/50 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Icon className="size-4 text-primary" />
                {title}
            </h2>
            <div className="space-y-1">{children}</div>
        </section>
    )
}

function PublicationListSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
                <Card key={index} className="rounded-none bg-card/70">
                    <CardContent className="space-y-3 p-5">
                        <Skeleton className="h-8 w-52 rounded-none" />
                        <Skeleton className="h-7 w-4/5 rounded-none" />
                        <Skeleton className="h-4 w-full rounded-none" />
                        <Skeleton className="h-4 w-2/3 rounded-none" />
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

function EmptyState({ title, description }: { title: string; description: string }) {
    return (
        <Card className="rounded-none border-dashed bg-card/60">
            <CardContent className="py-10 text-center">
                <p className="font-medium">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <Card className="rounded-none border-destructive/30 bg-destructive/5">
            <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3 text-sm">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <div>
                        <p className="font-medium text-destructive">Не удалось загрузить главную ленту</p>
                        <p className="mt-1 text-muted-foreground">{message}</p>
                    </div>
                </div>
                <Button type="button" variant="outline" onClick={onRetry} className="rounded-none">
                    <RefreshCw className="size-4" />
                    Повторить
                </Button>
            </CardContent>
        </Card>
    )
}

function mergePublications(current: Publication[], next: Publication[]) {
    const seen = new Set(current.map((publication, index) => publicationKey(publication, index)))
    return [...current, ...next.filter((publication, index) => !seen.has(publicationKey(publication, index)))]
}

function activityScore(publication: Publication) {
    const explicitScore = positiveNumber(publication.score, NaN)

    return Number.isFinite(explicitScore)
        ? explicitScore
        : positiveNumber(publication.likes_count) * 3 + positiveNumber(publication.comments_count) * 4 + positiveNumber(publication.saved_count) * 2 + positiveNumber(publication.views_count) * 0.2
}

function getPublicationRating(publication: Publication) {
    const rating = positiveNumber(publication.rating, NaN)

    return Number.isFinite(rating) ? rating : positiveNumber(publication.likes_count) - positiveNumber(publication.dislikes_count)
}

function getTrendingTags(publications: Publication[]) {
    const map = new Map<string, { name: string; slug: string; count: number }>()

    publications
        .flatMap((publication) => safeTags(publication))
        .forEach((tag) => {
            const current = map.get(tag.slug) || { name: tag.name || tag.slug, slug: tag.slug, count: 0 }
            current.count += 1
            map.set(tag.slug, current)
        })

    return Array.from(map.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 7)
}

function getActiveAuthors(publications: Publication[]) {
    const map = new Map<number, { id: number; name: string; avatar?: string | null; avatar_url?: string | null; count: number }>()

    publications.forEach((publication) => {
        const author = publication.author
        const authorId = Number(author?.id)
        if (!Number.isFinite(authorId)) return

        const current = map.get(authorId) || {
            id: authorId,
            name: safeText(author?.name) || "Автор",
            avatar: author?.avatar,
            avatar_url: author?.avatar_url,
            count: 0,
        }
        current.count += 1
        map.set(authorId, current)
    })

    return Array.from(map.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
}

function formatSigned(value: number) {
    const safeValue = Number.isFinite(value) ? value : 0

    return safeValue > 0 ? `+${safeValue}` : String(safeValue)
}

function formatCompact(value?: number | string | null) {
    return new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 }).format(positiveNumber(value))
}

function isRenderablePublication(publication: Publication | null | undefined): publication is Publication {
    return Boolean(publication && typeof publication === "object" && (safeSlug(publication) || safeText(publication.title)))
}

function publicationKey(publication: Publication, index: number) {
    const id = publication.id ? String(publication.id) : ""
    const slug = safeSlug(publication)

    return id || slug || `${safeText(publication.title) || "publication"}-${index}`
}

function safeSlug(publication: Publication) {
    return typeof publication.slug === "string" && publication.slug.trim() ? publication.slug.trim() : ""
}

function safeText(value: unknown) {
    return typeof value === "string" ? value : ""
}

function positiveNumber(value?: number | string | null, fallback = 0) {
    const number = Number(value)

    if (!Number.isFinite(number) || number < 0) {
        return fallback
    }

    return number
}

function safePublicationType(value: unknown): PublicationType {
    return availableTypes.includes(value as PublicationType) ? value as PublicationType : FALLBACK_PUBLICATION_TYPE
}

function safeTags(publication: Publication): PublicationTag[] {
    return Array.isArray(publication.tags)
        ? publication.tags
            .filter((tag): tag is PublicationTag => Boolean(tag && typeof tag === "object" && typeof tag.slug === "string" && tag.slug.trim()))
            .map((tag, index) => ({
                ...tag,
                id: Number.isFinite(Number(tag.id)) ? Number(tag.id) : index,
                name: safeText(tag.name) || tag.slug,
                slug: tag.slug.trim(),
            }))
        : []
}
