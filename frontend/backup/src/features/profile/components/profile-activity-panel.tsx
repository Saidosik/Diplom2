"use client"

import * as React from "react"
import Link from "next/link"
import { BookOpen, CircleHelp, MessageSquare, Newspaper } from "lucide-react"

import {
    getProfileComments,
    getProfileIssueAnswers,
    getProfileIssueQuestions,
    getProfilePublications,
} from "@/features/profile/api"
import type { Publication } from "@/features/publications/types"
import type { IssueAnswer, IssueQuestion } from "@/features/issues/types"
import type { CommentItem } from "@/features/interactions/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

function blockText(blocks?: Array<{ content?: Record<string, unknown> }>) {
    const first = blocks?.find((block) => typeof block.content?.text === "string" || typeof block.content?.code === "string")
    const text = first?.content?.text ?? first?.content?.code
    return typeof text === "string" ? text : "Ответ без текстового блока"
}

export function ProfileActivityPanel() {
    const [publications, setPublications] = React.useState<Publication[]>([])
    const [questions, setQuestions] = React.useState<IssueQuestion[]>([])
    const [answers, setAnswers] = React.useState<IssueAnswer[]>([])
    const [comments, setComments] = React.useState<CommentItem[]>([])
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        let cancelled = false

        async function load() {
            setLoading(true)

            try {
                const [publicationsResult, questionsResult, answersResult, commentsResult] = await Promise.all([
                    getProfilePublications({ per_page: 5 }),
                    getProfileIssueQuestions({ per_page: 5 }),
                    getProfileIssueAnswers({ per_page: 5 }),
                    getProfileComments({ per_page: 5 }),
                ])

                if (!cancelled) {
                    setPublications(publicationsResult.data || [])
                    setQuestions(questionsResult.data || [])
                    setAnswers(answersResult.data || [])
                    setComments(commentsResult.data || [])
                }
            } catch (error) {
                console.log("[PROFILE_ACTIVITY_LOAD_ERROR]", error)
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        load()

        return () => {
            cancelled = true
        }
    }, [])

    return (
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle>Активность</CardTitle>
                <CardDescription>
                    Публикации, вопросы, ответы и комментарии пользователя.
                </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 lg:grid-cols-2">
                <ActivityList
                    icon={Newspaper}
                    title="Публикации"
                    empty="Публикаций пока нет"
                    loading={loading}
                    actionHref="/publications/create"
                    actionLabel="Написать публикацию"
                >
                    {publications.map((publication) => (
                        <Link
                            key={publication.id}
                            href={`/publications/${publication.slug}`}
                            className="block rounded-xl border bg-background/60 p-3 transition-colors hover:bg-muted/40"
                        >
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary">{publication.status_label || publication.status}</Badge>
                                <span className="text-xs text-muted-foreground">
                                    {publication.comments_count || 0} комментариев
                                </span>
                            </div>
                            <p className="mt-2 line-clamp-1 font-medium">{publication.title}</p>
                            {publication.excerpt && (
                                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{publication.excerpt}</p>
                            )}
                        </Link>
                    ))}
                </ActivityList>

                <ActivityList
                    icon={CircleHelp}
                    title="Вопросы"
                    empty="Вопросов пока нет"
                    loading={loading}
                    actionHref="/questions/create"
                    actionLabel="Задать вопрос"
                >
                    {questions.map((question) => (
                        <Link
                            key={question.id}
                            href={`/questions/${question.slug}`}
                            className="block rounded-xl border bg-background/60 p-3 transition-colors hover:bg-muted/40"
                        >
                            <div className="flex items-center gap-2">
                                <Badge variant={question.is_solved ? "default" : "secondary"}>
                                    {question.is_solved ? "Решён" : "Открыт"}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                    {question.answers_count || 0} ответов
                                </span>
                            </div>
                            <p className="mt-2 line-clamp-1 font-medium">{question.title}</p>
                            {question.excerpt && (
                                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{question.excerpt}</p>
                            )}
                        </Link>
                    ))}
                </ActivityList>

                <ActivityList
                    icon={MessageSquare}
                    title="Ответы"
                    empty="Ответов пока нет"
                    loading={loading}
                >
                    {answers.map((answer) => (
                        <Link
                            key={answer.id}
                            href={answer.question?.slug ? `/questions/${answer.question.slug}` : "/questions"}
                            className="block rounded-xl border bg-background/60 p-3 transition-colors hover:bg-muted/40"
                        >
                            <div className="flex items-center gap-2">
                                {answer.is_accepted && <Badge>Решение</Badge>}
                                <span className="text-xs text-muted-foreground">
                                    {answer.comments_count || 0} комментариев
                                </span>
                            </div>
                            <p className="mt-2 line-clamp-1 font-medium">
                                {answer.question?.title || "Ответ на вопрос"}
                            </p>
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                {blockText(answer.blocks)}
                            </p>
                        </Link>
                    ))}
                </ActivityList>

                <ActivityList
                    icon={BookOpen}
                    title="Комментарии"
                    empty="Комментариев пока нет"
                    loading={loading}
                >
                    {comments.map((comment) => (
                        <div key={comment.id} className="rounded-xl border bg-background/60 p-3">
                            <p className="line-clamp-3 text-sm text-muted-foreground">{comment.content}</p>
                            <div className="mt-2 text-xs text-muted-foreground">
                                {comment.created_at ? new Date(comment.created_at).toLocaleDateString("ru-RU") : "Недавно"}
                            </div>
                        </div>
                    ))}
                </ActivityList>
            </CardContent>
        </Card>
    )
}

function ActivityList({
    icon: Icon,
    title,
    empty,
    loading,
    actionHref,
    actionLabel,
    children,
}: {
    icon: React.ElementType
    title: string
    empty: string
    loading: boolean
    actionHref?: string
    actionLabel?: string
    children: React.ReactNode
}) {
    const hasChildren = React.Children.count(children) > 0

    return (
        <section className="rounded-2xl border bg-muted/20 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-medium">
                    <Icon className="size-4 text-primary" />
                    {title}
                </h3>

                {actionHref && actionLabel && (
                    <Button size="sm" variant="outline" asChild>
                        <Link href={actionHref}>{actionLabel}</Link>
                    </Button>
                )}
            </div>

            <div className="space-y-3">
                {loading ? (
                    <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                        Загружаем данные...
                    </div>
                ) : hasChildren ? (
                    children
                ) : (
                    <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                        {empty}
                    </div>
                )}
            </div>
        </section>
    )
}
