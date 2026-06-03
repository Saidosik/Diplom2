"use client"

import * as React from "react"
import Link from "next/link"
import { Bookmark, MessageSquare, Newspaper, X } from "lucide-react"
import { toast } from "sonner"

import { getProfileSaved } from "@/features/profile/api"
import { removeSavedItem } from "@/features/interactions/api"
import type { SavedItem } from "@/features/interactions/types"
import type { Publication } from "@/features/publications/types"
import type { IssueAnswer } from "@/features/issues/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

function isPublication(value: unknown): value is Publication {
    return typeof value === "object" && value !== null && "slug" in value && "title" in value
}

function isIssueAnswer(value: unknown): value is IssueAnswer {
    return typeof value === "object" && value !== null && "issue_question_id" in value
}

function answerPreview(answer: IssueAnswer) {
    const first = answer.blocks?.find((block) => typeof block.content?.text === "string" || typeof block.content?.code === "string")
    const text = first?.content?.text ?? first?.content?.code
    return typeof text === "string" ? text : "Сохранённый ответ без текстового блока"
}

export function ProfileSavedPanel() {
    const [items, setItems] = React.useState<SavedItem[]>([])
    const [page, setPage] = React.useState(1)
    const [lastPage, setLastPage] = React.useState(1)
    const [loading, setLoading] = React.useState(true)
    const [pendingId, setPendingId] = React.useState<number | null>(null)

    async function load() {
        setLoading(true)

        try {
            const response = await getProfileSaved({ page, per_page: 8 })
            setItems(response.data || [])
            setLastPage(response.meta?.last_page || 1)
        } catch (error) {
            console.log("[PROFILE_SAVED_LOAD_ERROR]", error)
            toast.error("Не удалось загрузить сохранённое")
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page])

    async function remove(item: SavedItem) {
        setPendingId(item.id)

        try {
            await removeSavedItem({
                saveable_type: item.saveable_type,
                saveable_id: item.saveable_id,
            })
            setItems((current) => current.filter((saved) => saved.id !== item.id))
            toast.success("Удалено из сохранённого")
        } catch (error) {
            console.log("[PROFILE_SAVED_REMOVE_ERROR]", error)
            toast.error("Не удалось удалить материал")
        } finally {
            setPendingId(null)
        }
    }

    const publications = items.filter((item) => item.saveable_type === "publication")
    const answers = items.filter((item) => item.saveable_type === "issue_answer")

    return (
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bookmark className="size-4" />
                    Сохранённое
                </CardTitle>
                <CardDescription>
                    Публикации и полезные ответы, которые пользователь отложил для повторного просмотра.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                {loading ? (
                    <div className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
                        Загружаем сохранённые материалы...
                    </div>
                ) : items.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                        Пока ничего не сохранено. Открой публикацию или ответ и нажми «Сохранить».
                    </div>
                ) : (
                    <>
                        <SavedGroup
                            icon={Newspaper}
                            title="Публикации"
                            empty="Сохранённых публикаций пока нет"
                        >
                            {publications.map((item) => {
                                const publication = item.item

                                if (!isPublication(publication)) return null

                                return (
                                    <SavedCard
                                        key={item.id}
                                        title={publication.title}
                                        description={publication.excerpt || "Сохранённая публикация"}
                                        href={`/publications/${publication.slug}`}
                                        badge={`${publication.reading_time_minutes || 1} мин. чтения`}
                                        onRemove={() => remove(item)}
                                        disabled={pendingId === item.id}
                                    />
                                )
                            })}
                        </SavedGroup>

                        <SavedGroup
                            icon={MessageSquare}
                            title="Ответы"
                            empty="Сохранённых ответов пока нет"
                        >
                            {answers.map((item) => {
                                const answer = item.item

                                if (!isIssueAnswer(answer)) return null

                                return (
                                    <SavedCard
                                        key={item.id}
                                        title={answer.question?.title || "Сохранённый ответ"}
                                        description={answerPreview(answer)}
                                        href={answer.question?.slug ? `/questions/${answer.question.slug}` : "/questions"}
                                        badge={answer.is_accepted ? "Решение" : "Ответ"}
                                        onRemove={() => remove(item)}
                                        disabled={pendingId === item.id}
                                    />
                                )
                            })}
                        </SavedGroup>

                        {lastPage > 1 && (
                            <div className="flex flex-wrap items-center justify-between gap-3 border bg-muted/20 px-4 py-3 text-sm">
                                <Button type="button" variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                                    Назад
                                </Button>
                                <span className="text-muted-foreground">Страница {page} из {lastPage}</span>
                                <Button type="button" variant="outline" size="sm" disabled={page >= lastPage || loading} onClick={() => setPage((current) => Math.min(lastPage, current + 1))}>
                                    Вперёд
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    )
}

function SavedGroup({
    icon: Icon,
    title,
    empty,
    children,
}: {
    icon: React.ElementType
    title: string
    empty: string
    children: React.ReactNode
}) {
    const hasChildren = React.Children.toArray(children).filter(Boolean).length > 0

    return (
        <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-medium">
                <Icon className="size-4 text-primary" />
                {title}
            </h3>

            {hasChildren ? (
                <div className="grid gap-3 md:grid-cols-2">{children}</div>
            ) : (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{empty}</div>
            )}
        </section>
    )
}

function SavedCard({
    title,
    description,
    href,
    badge,
    onRemove,
    disabled,
}: {
    title: string
    description: string
    href: string
    badge: string
    onRemove: () => void
    disabled?: boolean
}) {
    return (
        <div className="rounded-2xl border bg-background/60 p-4">
            <div className="flex items-start justify-between gap-3">
                <Badge variant="secondary">{badge}</Badge>
                <Button size="icon-sm" variant="ghost" onClick={onRemove} disabled={disabled}>
                    <X className="size-4" />
                </Button>
            </div>

            <Link href={href} className="mt-3 block">
                <p className="line-clamp-2 font-medium transition-colors hover:text-primary">{title}</p>
                <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{description}</p>
            </Link>
        </div>
    )
}
