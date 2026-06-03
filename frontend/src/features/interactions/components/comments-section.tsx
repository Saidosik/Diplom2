"use client"

import * as React from "react"
import { Loader2, MessageSquare, Pencil, Reply, Send, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { AuthRequiredMessage } from "@/features/auth/components/auth-required-message"
import { createComment, deleteComment, getComments, updateComment } from "@/features/interactions/api"
import { ReportDialog } from "@/features/interactions/components/report-dialog"
import { SubscribeButton } from "@/features/community/components/subscribe-button"
import { getEcho } from "@/lib/realtime/echo"
import type { CommentItem, CommentTargetType } from "@/features/interactions/types"

type CommentsSectionProps = {
    targetType: CommentTargetType
    targetId: number
    title?: string
    description?: string
    compact?: boolean
    isAuthenticated?: boolean
}

function formatCommentDate(value?: string | null) {
    if (!value) return "только что"

    try {
        return new Intl.DateTimeFormat("ru-RU", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(value))
    } catch {
        return value
    }
}

function countComments(items: CommentItem[]): number {
    return items.reduce((total, item) => total + 1 + countComments(item.replies || []), 0)
}

export function CommentsSection({
    targetType,
    targetId,
    title = "Комментарии",
    description = "Можно обсудить материал, задать вопрос или дополнить автора.",
    compact = false,
    isAuthenticated = false,
}: CommentsSectionProps) {
    const [comments, setComments] = React.useState<CommentItem[]>([])
    const [page, setPage] = React.useState(1)
    const [lastPage, setLastPage] = React.useState(1)
    const [content, setContent] = React.useState("")
    const [replyTo, setReplyTo] = React.useState<number | null>(null)
    const [replyContent, setReplyContent] = React.useState("")
    const [editingId, setEditingId] = React.useState<number | null>(null)
    const [editingContent, setEditingContent] = React.useState("")
    const [loading, setLoading] = React.useState(true)
    const [pending, setPending] = React.useState(false)

    const commentsCount = React.useMemo(() => countComments(comments), [comments])

    async function loadComments() {
        setLoading(true)

        try {
            const result = await getComments(targetType, targetId, { page, per_page: compact ? 6 : 10 })
            setComments(result.data || [])
            setLastPage(result.meta?.last_page || 1)
        } catch (error) {
            console.log("[LOAD_COMMENTS_ERROR]", error)
            toast.error("Не удалось загрузить комментарии")
        } finally {
            setLoading(false)
        }
    }


    React.useEffect(() => {
        setPage(1)
    }, [targetType, targetId])

    React.useEffect(() => {
        void loadComments()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetType, targetId, page, compact])
    React.useEffect(() => {
        const echo = getEcho()
        if (!echo) return

        let timer: number | undefined
        const channelName = `content.${targetType}.${targetId}`
        const channel = echo.channel(channelName)
        const refresh = () => {
            window.clearTimeout(timer)
            timer = window.setTimeout(() => void loadComments(), 300)
        }

        channel.listen(".comment.created", refresh)
        channel.listen(".comment.updated", refresh)
        channel.listen(".comment.deleted", refresh)

        return () => {
            window.clearTimeout(timer)
            echo.leave(channelName)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetType, targetId, page, compact])


    async function submitComment(parentId?: number | null) {
        if (!isAuthenticated) {
            toast.message("Нужно авторизоваться", {
                description: "Войдите в аккаунт, чтобы писать комментарии и отвечать другим участникам.",
            })
            return
        }

        const text = parentId ? replyContent.trim() : content.trim()

        if (text.length < 2) {
            toast.error("Комментарий слишком короткий")
            return
        }

        setPending(true)

        try {
            await createComment({
                commentable_type: targetType,
                commentable_id: targetId,
                parent_id: parentId ?? null,
                content: text,
            })
            toast.success(parentId ? "Ответ опубликован" : "Комментарий опубликован")
            setContent("")
            setReplyContent("")
            setReplyTo(null)
            await loadComments()
        } catch (error) {
            console.log("[CREATE_COMMENT_ERROR]", error)
            toast.error("Для комментария нужно войти в аккаунт")
        } finally {
            setPending(false)
        }
    }

    async function saveEdit(commentId: number) {
        const text = editingContent.trim()

        if (text.length < 2) {
            toast.error("Комментарий слишком короткий")
            return
        }

        setPending(true)

        try {
            await updateComment(commentId, text)
            toast.success("Комментарий обновлён")
            setEditingId(null)
            setEditingContent("")
            await loadComments()
        } catch (error) {
            console.log("[UPDATE_COMMENT_ERROR]", error)
            toast.error("Не удалось обновить комментарий")
        } finally {
            setPending(false)
        }
    }

    async function removeComment(commentId: number) {
        if (!confirm("Удалить комментарий?")) return

        setPending(true)

        try {
            await deleteComment(commentId)
            toast.success("Комментарий удалён")
            await loadComments()
        } catch (error) {
            console.log("[DELETE_COMMENT_ERROR]", error)
            toast.error("Не удалось удалить комментарий")
        } finally {
            setPending(false)
        }
    }

    const contentNode = (
        <div className="space-y-6">
            {isAuthenticated ? (
                <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
                    <Textarea
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        placeholder="Напишите комментарий..."
                        className="min-h-28 bg-background"
                    />
                    <Button type="button" onClick={() => submitComment()} disabled={pending}>
                        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                        Отправить
                    </Button>
                </div>
            ) : (
                <AuthRequiredMessage
                    title="Хотите написать комментарий?"
                    description="Комментарии видны всем, но отправлять сообщения, отвечать и жаловаться могут только авторизованные пользователи. Так обсуждения остаются аккуратными и безопасными."
                />
            )}

            {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Загрузка комментариев...
                </div>
            ) : comments.length > 0 ? (
                <div className="space-y-4">
                    {comments.map((comment) => (
                        <CommentBranch
                            key={comment.id}
                            comment={comment}
                            depth={0}
                            pending={pending}
                            isAuthenticated={isAuthenticated}
                            replyTo={replyTo}
                            replyContent={replyContent}
                            editingId={editingId}
                            editingContent={editingContent}
                            onReply={(commentId) => {
                                if (!isAuthenticated) {
                                    toast.message("Нужно авторизоваться", {
                                        description: "Войдите, чтобы ответить в комментариях.",
                                    })
                                    return
                                }
                                setReplyTo(commentId)
                                setReplyContent("")
                            }}
                            onCancelReply={() => {
                                setReplyTo(null)
                                setReplyContent("")
                            }}
                            onReplyChange={setReplyContent}
                            onSubmitReply={() => {
                                if (replyTo) void submitComment(replyTo)
                            }}
                            onStartEdit={(item) => {
                                setEditingId(item.id)
                                setEditingContent(item.content)
                            }}
                            onCancelEdit={() => {
                                setEditingId(null)
                                setEditingContent("")
                            }}
                            onEditChange={setEditingContent}
                            onSaveEdit={saveEdit}
                            onDelete={removeComment}
                        />
                    ))}

                    {lastPage > 1 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border bg-muted/20 px-4 py-3 text-sm">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={page <= 1 || loading}
                                onClick={() => setPage((current) => Math.max(1, current - 1))}
                            >
                                Назад
                            </Button>
                            <span className="text-muted-foreground">
                                Страница {page} из {lastPage}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={page >= lastPage || loading}
                                onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
                            >
                                Вперёд
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                    Комментариев пока нет. Можно начать обсуждение первым.
                </div>
            )}
        </div>
    )

    if (compact) {
        return (
            <section className="space-y-4 rounded-3xl border bg-card/70 p-5 shadow-sm">
                <div>
                    <h3 className="flex items-center gap-2 text-lg font-semibold">
                        <MessageSquare className="size-5" />
                        {title}: {commentsCount}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </div>
                {contentNode}
            </section>
        )
    }

    return (
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="size-5" />
                    {title}: {commentsCount}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>{contentNode}</CardContent>
        </Card>
    )
}

type CommentBranchProps = {
    comment: CommentItem
    depth: number
    pending: boolean
    isAuthenticated: boolean
    replyTo: number | null
    replyContent: string
    editingId: number | null
    editingContent: string
    onReply: (commentId: number) => void
    onCancelReply: () => void
    onReplyChange: (value: string) => void
    onSubmitReply: () => void
    onStartEdit: (comment: CommentItem) => void
    onCancelEdit: () => void
    onEditChange: (value: string) => void
    onSaveEdit: (commentId: number) => void
    onDelete: (commentId: number) => void
}

function CommentBranch({
    comment,
    depth,
    pending,
    isAuthenticated,
    replyTo,
    replyContent,
    editingId,
    editingContent,
    onReply,
    onCancelReply,
    onReplyChange,
    onSubmitReply,
    onStartEdit,
    onCancelEdit,
    onEditChange,
    onSaveEdit,
    onDelete,
}: CommentBranchProps) {
    const hasReplies = Boolean(comment.replies?.length)

    return (
        <div className={cn("space-y-3", depth > 0 && "border-l pl-3 md:pl-5")}>
            <CommentBody
                comment={comment}
                depth={depth}
                pending={pending}
                isAuthenticated={isAuthenticated}
                editingId={editingId}
                editingContent={editingContent}
                onStartEdit={onStartEdit}
                onCancelEdit={onCancelEdit}
                onEditChange={onEditChange}
                onSaveEdit={onSaveEdit}
                onDelete={onDelete}
                onReply={() => onReply(comment.id)}
            />

            {replyTo === comment.id && (
                <div className="space-y-3 rounded-xl border bg-muted/20 p-3 md:ml-10">
                    <Textarea
                        value={replyContent}
                        onChange={(event) => onReplyChange(event.target.value)}
                        placeholder="Ответить в эту ветку..."
                        className="min-h-20 bg-background"
                    />
                    <div className="flex gap-2">
                        <Button type="button" size="sm" onClick={onSubmitReply} disabled={pending}>
                            Ответить
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={onCancelReply} disabled={pending}>
                            Отмена
                        </Button>
                    </div>
                </div>
            )}

            {hasReplies && (
                <div className="space-y-3">
                    {(comment.replies || []).map((reply) => (
                        <CommentBranch
                            key={reply.id}
                            comment={reply}
                            depth={depth + 1}
                            pending={pending}
                            isAuthenticated={isAuthenticated}
                            replyTo={replyTo}
                            replyContent={replyContent}
                            editingId={editingId}
                            editingContent={editingContent}
                            onReply={onReply}
                            onCancelReply={onCancelReply}
                            onReplyChange={onReplyChange}
                            onSubmitReply={onSubmitReply}
                            onStartEdit={onStartEdit}
                            onCancelEdit={onCancelEdit}
                            onEditChange={onEditChange}
                            onSaveEdit={onSaveEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

type CommentBodyProps = {
    comment: CommentItem
    depth: number
    pending: boolean
    isAuthenticated: boolean
    editingId: number | null
    editingContent: string
    onStartEdit: (comment: CommentItem) => void
    onCancelEdit: () => void
    onEditChange: (value: string) => void
    onSaveEdit: (commentId: number) => void
    onDelete: (commentId: number) => void
    onReply: () => void
}

function CommentBody({
    comment,
    depth,
    pending,
    isAuthenticated,
    editingId,
    editingContent,
    onStartEdit,
    onCancelEdit,
    onEditChange,
    onSaveEdit,
    onDelete,
    onReply,
}: CommentBodyProps) {
    const isEditing = editingId === comment.id

    return (
        <div id={`comment-${comment.id}`} className={cn("space-y-2 rounded-2xl border bg-background p-4", depth > 0 && "bg-muted/20")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="text-sm font-medium">{comment.user?.name || "Пользователь"}</div>
                    <div className="text-xs text-muted-foreground">{formatCommentDate(comment.created_at)}</div>
                </div>

                <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="icon-sm" onClick={onReply} title="Ответить">
                        <Reply className="size-4" />
                    </Button>
                    {comment.can_manage && (
                        <>
                            <Button type="button" variant="ghost" size="icon-sm" onClick={() => onStartEdit(comment)} title="Редактировать">
                                <Pencil className="size-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon-sm" onClick={() => onDelete(comment.id)} title="Удалить">
                                <Trash2 className="size-4" />
                            </Button>
                        </>
                    )}
                    <SubscribeButton
                        type="comment"
                        id={comment.id}
                        label="Следить"
                        activeLabel="В подписках"
                        disabled={!isAuthenticated || comment.is_owner}
                    />
                    <ReportDialog targetType="comment" targetId={comment.id} variant="icon" isAuthenticated={isAuthenticated} />
                </div>
            </div>

            {isEditing ? (
                <div className="space-y-2">
                    <Textarea value={editingContent} onChange={(event) => onEditChange(event.target.value)} className="min-h-24" />
                    <div className="flex gap-2">
                        <Button type="button" size="sm" onClick={() => onSaveEdit(comment.id)} disabled={pending}>
                            Сохранить
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={onCancelEdit} disabled={pending}>
                            Отмена
                        </Button>
                    </div>
                </div>
            ) : (
                <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">{comment.content}</p>
            )}
        </div>
    )
}
