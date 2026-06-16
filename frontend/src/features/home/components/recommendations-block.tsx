"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Sparkles, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getRecommendations, trackRecommendationEvent } from "@/features/community/api"
import { useSessionRefreshKey } from "@/lib/auth/use-session-refresh-key"
import type { CommunityRecommendation, RecommendationEventPayload } from "@/features/community/types"

export function RecommendationsBlock() {
    const viewedKeysRef = useRef(new Set<string>())
    const [hiddenKeys, setHiddenKeys] = useState<string[]>([])
    const sessionRefreshKey = useSessionRefreshKey()
    const recommendationsQuery = useQuery({
        queryKey: ["recommendations", "home", "week", sessionRefreshKey],
        queryFn: () => getRecommendations("week"),
    })

    useEffect(() => {
        viewedKeysRef.current.clear()
        setHiddenKeys([])
    }, [sessionRefreshKey])

    const mode = recommendationsQuery.data?.mode ?? "guest"
    const strategy = recommendationsQuery.data?.meta?.strategy ?? "guest_trending"
    const isSemantic = strategy.includes("semantic")
    const recommendations = useMemo(
        () => (recommendationsQuery.data?.data ?? []).filter((item) => !hiddenKeys.includes(recommendationKey(item))).slice(0, 4),
        [hiddenKeys, recommendationsQuery.data?.data]
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
                    recommendation_type: item.type,
                    title: item.title,
                    href: item.href,
                },
            })
        })
    }, [mode, recommendations, strategy])

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
                recommendation_type: item.type,
                title: item.title,
                href: item.href,
            },
        })
    }

    return (
        <section className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
            <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Sparkles className="h-5 w-5 text-primary" />
                            Рекомендации Вектора
                        </CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {mode === "personalized"
                                ? "Подборка учитывает ваши теги, реакции, сохранения и подписки."
                                : "Гостевая подборка показывает тренды, свежие материалы и вопросы без ответа."}
                        </p>
                        {isSemantic ? (
                            <p className="mt-1 text-xs font-medium text-primary">Подобрано по вашим интересам</p>
                        ) : null}
                    </div>
                    <Badge variant="secondary">{mode === "personalized" ? "Для вас" : "Гость"}</Badge>
                </CardHeader>
                <CardContent>
                    {recommendationsQuery.isLoading ? (
                        <div className="grid gap-3 md:grid-cols-2">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <Skeleton key={index} className="h-28 rounded-xl" />
                            ))}
                        </div>
                    ) : recommendations.length > 0 ? (
                        <div className="grid gap-3 md:grid-cols-2">
                            {recommendations.map((item, index) => (
                                <article key={recommendationKey(item)} className="rounded-xl border bg-background p-4 transition hover:border-primary/50 hover:shadow-sm">
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

function recommendationKey(item: CommunityRecommendation) {
    return `${item.type}-${item.item && "id" in item.item ? item.item.id : item.href}`
}

function recommendationTargetType(item: CommunityRecommendation): RecommendationEventPayload["target_type"] {
    return item.type === "question" ? "question" : item.type
}

function recommendationTargetId(item: CommunityRecommendation) {
    return item.item && "id" in item.item ? item.item.id : null
}

async function safeTrack(payload: RecommendationEventPayload) {
    try {
        await trackRecommendationEvent(payload)
    } catch {
        // Tracking is best-effort and must never break the recommendation UI.
    }
}
