"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bot, CalendarDays, CheckCircle2, Edit3, Eye, MessageSquare, Trash2, UserRound } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { IssueAnswerEditor } from "@/features/issues/components/issue-answer-editor"
import { ContentAttachmentList } from "@/features/files/components/content-attachment-list"
import { IssueWorkflowBadge } from "@/features/issues/components/issue-workflow-badge"
import { IssueWorkflowPanel } from "@/features/issues/components/issue-workflow-panel"
import { IssueBlockRenderer } from "@/features/issues/components/issue-block-renderer"
import { IssueBreadcrumbs } from "@/features/issues/components/issue-breadcrumbs"
import { CommentsSection } from "@/features/interactions/components/comments-section"
import { ReactionButtons } from "@/features/interactions/components/reaction-buttons"
import { ReportDialog } from "@/features/interactions/components/report-dialog"
import { SaveButton } from "@/features/interactions/components/save-button"
import { SubscribeButton } from "@/features/community/components/subscribe-button"
import { TagBadge } from "@/features/tags/components/tag-badge"
import { acceptIssueAnswer, deleteIssueAnswer } from "@/features/issues/api"
import { formatIssueDate } from "@/features/issues/lib/issue-labels"
import type { IssueAnswer, IssueQuestion } from "@/features/issues/types"
import { getEcho } from "@/lib/realtime/echo"
import { getUserProfileHrefOrFallback } from "@/features/users/lib/user-links"

type IssueQuestionDetailPageProps = {
    question: IssueQuestion
    isAuthenticated?: boolean
}

export function IssueQuestionDetailPage({ question, isAuthenticated = false }: IssueQuestionDetailPageProps) {
    const router = useRouter()

    useEffect(() => {
        const echo = getEcho()
        if (!echo) return

        let timer: number | undefined
        const channelName = `content.issue_question.${question.id}`
        const channel = echo.channel(channelName)
        const refresh = () => {
            window.clearTimeout(timer)
            timer = window.setTimeout(() => router.refresh(), 350)
        }

        channel.listen(".answer.created", refresh)
        channel.listen(".answer.updated", refresh)
        channel.listen(".answer.deleted", refresh)
        channel.listen(".answer.accepted", refresh)

        return () => {
            window.clearTimeout(timer)
            echo.leave(channelName)
        }
    }, [question.id, router])

    async function acceptAnswer(answerId: number) {
        try {
            await acceptIssueAnswer(question.id, answerId)
            toast.success("Ответ отмечен как решение")
            router.refresh()
        } catch (error) {
            console.log("[ACCEPT_ANSWER_ERROR]", error)
            toast.error("Не удалось отметить ответ")
        }
    }

    async function removeAnswer(answerId: number) {
        if (!confirm("Удалить этот ответ?")) return

        try {
            await deleteIssueAnswer(answerId)
            toast.success("Ответ удалён")
            router.refresh()
        } catch (error) {
            console.log("[DELETE_ANSWER_ERROR]", error)
            toast.error("Не удалось удалить ответ")
        }
    }

    return (
        <article className="mx-auto w-full max-w-5xl space-y-6">
            <IssueBreadcrumbs
                items={[
                    { label: "Вопросы", href: "/questions" },
                    { label: question.title },
                ]}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
                <Button variant="outline" asChild>
                    <Link href="/questions">← К вопросам</Link>
                </Button>

                {question.is_owner && (
                    <Button asChild>
                        <Link href={`/questions/editor/${question.id}`}>
                            <Edit3 className="size-4" />
                            Редактировать
                        </Link>
                    </Button>
                )}
            </div>

            <Card className="overflow-hidden shadow-sm">
                <CardContent className="space-y-6 p-6 md:p-10">
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <IssueWorkflowBadge question={question} />

                            {(question.tags || []).map((tag) => (
                                <TagBadge key={tag.id || tag.slug} tag={tag} />
                            ))}
                        </div>

                        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
                            {question.title}
                        </h1>

                        {question.excerpt && (
                            <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
                                {question.excerpt}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-3 border-y py-4 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                            <UserRound className="size-4" />
                            {question.author?.id ? (
                                <Link href={getUserProfileHrefOrFallback(question.author)} className="hover:text-primary hover:underline">
                                    {question.author.name || "Автор"}
                                </Link>
                            ) : (
                                question.author?.name || "Автор"
                            )}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="size-4" />
                            {formatIssueDate(question.published_at || question.created_at)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <MessageSquare className="size-4" />
                            {question.answers_count ?? question.answers?.length ?? 0} ответов
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Eye className="size-4" />
                            {question.views_count || 0} просмотров
                        </span>
                    </div>

                    <IssueWorkflowPanel question={question} />

                    <div className="flex flex-wrap items-center justify-between gap-3 border bg-muted/20 p-4">
                        <ReactionButtons
                            targetType="issue_question"
                            targetId={question.id}
                            initialLikes={question.likes_count}
                            initialDislikes={question.dislikes_count}
                            initialReaction={question.my_reaction}
                            isAuthenticated={isAuthenticated}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                            <SubscribeButton
                                type="issue_question"
                                id={question.id}
                                label="Следить за вопросом"
                                activeLabel="Вопрос в подписках"
                                disabled={!isAuthenticated || question.is_owner}
                            />
                            <SaveButton targetType="issue_question" targetId={question.id} initialSaved={question.is_saved} />
                            <ReportDialog targetType="issue_question" targetId={question.id} isAuthenticated={isAuthenticated} />
                        </div>
                    </div>

                    <div className="space-y-7">
                        {(question.blocks || []).map((block) => (
                            <IssueBlockRenderer key={block.id || `${block.type}-${block.sort_order}`} block={block} />
                        ))}
                    </div>

                    <ContentAttachmentList attachments={question.attachments} />
                </CardContent>
            </Card>


            <CommentsSection
                targetType="issue_question"
                targetId={question.id}
                title="Комментарии к вопросу"
                description="Уточнения по окружению, логам и деталям задачи до публикации ответа."
                isAuthenticated={isAuthenticated}
            />

            <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-2xl font-semibold tracking-tight">
                        Ответы: {question.answers?.length || 0}
                    </h2>
                </div>

                {(question.answers || []).length > 0 ? (
                    <div className="space-y-4">
                        {(question.answers || []).map((answer) => (
                            <AnswerCard
                                key={answer.id}
                                answer={answer}
                                canAccept={Boolean(question.can_accept_answer && !answer.is_accepted)}
                                onAccept={() => acceptAnswer(answer.id)}
                                onDelete={() => removeAnswer(answer.id)}
                                isAuthenticated={isAuthenticated}
                            />
                        ))}
                    </div>
                ) : (
                    <Card className="border-dashed">
                        <CardContent className="p-6 text-sm text-muted-foreground">
                            Ответов пока нет. Можно быть первым, кто поможет автору вопроса.
                        </CardContent>
                    </Card>
                )}
            </section>

            {question.status === "published" && !question.is_solved && <IssueAnswerEditor questionId={question.id} />}
        </article>
    )
}

type AnswerCardProps = {
    answer: IssueAnswer
    canAccept: boolean
    onAccept: () => void
    onDelete: () => void
    isAuthenticated: boolean
}

function AnswerCard({ answer, canAccept, onAccept, onDelete, isAuthenticated }: AnswerCardProps) {
    return (
        <Card id={`answer-${answer.id}`} className={answer.is_accepted ? "border-primary bg-primary/5 shadow-sm" : "shadow-sm"}>
            <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                            <UserRound className="size-4" />
                            {answer.author?.name || "Автор ответа"}
                        </span>
                        <span>•</span>
                        <span>{formatIssueDate(answer.created_at)}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {answer.is_ai_generated && (
                            <Badge variant="secondary">
                                <Bot className="size-3.5" />
                                Ответ от ИИ
                            </Badge>
                        )}
                        {answer.is_accepted && (
                            <Badge>
                                <CheckCircle2 className="size-3.5" />
                                Решение
                            </Badge>
                        )}
                        {canAccept && (
                            <Button size="sm" onClick={onAccept}>
                                <CheckCircle2 className="size-4" />
                                Это решение
                            </Button>
                        )}
                        <SubscribeButton
                            type="issue_answer"
                            id={answer.id}
                            label="Следить за комментариями"
                            activeLabel="Комментарии в подписках"
                            disabled={!isAuthenticated || answer.can_manage}
                        />
                        <SaveButton targetType="issue_answer" targetId={answer.id} initialSaved={answer.is_saved} variant="icon" />
                        <ReportDialog targetType="issue_answer" targetId={answer.id} variant="icon" isAuthenticated={isAuthenticated} />
                        {answer.can_manage && (
                            <Button size="sm" variant="ghost" onClick={onDelete}>
                                <Trash2 className="size-4" />
                            </Button>
                        )}
                    </div>
                </div>
                <CardTitle className="sr-only">Ответ</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
                {answer.is_ai_generated && (
                    <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2 font-medium text-foreground">
                            <Bot className="size-4" />
                            Предварительный ответ, сформированный встроенным AI-инструментом платформы
                        </div>
                        <p className="mt-2">
                            Этот ответ сгенерирован AI и может содержать ошибки. Проверьте команды, версии библиотек и настройки окружения перед применением.
                        </p>
                        {(answer.ai_sources || []).length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {(answer.ai_sources || []).map((source) => (
                                    <Button key={source.href} size="sm" variant="outline" asChild>
                                        <Link href={source.href}>{source.title}</Link>
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {(answer.blocks || []).map((block) => (
                    <IssueBlockRenderer key={block.id || `${block.type}-${block.sort_order}`} block={block} compact />
                ))}

                <CommentsSection
                    targetType="issue_answer"
                    targetId={answer.id}
                    title="Комментарии к ответу"
                    description="Можно уточнить ответ или задать вопрос автору."
                    isAuthenticated={isAuthenticated}
                />
            </CardContent>
        </Card>
    )
}
