"use client"

import Link from "next/link"
import type { ComponentType, ReactNode } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { AlertCircle, Bookmark, Clock3, Eye, Flame, Loader2, MessageSquare, RefreshCw, Search, Sparkles, TrendingUp, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import { getPopularPublications } from "@/features/publications/api"
import { formatPublicationDate, getPublicationTypeLabel } from "@/features/publications/lib/publication-labels"
import { TagBadge } from "@/features/tags/components/tag-badge"
import { UserAvatar } from "@/features/users/components/user-avatar"
import type { PopularPublicationPeriod, Publication, PublicationType } from "@/features/publications/types"

const periods: Array<{ value: PopularPublicationPeriod; label: string }> = [{ value: "day", label: "День" }, { value: "week", label: "Неделя" }, { value: "month", label: "Месяц" }, { value: "all", label: "За всё время" }]
const sortOptions = [{ value: "popular", label: "Популярные" }, { value: "new", label: "Новые" }, { value: "discussed", label: "Обсуждаемые" }, { value: "rating", label: "По рейтингу" }, { value: "views", label: "По просмотрам" }] as const
type SortMode = (typeof sortOptions)[number]["value"]
const INITIAL_LIMIT = 8
const LOAD_MORE_LIMIT = 6

export function PopularPublicationsFeed() {
    const [period, setPeriod] = useState<PopularPublicationPeriod>("week")
    const [publications, setPublications] = useState<Publication[]>([])
    const [nextPage, setNextPage] = useState<number | null>(1)
    const [hasMore, setHasMore] = useState(false)
    const [isInitialLoading, setIsInitialLoading] = useState(true)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [query, setQuery] = useState("")
    const [sort, setSort] = useState<SortMode>("popular")
    const [typeFilter, setTypeFilter] = useState<PublicationType | "all">("all")
    const shouldReduceMotion = useReducedMotion()

    const loadPublications = useCallback(async (targetPeriod: PopularPublicationPeriod, page: number, mode: "replace" | "append", targetSort = sort, targetType = typeFilter) => {
        if (mode === "replace") {
            setIsInitialLoading(true)
        } else {
            setIsLoadingMore(true)
        }
        setError(null)
        try {
            const response = await getPopularPublications({ period: targetPeriod, limit: mode === "replace" ? INITIAL_LIMIT : LOAD_MORE_LIMIT, page, sort: targetSort, type: targetType })
            setPublications((current) => mode === "replace" ? response.data : mergePublications(current, response.data))
            setHasMore(response.meta.has_more)
            setNextPage(response.meta.next_page)
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить публикации")
        } finally {
            setIsInitialLoading(false)
            setIsLoadingMore(false)
        }
    }, [sort, typeFilter])

    useEffect(() => { void loadPublications(period, 1, "replace", sort, typeFilter) }, [period, sort, typeFilter, loadPublications])

    const availableTypes = useMemo(() => (["article", "guide", "news", "post", "tutorial", "opinion"] as PublicationType[]).map((type) => [type, getPublicationTypeLabel(type)] as [PublicationType, string]), [])
    const filteredPublications = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase()
        return publications.filter((publication) => {
            const searchSurface = [publication.title, publication.excerpt, publication.author?.name, ...(publication.tags || []).map((tag) => tag.name)].filter(Boolean).join(" ").toLowerCase()
            return !normalizedQuery || searchSurface.includes(normalizedQuery)
        })
    }, [publications, query])

    const [featuredPublication, ...regularPublications] = filteredPublications
    const transition = shouldReduceMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" as const }
    const cardVariants = { hidden: shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 }, exit: shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 } }

    return (
        <section className="space-y-5" aria-labelledby="popular-publications-title">
            <PageHeader period={period} onPeriodChange={setPeriod} />
            <PublicationsToolbar query={query} sort={sort} typeFilter={typeFilter} availableTypes={availableTypes} onQueryChange={setQuery} onSortChange={setSort} onTypeFilterChange={setTypeFilter} />
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0 space-y-4">
                    <AnimatePresence mode="wait">
                        {isInitialLoading ? <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4"><FeaturedPublicationSkeleton /><div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <PopularPublicationSkeleton key={index} />)}</div></motion.div> : error && publications.length === 0 ? <ErrorState message={error} onRetry={() => loadPublications(period, 1, "replace", sort, typeFilter)} /> : publications.length === 0 ? <EmptyState title="Публикации не найдены" description="Для выбранного периода пока нет популярных публикаций." /> : filteredPublications.length === 0 ? <EmptyState title="Публикации не найдены" description="Попробуйте изменить фильтры или поисковый запрос." /> : (
                            <motion.div key={`list-${period}-${query}-${sort}-${typeFilter}`} initial="hidden" animate="show" exit="hidden" className="space-y-4">
                                {featuredPublication && <motion.div variants={cardVariants} transition={transition}><FeaturedPublicationCard publication={featuredPublication} periodLabel={periods.find((item) => item.value === period)?.label || "Неделя"} /></motion.div>}
                                <div className="space-y-3">{regularPublications.map((publication) => <motion.div key={publication.id} variants={cardVariants} transition={transition}><PublicationCard publication={publication} /></motion.div>)}</div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    {!isInitialLoading && publications.length > 0 && filteredPublications.length > 0 && <div className="flex flex-col items-center gap-3 pt-2">{error && <p className="text-sm text-destructive" role="alert">{error}</p>}{hasMore && nextPage ? <Button type="button" variant="secondary" size="lg" onClick={() => loadPublications(period, nextPage, "append", sort, typeFilter)} disabled={isLoadingMore}>{isLoadingMore ? <><Loader2 className="size-4 animate-spin" />Загружаем…</> : "Загрузить ещё"}</Button> : <p className="text-sm text-muted-foreground">Больше публикаций нет</p>}</div>}
                </div>
                {!isInitialLoading && publications.length > 0 && <PublicationsSidebar publications={publications} />}
            </div>
        </section>
    )
}

function PageHeader({ period, onPeriodChange }: { period: PopularPublicationPeriod; onPeriodChange: (period: PopularPublicationPeriod) => void }) {
    return <header className="space-y-3"><nav aria-label="Хлебные крошки" className="text-xs text-muted-foreground"><Link href="/" className="transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">Главная</Link></nav><div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div className="space-y-1"><h1 id="popular-publications-title" className="text-3xl font-bold tracking-tight md:text-4xl">Популярные публикации</h1><p className="max-w-2xl text-sm text-muted-foreground md:text-base">Самые обсуждаемые и полезные материалы сообщества</p></div><ToggleGroup type="single" value={period} onValueChange={(value) => { if (value) onPeriodChange(value as PopularPublicationPeriod) }} className="flex flex-wrap justify-start rounded-xl border bg-card/70 p-1 lg:justify-end" aria-label="Период популярных публикаций">{periods.map((item) => <ToggleGroupItem key={item.value} value={item.value} aria-label={`Показать за период: ${item.label}`} className="rounded-lg px-3 text-xs sm:text-sm">{item.label}</ToggleGroupItem>)}</ToggleGroup></div></header>
}
function PublicationsToolbar(props: { query: string; sort: SortMode; typeFilter: PublicationType | "all"; availableTypes: Array<[PublicationType, string]>; onQueryChange: (value: string) => void; onSortChange: (value: SortMode) => void; onTypeFilterChange: (value: PublicationType | "all") => void }) { return <div className="rounded-2xl border bg-card/60 p-3"><div className="flex flex-col gap-3 lg:flex-row"><label className="relative min-w-0 flex-1"><span className="sr-only">Поиск по публикациям</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={props.query} onChange={(event) => props.onQueryChange(event.target.value)} aria-label="Поиск по публикациям" placeholder="Поиск по публикациям…" className="pl-9" /></label><Select value={props.sort} onValueChange={(value) => props.onSortChange(value as SortMode)}><SelectTrigger className="w-full lg:w-44" aria-label="Сортировка публикаций"><SelectValue /></SelectTrigger><SelectContent>{sortOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select><div className="flex flex-wrap gap-2" role="group" aria-label="Фильтр по типу публикации"><Button type="button" size="sm" variant={props.typeFilter === "all" ? "default" : "outline"} onClick={() => props.onTypeFilterChange("all")} className="rounded-full">Все</Button>{props.availableTypes.map(([type, label]) => <Button key={type} type="button" size="sm" variant={props.typeFilter === type ? "default" : "outline"} onClick={() => props.onTypeFilterChange(type)} className="rounded-full">{label}</Button>)}</div></div></div> }
function FeaturedPublicationCard({ publication, periodLabel }: { publication: Publication; periodLabel: string }) { return <PublicationCardShell publication={publication} className="border-primary/35 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_34%),hsl(var(--card)/0.92)] p-5 md:p-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><Badge className="rounded-full"><Sparkles className="size-3.5" />Выбор сообщества</Badge><Badge variant="outline" className="rounded-full">{publication.reason_label || periodLabel}</Badge></div><PublicationTags publication={publication} /><h2 className="mt-4 line-clamp-2 text-2xl font-bold tracking-tight transition-colors group-hover:text-primary md:text-3xl">{publication.title}</h2>{publication.excerpt && <p className="mt-3 line-clamp-3 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">{publication.excerpt}</p>}<div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><PublicationAuthor publication={publication} /><PublicationMetrics publication={publication} /></div></PublicationCardShell> }
function PublicationCard({ publication }: { publication: Publication }) { return <PublicationCardShell publication={publication} className="h-full p-4"><PublicationTags publication={publication} compact />{publication.reason_label && <p className="mt-3 text-xs font-medium uppercase tracking-wide text-primary">{publication.reason_label}</p>}<h2 className="mt-3 line-clamp-2 text-xl font-semibold tracking-tight transition-colors group-hover:text-primary">{publication.title}</h2>{publication.excerpt && <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{publication.excerpt}</p>}<div className="mt-4 space-y-3"><PublicationAuthor publication={publication} compact /><PublicationMetrics publication={publication} /></div></PublicationCardShell> }
function PublicationCardShell({ publication, className, children }: { publication: Publication; className?: string; children: ReactNode }) { return <article className={cn("group relative h-full rounded-2xl border bg-card/85 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card focus-within:ring-[3px] focus-within:ring-ring/50", className)}><Link href={`/publications/${publication.slug}`} aria-label={`Читать публикацию: ${publication.title}`} className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none" /><div className="pointer-events-none relative z-20">{children}</div></article> }
function PublicationTags({ publication, compact = false }: { publication: Publication; compact?: boolean }) { return <div className="pointer-events-auto flex flex-wrap items-center gap-1.5"><Badge variant="secondary" className="rounded-full">{getPublicationTypeLabel(publication.type, publication.content_type_label || publication.type_label)}</Badge>{(publication.tags || []).slice(0, compact ? 3 : 5).map((tag) => <TagBadge key={tag.id || tag.slug} tag={tag} compact={compact} />)}</div> }
function PublicationAuthor({ publication, compact = false }: { publication: Publication; compact?: boolean }) { const author = publication.author; return <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground"><UserAvatar user={{ name: author?.name || "Автор", avatar: author?.avatar || null, avatar_url: author?.avatar_url || null }} className={compact ? "size-7" : "size-8"} size="sm" /><span className="min-w-0 truncate"><span className="font-medium text-foreground">{author?.name || "Автор"}</span><span> · {formatPublicationDate(publication.published_at || publication.created_at)}</span>{author?.role && <span className="hidden sm:inline"> · {author.role}</span>}</span></div> }
function PublicationMetrics({ publication }: { publication: Publication }) { const rating = publication.rating ?? (publication.likes_count || 0) - (publication.dislikes_count || 0); return <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-muted-foreground"><span className="text-base font-bold text-primary">{rating > 0 ? `+${rating}` : rating} рейтинг</span><span className="inline-flex items-center gap-1.5"><Eye className="size-3.5 text-primary" />{formatCompact(publication.views_count || 0)} просмотров</span><span className="inline-flex items-center gap-1.5"><MessageSquare className="size-3.5 text-primary" />{publication.comments_count || 0} комментариев</span><span className="inline-flex items-center gap-1.5"><Bookmark className="size-3.5 text-primary" />{publication.saved_count || 0}</span><span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5 text-primary" />{publication.reading_time_minutes || publication.reading_time || 1} мин</span></div> }
function PublicationsSidebar({ publications }: { publications: Publication[] }) { const trends = getTrendingTags(publications); const authors = getActiveAuthors(publications); const active = [...publications].sort((a,b)=>activityScore(b)-activityScore(a)).slice(0,3); return <aside className="hidden xl:block"><div className="sticky top-20 space-y-3"><SidebarSection title="Тренды недели" icon={TrendingUp}>{trends.map((tag) => <Link key={tag.slug} href={`/tags/${tag.slug}`} className="flex items-center justify-between rounded-xl px-2 py-1.5 text-sm transition-colors hover:bg-muted/50 hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"><span>#{tag.name}</span><span className="text-xs text-muted-foreground">{tag.count}</span></Link>)}</SidebarSection><SidebarSection title="Активные авторы" icon={Users}>{authors.map((author) => <div key={author.id} className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-sm"><span className="inline-flex min-w-0 items-center gap-2"><UserAvatar user={{ name: author.name, avatar: author.avatar, avatar_url: author.avatar_url }} className="size-7" size="sm" /><span className="truncate">{author.name}</span></span><span className="text-xs text-muted-foreground">{author.count}</span></div>)}</SidebarSection><SidebarSection title="Активность" icon={Flame}>{active.map((publication) => <Link key={publication.id} href={`/publications/${publication.slug}`} className="block rounded-xl px-2 py-1.5 text-sm transition-colors hover:bg-muted/50 hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"><span className="line-clamp-1">Обсуждают: {publication.title}</span><span className="mt-1 block text-xs text-muted-foreground">{publication.comments_count || 0} комментариев · {publication.likes_count || 0} лайков</span></Link>)}</SidebarSection></div></aside> }
function SidebarSection({ title, icon: Icon, children }: { title: string; icon: ComponentType<{ className?: string }>; children: ReactNode }) { return <section className="rounded-2xl border bg-card/60 p-4"><h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Icon className="size-4 text-primary" />{title}</h2><div className="space-y-1">{children}</div></section> }
function FeaturedPublicationSkeleton() { return <Card className="bg-card/80"><CardContent className="space-y-4 p-6"><Skeleton className="h-6 w-36 rounded-full" /><Skeleton className="h-9 w-4/5" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-8 w-full" /></CardContent></Card> }
function PopularPublicationSkeleton() { return <Card className="bg-card/80"><CardContent className="space-y-3 p-4"><Skeleton className="h-5 w-28 rounded-full" /><Skeleton className="h-7 w-4/5" /><Skeleton className="h-4 w-full" /><Skeleton className="h-7 w-full" /></CardContent></Card> }
function EmptyState({ title, description }: { title: string; description: string }) { return <Card className="border-dashed bg-card/70"><CardContent className="py-10 text-center"><p className="font-medium">{title}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></CardContent></Card> }
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) { return <Card className="border-destructive/30 bg-destructive/5"><CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3 text-sm"><AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" /><div><p className="font-medium text-destructive">Не удалось загрузить популярные публикации</p><p className="mt-1 text-muted-foreground">{message}</p></div></div><Button type="button" variant="outline" onClick={onRetry}><RefreshCw className="size-4" />Повторить</Button></CardContent></Card> }
function mergePublications(current: Publication[], next: Publication[]) { const seen = new Set(current.map((publication) => publication.id)); return [...current, ...next.filter((publication) => !seen.has(publication.id))] }
function activityScore(publication: Publication) { return publication.score || (publication.likes_count || 0) * 3 + (publication.comments_count || 0) * 4 + (publication.saved_count || 0) * 2 + (publication.views_count || 0) * 0.2 }
function getTrendingTags(publications: Publication[]) { const map = new Map<string, { name: string; slug: string; count: number }>(); publications.flatMap((publication) => publication.tags || []).forEach((tag) => { const current = map.get(tag.slug) || { name: tag.name, slug: tag.slug, count: 0 }; current.count += 1; map.set(tag.slug, current) }); return Array.from(map.values()).sort((a,b)=>b.count-a.count).slice(0,6) }
function getActiveAuthors(publications: Publication[]) { const map = new Map<number, { id: number; name: string; avatar?: string | null; avatar_url?: string | null; count: number }>(); publications.forEach((publication) => { const author = publication.author; if (!author?.id) return; const current = map.get(author.id) || { id: author.id, name: author.name || "Автор", avatar: author.avatar, avatar_url: author.avatar_url, count: 0 }; current.count += 1; map.set(author.id, current) }); return Array.from(map.values()).sort((a,b)=>b.count-a.count).slice(0,5) }

function formatCompact(value: number) { return new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 }).format(value) }
