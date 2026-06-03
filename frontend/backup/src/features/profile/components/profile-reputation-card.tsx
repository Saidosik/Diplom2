import { Award, CheckCircle2, MessageSquare, Newspaper, Sparkles, Trophy } from "lucide-react"

import type { User } from "@/features/auth/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const reputationRules = [
    {
        icon: Newspaper,
        title: "+10 за публикацию",
        description: "Пользователь делится полезным материалом.",
    },
    {
        icon: MessageSquare,
        title: "+5 за ответ",
        description: "Пользователь помогает в Q&A-разделе.",
    },
    {
        icon: CheckCircle2,
        title: "+15 за решение",
        description: "Автор вопроса выбрал ответ лучшим.",
    },
    {
        icon: Sparkles,
        title: "+2 за лайк",
        description: "Сообщество оценило материал как полезный.",
    },
]

type ProfileReputationCardProps = {
    user: User
}

export function ProfileReputationCard({ user }: ProfileReputationCardProps) {
    const score = user.reputation_score ?? 0
    const level = user.reputation_level
    const label = level?.label ?? "Новичок"
    const nextLabel = level?.next_label ?? null
    const progress = level?.progress ?? Math.min(99, Math.round((score / 50) * 100))

    return (
        <Card className="overflow-hidden border-primary/20 bg-primary/5 shadow-sm">
            <CardHeader className="relative">
                <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/15 blur-3xl" />
                <div className="relative flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="size-5 text-primary" />
                            Репутация участника
                        </CardTitle>
                        <CardDescription>
                            Баллы начисляются за полезную активность внутри сообщества.
                        </CardDescription>
                    </div>

                    <Badge variant="secondary" className="shrink-0">
                        {label}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                    <div className="rounded-2xl border bg-background/70 p-5">
                        <div className="flex items-center gap-3">
                            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Award className="size-5" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Текущий рейтинг</p>
                                <p className="text-3xl font-semibold tracking-tight">{score}</p>
                            </div>
                        </div>

                        <div className="mt-5 space-y-2">
                            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                <span>{label}</span>
                                <span>{nextLabel ? `до «${nextLabel}»` : "максимальный уровень"}</span>
                            </div>
                            <Progress value={progress} />
                            <p className="text-xs text-muted-foreground">
                                {nextLabel
                                    ? `Прогресс до следующего уровня: ${progress}%.`
                                    : "Участник достиг верхнего уровня активности."}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        {reputationRules.map((rule) => {
                            const Icon = rule.icon

                            return (
                                <div key={rule.title} className="rounded-2xl border bg-background/70 p-4">
                                    <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <Icon className="size-4" />
                                    </div>
                                    <p className="text-sm font-medium">{rule.title}</p>
                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{rule.description}</p>
                                </div>
                            )
                        })}
                    </div>
                </div>

            </CardContent>
        </Card>
    )
}
