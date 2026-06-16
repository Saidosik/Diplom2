import type { ComponentType } from "react"
import Link from "next/link"
import { CalendarDays, Eye, MessageSquare, ThumbsDown, ThumbsUp, TrendingUp, UserRound } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { IssueWorkflowBadge } from "@/features/issues/components/issue-workflow-badge"
import { TagBadge } from "@/features/tags/components/tag-badge"
import { UserAvatar } from "@/features/users/components/user-avatar"
import { formatIssueDate, getIssueStatusLabel } from "@/features/issues/lib/issue-labels"
import { getQuestionPopularityScore } from "@/features/issues/lib/issue-workflow"
import type { IssueQuestion } from "@/features/issues/types"
import { getUserProfileHrefOrFallback } from "@/features/users/lib/user-links"

type IssueQuestionCardProps = {
    question: IssueQuestion
    manage?: boolean
}

export function IssueQuestionCard({ question, manage = false }: IssueQuestionCardProps) {
    const href = manage ? `/questions/editor/${question.id}` : `/questions/${question.slug}`
    const answersCount = question.answers_count ?? question.answers?.length ?? 0
    const popularityScore = getQuestionPopularityScore(question)

    return (
        <Card className="group overflow-hidden shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
            <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <IssueWorkflowBadge question={question} />

                    {manage && (
                        <Badge variant={question.status === "published" ? "default" : "outline"}>
                            {getIssueStatusLabel(question.status, question.status_label)}
                        </Badge>
                    )}

                    {(question.tags || []).slice(0, 4).map((tag) => (
                        <TagBadge key={tag.id || tag.slug} tag={tag} compact />
                    ))}
                </div>

                <CardTitle className="line-clamp-2 text-2xl tracking-tight">
                    <Link href={href} className="hover:text-primary">
                        {question.title}
                    </Link>
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
                {question.excerpt && (
                    <p className="line-clamp-3 text-sm leading-7 text-muted-foreground">
                        {question.excerpt}
                    </p>
                )}

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <MiniMetric icon={MessageSquare} label="ответов" value={answersCount} />
                    <MiniMetric icon={ThumbsUp} label="лайков" value={question.likes_count || 0} />
                    <MiniMetric icon={Eye} label="просмотров" value={question.views_count || 0} />
                    <MiniMetric icon={TrendingUp} label="активность" value={popularityScore} />
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                        {question.author?.id ? (
                            <Link href={getUserProfileHrefOrFallback(question.author)} className="inline-flex items-center gap-1.5 hover:text-primary hover:underline">
                                <UserAvatar user={question.author} className="size-6" size="sm" />
                                {question.author.name || "Автор"}
                            </Link>
                        ) : (
                            <><UserRound className="size-3.5" /> {question.author?.name || "Автор"}</>
                        )}
                    </span>

                    {typeof question.author?.reputation_score === "number" && (
                        <span className="border bg-muted px-2 py-0.5">
                            репутация: {question.author.reputation_score}
                        </span>
                    )}

                    <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-3.5" />
                        {formatIssueDate(question.published_at || question.created_at)}
                    </span>

                    {(question.dislikes_count || 0) > 0 && (
                        <span className="inline-flex items-center gap-1.5">
                            <ThumbsDown className="size-3.5" />
                            {question.dislikes_count}
                        </span>
                    )}
                </div>
            </CardContent>

            <CardFooter className="justify-between gap-3">
                <Link href={href} className="text-sm font-medium text-primary hover:underline">
                    {manage ? "Открыть редактор" : "Перейти к обсуждению"}
                </Link>

                {question.accepted_answer_id && (
                    <Badge variant="secondary" className="">
                        выбран ответ #{question.accepted_answer_id}
                    </Badge>
                )}
            </CardFooter>
        </Card>
    )
}

type MiniMetricProps = {
    icon: ComponentType<{ className?: string }>
    label: string
    value: number
}

function MiniMetric({ icon: Icon, label, value }: MiniMetricProps) {
    return (
        <div className="border bg-muted/25 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
                <Icon className="size-4 text-primary" />
                {value}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
    )
}
