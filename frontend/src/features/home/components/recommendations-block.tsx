"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { AlertCircle, RefreshCw, Sparkles, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getRecommendations, trackRecommendationEvent } from "@/features/community/api"
import { useSessionRefreshKey } from "@/lib/auth/use-session-refresh-key"
import type { CommunityRecommendation, RecommendationEventPayload } from "@/features/community/types"

type RecommendationMetaWithFallback = {
    fallback?: boolean
    fallback_reason?: string
    strategy?: string
}

export function RecommendationsBlock() {
    const viewedKeysRef = useRef(new Set<string>())
    const [hiddenKeys, setHiddenKeys] = useState<string[]>([])
    const sessionRefreshKey = useSessionRefreshKey()
    const recommendationsQuery = useQuery({
        queryKey: ["recommendations", "home", "week", sessionRefreshKey],
        queryFn: () => getRecommendations("week"),
        retry: 1,
        staleTime: 0,
        refetchOnWindowFocus: false,
    })

    useEffect(() => {
        viewedKeysRef.current.clear()
        setHiddenKeys([])
    }, [sessionRefreshKey])

    const mode = recommendationsQuery.data?.mode ?? "guest"
    const meta = recommendationsQuery.data?.meta as RecommendationMetaWithFallback | undefined
    const isFallback = Boolean(meta?.fallback)
    const strategy = String(meta?.strategy ?? (isFallback ? "fallback" : "guest_trending"))
    const isSemantic = strategy.includes("semantic")
    const sourceRecommendations = Array.isArray(recommendationsQuery.data?.data) ? recommendationsQuery.data.data : []
    const recommendations = useMemo(
        () => sourceRecommendations
            .filter(isValidRecommendation)
            .filter((item) => !hiddenKeys.includes(recommendationKey(item)))
            .slice(0, 4),
        [hiddenKeys, sourceRecommendations]
    )

    useEffect(() => {
        recommendations.forEach((item, index) => {
            const key = recommendationKey(item)
            if (viewedKeysRef.current.has(key)) {
                return
            }

            viewedKeysRef.current.add(key)
            void safeTrack({
                event_type: "view",
                target_type: recommendationTargetType(item),
                target_id: recommendationTargetId(item),
                context: "home",
                metadata: {
                    source: "recommendations_block",
                    position: index + 1,
                    strategy,
                    mode,
                    fallback: isFallback,
                    recommendation_type: item.type,
                    title: item.title,
                    href: item.href,
                },
            })
        })
    }, [isFallback, mode, recommendations, strategy])

    const handleClick = (item: CommunityRecommendation, index: number) => {
        void safeTrack({
            event_type: "click",
            target_type: recommendationTargetType(item),
            target_id: recommendationTargetId(item),
            context: "home",
            metadata: {
                source: "recommendations_block",
                position: index + 1,
                strategy,
                mode,
                fallback: isFallback,
                recommendation_type: item.type,
                title: item.title,
                href: item.href,
            },
        })
    }

    const handleHide = (item: CommunityRecommendation, index: number) => {
        setHiddenKeys((current) => [...current, recommendationKey(item)])
        void safeTrack({
            event_type: "hide",
            target_type: recommendationTargetType(item),
            target_id: recommendationTargetId(item),
            context: "home",
            metadata: {
                source: "recommendations_block",
                position: index + 1,
                strategy,
                mode,
                fallback: isFallback,
                recommendation_type: item.type,
                title: item.title,
                href: item.href,
            },
        })
    }

    const modeLabel = isFallback ? "Fallback" : mode === "personalized" ? "Для вас" : "Гость"
    const description = isFallback
        ? "Персональная лента временно недоступна, поэтому показываем безопасную публичную подборку."
        : mode === "personalized"
            ? "Подборка учитывает ваши теги, реакции, сохранения и подписки."
            : "Гостевая подборка показывает тренды, свежие материалы и вопросы без ответа."

    return (
        <section className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
            <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Sparkles className="h-5 w-5 text-primary" />
                            Рекомендации Вектора
                        </CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                        {isFallback ? (
                            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-600">
                                <AlertCircle className="size-3.5" />
                                Используем публичный fallback вместо персонального ответа.
                            </p>
                        ) : isSemantic ? (
                            <p className="mt-1 text-xs font-medium text-primary">Подобрано по вашим интересам</p>
                        ) : null}
                    </div>
                    <Badge variant="secondary">{modeLabel}</Badge>
                </CardHeader>
                <CardContent>
                    {recommendationsQuery.isLoading ? (
                        <div className="grid gap-3 md:grid-cols-2">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <Skeleton key={index} className="h-28 rounded-xl" />
                            ))}
                        </div>
                    ) : recommendationsQuery.isError ? (
                        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                            <p className="font-medium text-destructive">Не удалось загрузить рекомендации.</p>
                            <p className="mt-1 text-muted-foreground">
                                Главная страница продолжит работать: ниже остаётся лента популярных публикаций.
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-3 rounded-none"
                                onClick={() => void recommendationsQuery.refetch()}
                            >
                                <RefreshCw className="size-4" />
                                Повторить
                            </Button>
                        </div>
                    ) : recommendations.length > 0 ? (
                        <div className="grid gap-3 md:grid-cols-2">
                            {recommendations.map((item, index) => (
                                <article key={recommendationKey(item, index)} className="rounded-xl border bg-background p-4 transition hover:border-primary/50 hover:shadow-sm">
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <Badge variant="outline">{item.type}</Badge>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">score {item.score}</span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                                onClick={() => handleHide(item, index)}
                                            >
                                                <X className="mr-1 h-3 w-3" />
                                                Не интересно
                                            </Button>
                                        </div>
                                    </div>
                                    <Link href={item.href} onClick={() => handleClick(item, index)}>
                                        <h3 className="line-clamp-1 font-semibold">{item.title}</h3>
                                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                                        <p className="mt-3 text-xs text-primary">{item.reason}</p>
                                    </Link>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Пока нет рекомендаций — загляните позже.</p>
                    )}
                </CardContent>
            </Card>
        </section>
    )
}

function isValidRecommendation(item: CommunityRecommendation | null | undefined): item is CommunityRecommendation {
    return Boolean(
        item
        && typeof item.type === "string"
        && typeof item.title === "string"
        && typeof item.href === "string"
        && typeof item.reason === "string"
        && Number.isFinite(Number(item.score))
    )
}

function recommendationKey(item: CommunityRecommendation, index = 0) {
    const fallbackKey = item.href || item.title || String(index)
    const itemKey = item.item && typeof item.item === "object" && "id" in item.item ? item.item.id : fallbackKey

    return `${item.type}-${String(itemKey)}`
}

function recommendationTargetType(item: CommunityRecommendation): RecommendationEventPayload["target_type"] {
    if (item.type === "publication" || item.type === "question" || item.type === "tag") {
        return item.type === "question" ? "question" : item.type
    }

    return null
}

function recommendationTargetId(item: CommunityRecommendation) {
    const id = item.item && typeof item.item === "object" && "id" in item.item ? Number(item.item.id) : NaN

    return Number.isFinite(id) ? id : null
}

async function safeTrack(payload: RecommendationEventPayload) {
    try {
        await trackRecommendationEvent(payload)
    } catch {
        // Tracking is best-effort and must never break the recommendation UI.
    }
}
