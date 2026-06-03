"use client"

import { Award, History, Loader2, Minus, Plus } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { getMyReputationEvents } from "@/features/community/api"
import type { ReputationEvent } from "@/features/community/types"
import { formatDateTime } from "@/lib/utils/date"

const reasonLabels: Record<string, string> = {
    publication_created: "Публикация материала",
    question_created: "Создание вопроса",
    answer_created: "Ответ на вопрос",
    answer_accepted: "Ответ выбран решением",
    like_received: "Полезная реакция",
    comment_created: "Участие в обсуждении",
}

const reasonDescriptions: Record<string, string> = {
    publication_created: "Система начислила баллы за новый материал в сообществе.",
    question_created: "Система начислила баллы за новый вопрос в Q&A-разделе.",
    answer_created: "Система начислила баллы за помощь другому участнику.",
    answer_accepted: "Автор вопроса отметил ответ как решение проблемы.",
    like_received: "Другой участник оценил материал или ответ как полезный.",
    comment_created: "Пользователь участвует в обсуждении материалов.",
}

export function ProfileReputationTimeline() {
    const eventsQuery = useQuery({
        queryKey: ["profile", "reputation-events"],
        queryFn: () => getMyReputationEvents({ per_page: 8 }),
        retry: false,
    })

    const events = eventsQuery.data?.data ?? []

    return (
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="size-5 text-primary" />
                    История репутации
                </CardTitle>
                <CardDescription>
                    Последние события, из которых складывается рейтинг пользователя.
                </CardDescription>
            </CardHeader>

            <CardContent>
                {eventsQuery.isLoading ? (
                    <div className="flex items-center gap-2 rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Загружаем события репутации...
                    </div>
                ) : events.length > 0 ? (
                    <div className="space-y-3">
                        {events.map((event) => (
                            <ReputationEventRow key={event.id} event={event} />
                        ))}
                    </div>
                ) : (
                    <Empty className="min-h-64 border">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Award className="size-5" />
                            </EmptyMedia>
                            <EmptyTitle>Событий пока нет</EmptyTitle>
                            <EmptyDescription>
                                История появится после публикаций, вопросов, ответов, комментариев и полученных реакций.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
            </CardContent>
        </Card>
    )
}

function ReputationEventRow({ event }: { event: ReputationEvent }) {
    const isPositive = event.points >= 0
    const label = reasonLabels[event.reason] ?? "Изменение репутации"
    const description = reasonDescriptions[event.reason] ?? "Система изменила рейтинг пользователя."

    return (
        <div className="flex gap-3 rounded-2xl border bg-card p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                {isPositive ? <Plus className="size-4 text-primary" /> : <Minus className="size-4" />}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{label}</p>
                    <Badge variant={isPositive ? "secondary" : "outline"}>{isPositive ? "+" : ""}{event.points}</Badge>
                </div>

                <p className="text-sm leading-6 text-muted-foreground">{description}</p>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDateTime(event.created_at)}</span>
                    {event.actor?.name ? <span>от {event.actor.name}</span> : null}
                </div>
            </div>
        </div>
    )
}
