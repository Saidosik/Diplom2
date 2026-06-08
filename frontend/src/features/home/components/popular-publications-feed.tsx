"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { AlertCircle, Loader2, RefreshCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { getPopularPublications } from "@/features/publications/api"
import { PublicationCard } from "@/features/publications/components/publication-card"
import type { PopularPublicationPeriod, Publication } from "@/features/publications/types"

const periods: Array<{ value: PopularPublicationPeriod; label: string }> = [
    { value: "day", label: "День" },
    { value: "week", label: "Неделя" },
    { value: "month", label: "Месяц" },
    { value: "all", label: "За всё время" },
]

const INITIAL_LIMIT = 6
const LOAD_MORE_LIMIT = 6

export function PopularPublicationsFeed() {
    const [period, setPeriod] = useState<PopularPublicationPeriod>("week")
    const [publications, setPublications] = useState<Publication[]>([])
    const [nextPage, setNextPage] = useState<number | null>(1)
    const [hasMore, setHasMore] = useState(false)
    const [isInitialLoading, setIsInitialLoading] = useState(true)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const shouldReduceMotion = useReducedMotion()

    const loadPublications = useCallback(async (targetPeriod: PopularPublicationPeriod, page: number, mode: "replace" | "append") => {
        if (mode === "replace") {
            setIsInitialLoading(true)
        } else {
            setIsLoadingMore(true)
        }

        setError(null)

        try {
            const response = await getPopularPublications({
                period: targetPeriod,
                limit: mode === "replace" ? INITIAL_LIMIT : LOAD_MORE_LIMIT,
                page,
            })

            setPublications((current) => mode === "replace" ? response.data : mergePublications(current, response.data))
            setHasMore(response.meta.has_more)
            setNextPage(response.meta.next_page)
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить публикации")
        } finally {
            setIsInitialLoading(false)
            setIsLoadingMore(false)
        }
    }, [])

    useEffect(() => {
        void loadPublications(period, 1, "replace")
    }, [period, loadPublications])

    const containerVariants = useMemo(() => ({
        hidden: {},
        show: {
            transition: shouldReduceMotion ? { duration: 0 } : { staggerChildren: 0.045 },
        },
    }), [shouldReduceMotion])

    const cardVariants = useMemo(() => ({
        hidden: shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0 },
        exit: shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 },
    }), [shouldReduceMotion])

    const transition = shouldReduceMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" as const }

    return (
        <section className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <ToggleGroup
                    type="single"
                    value={period}
                    onValueChange={(value) => {
                        if (value) {
                            setPeriod(value as PopularPublicationPeriod)
                        }
                    }}
                    className="justify-start rounded-xl border bg-card/70 p-1"
                    aria-label="Период популярных публикаций"
                >
                    {periods.map((item) => (
                        <ToggleGroupItem key={item.value} value={item.value} className="rounded-lg px-3 text-sm">
                            {item.label}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>

                <Badge variant="secondary" className="w-fit">
                    {periods.find((item) => item.value === period)?.label}
                </Badge>
            </div>

            <AnimatePresence mode="wait">
                {isInitialLoading ? (
                    <motion.div
                        key={`loading-${period}`}
                        initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={shouldReduceMotion ? undefined : { opacity: 0, y: 4 }}
                        transition={transition}
                        className="grid gap-4 lg:grid-cols-2"
                    >
                        {Array.from({ length: INITIAL_LIMIT }).map((_, index) => (
                            <PopularPublicationSkeleton key={index} />
                        ))}
                    </motion.div>
                ) : error && publications.length === 0 ? (
                    <motion.div
                        key={`error-${period}`}
                        initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={shouldReduceMotion ? undefined : { opacity: 0, y: 4 }}
                        transition={transition}
                    >
                        <ErrorState message={error} onRetry={() => loadPublications(period, 1, "replace")} />
                    </motion.div>
                ) : publications.length === 0 ? (
                    <motion.div
                        key={`empty-${period}`}
                        initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={shouldReduceMotion ? undefined : { opacity: 0, y: 4 }}
                        transition={transition}
                    >
                        <Card className="border-dashed bg-card/70">
                            <CardContent className="py-10 text-center text-sm text-muted-foreground">
                                Для выбранного периода пока нет популярных публикаций.
                            </CardContent>
                        </Card>
                    </motion.div>
                ) : (
                    <motion.div
                        key={`list-${period}`}
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        exit="hidden"
                        className="grid gap-4 lg:grid-cols-2"
                    >
                        <AnimatePresence initial={false}>
                            {publications.map((publication) => (
                                <motion.div
                                    key={publication.id}
                                    variants={cardVariants}
                                    initial="hidden"
                                    animate="show"
                                    exit="exit"
                                    whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                                    transition={transition}
                                    className="h-full"
                                >
                                    <PublicationCard publication={publication} />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>

            {!isInitialLoading && publications.length > 0 && (
                <div className="flex flex-col items-center gap-3 pt-2">
                    {error && (
                        <p className="text-sm text-destructive" role="alert">
                            {error}
                        </p>
                    )}

                    {hasMore && nextPage ? (
                        <Button
                            type="button"
                            variant="secondary"
                            size="lg"
                            onClick={() => loadPublications(period, nextPage, "append")}
                            disabled={isLoadingMore}
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
            )}
        </section>
    )
}

function PopularPublicationSkeleton() {
    return (
        <Card className="overflow-hidden bg-card/80">
            <CardContent className="space-y-4 p-6">
                <div className="flex gap-2">
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton className="h-8 w-4/5" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="h-16" />
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3 text-sm">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <div>
                        <p className="font-medium text-destructive">Не удалось загрузить популярные публикации</p>
                        <p className="mt-1 text-muted-foreground">{message}</p>
                    </div>
                </div>
                <Button type="button" variant="outline" onClick={onRetry}>
                    <RefreshCw className="size-4" />
                    Повторить
                </Button>
            </CardContent>
        </Card>
    )
}

function mergePublications(current: Publication[], next: Publication[]) {
    const seen = new Set(current.map((publication) => publication.id))
    return [...current, ...next.filter((publication) => !seen.has(publication.id))]
}
