import { ArrowRight, Lightbulb } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
    getQuestionPopularityScore,
    getQuestionQualityHints,
    getQuestionWorkflowMeta,
    getQuestionWorkflowSteps,
} from "@/features/issues/lib/issue-workflow"
import type { IssueQuestion } from "@/features/issues/types"

type IssueWorkflowPanelProps = {
    question: IssueQuestion
}

export function IssueWorkflowPanel({ question }: IssueWorkflowPanelProps) {
    const meta = getQuestionWorkflowMeta(question)
    const Icon = meta.icon
    const steps = getQuestionWorkflowSteps(question)
    const hints = getQuestionQualityHints(question)
    const answersCount = question.answers_count ?? question.answers?.length ?? 0

    return (
        <Card className="border-primary/15 bg-primary/5">
            <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Icon className="size-5 text-primary" />
                            Статус вопроса: {meta.label}
                        </CardTitle>
                        <CardDescription className="max-w-3xl leading-6">
                            {meta.description} Этот блок показывает динамику Q&amp;A: состояние меняется после ответов и выбора решения.
                        </CardDescription>
                    </div>

                    <Badge variant="outline" className="rounded-full bg-background">
                        оценка активности: {getQuestionPopularityScore(question)}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-5">
                <div className="grid gap-3 md:grid-cols-3">
                    {steps.map((step, index) => {
                        const StepIcon = step.icon

                        return (
                            <div
                                key={step.status}
                                className={[
                                    "relative rounded-2xl border bg-background p-4",
                                    step.isCurrent ? "border-primary/50 shadow-sm" : "",
                                    step.isDone ? "opacity-100" : "opacity-60",
                                ].join(" ")}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={[
                                        "flex size-8 items-center justify-center rounded-full border",
                                        step.isDone ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                                    ].join(" ")}
                                    >
                                        <StepIcon className="size-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{step.label}</p>
                                        <p className="text-xs text-muted-foreground">Шаг {index + 1}</p>
                                    </div>
                                </div>

                                {index < steps.length - 1 && (
                                    <ArrowRight className="absolute -right-3 top-1/2 hidden size-5 -translate-y-1/2 text-muted-foreground md:block" />
                                )}
                            </div>
                        )
                    })}
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                    <Metric label="Ответов" value={answersCount} />
                    <Metric label="Лайков" value={question.likes_count || 0} />
                    <Metric label="Просмотров" value={question.views_count || 0} />
                    <Metric label="Тегов" value={question.tags?.length || 0} />
                </div>

                {hints.length > 0 && (
                    <>
                        <Separator />
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <Lightbulb className="size-4 text-primary" />
                                Подсказки качества вопроса
                            </div>
                            <div className="grid gap-3 md:grid-cols-3">
                                {hints.map((hint) => {
                                    const HintIcon = hint.icon
                                    return (
                                        <div key={hint.title} className="rounded-2xl border bg-background p-3">
                                            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                                                <HintIcon className="size-4 text-primary" />
                                                {hint.title}
                                            </div>
                                            <p className="text-xs leading-5 text-muted-foreground">{hint.description}</p>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
}

function Metric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-2xl border bg-background p-4">
            <p className="text-2xl font-semibold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    )
}
