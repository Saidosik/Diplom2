"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getRecommendations } from "@/features/community/api"

export function RecommendationsBlock() {
    const recommendationsQuery = useQuery({
        queryKey: ["recommendations", "home", "week"],
        queryFn: () => getRecommendations("week"),
    })

    const recommendations = recommendationsQuery.data?.data.slice(0, 4) ?? []
    const mode = recommendationsQuery.data?.mode ?? "guest"

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
                            {recommendations.map((item) => (
                                <Link
                                    key={`${item.type}-${item.href}`}
                                    href={item.href}
                                    className="rounded-xl border bg-background p-4 transition hover:border-primary/50 hover:shadow-sm"
                                >
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <Badge variant="outline">{item.type}</Badge>
                                        <span className="text-xs text-muted-foreground">score {item.score}</span>
                                    </div>
                                    <h3 className="line-clamp-1 font-semibold">{item.title}</h3>
                                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                                    <p className="mt-3 text-xs text-primary">{item.reason}</p>
                                </Link>
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
