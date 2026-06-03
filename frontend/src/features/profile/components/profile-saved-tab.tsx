"use client"

import * as React from "react"
import Link from "next/link"
import { Bookmark, CircleHelp, Loader2, MessageSquare, Newspaper, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { getSavedItems, removeSavedItem } from "@/features/interactions/api"
import type { SavedItem, SavedTargetType } from "@/features/interactions/types"

function getString(value: unknown, fallback = "") {
    return typeof value === "string" ? value : fallback
}

function getNumber(value: unknown, fallback = 0) {
    return typeof value === "number" ? value : fallback
}

function formatDate(value?: string | null) {
    if (!value) return "недавно"

    try {
        return new Intl.DateTimeFormat("ru-RU", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        }).format(new Date(value))
    } catch {
        return value
    }
}

function getSavedTitle(saved: SavedItem) {
    const item: Record<string, unknown> = saved.item || {}

    if (saved.saveable_type === "publication") {
        return getString(item.title, "Публикация")
    }

    if (saved.saveable_type === "issue_question") {
        return getString(item.title, "Вопрос")
    }

    const question = item.question && typeof item.question === "object" ? item.question as Record<string, unknown> : null
    return question ? getString(question.title, "Ответ на вопрос") : "Ответ на вопрос"
}

function getSavedHref(saved: SavedItem) {
    const item: Record<string, unknown> = saved.item || {}

    if (saved.saveable_type === "publication") {
        const slug = getString(item.slug)
        return slug ? `/publications/${slug}` : "/publications"
    }

    if (saved.saveable_type === "issue_question") {
        const slug = getString(item.slug)
        return slug ? `/questions/${slug}` : "/questions"
    }

    const question = item.question && typeof item.question === "object" ? item.question as Record<string, unknown> : null
    const slug = question ? getString(question.slug) : ""
    return slug ? `/questions/${slug}#answer-${saved.saveable_id}` : "/questions"
}

function getSavedDescription(saved: SavedItem) {
    const item: Record<string, unknown> = saved.item || {}

    if (saved.saveable_type === "publication") {
        return getString(item.excerpt, "Сохранённая публикация из раздела материалов.")
    }

    if (saved.saveable_type === "issue_question") {
        return getString(item.excerpt, "Сохранённый вопрос из Q&A-раздела.")
    }

    return "Сохранённый ответ из раздела вопросов."
}

function getSavedTypeLabel(type: SavedTargetType) {
    if (type === "publication") return "Публикация"
    if (type === "issue_question") return "Вопрос"
    return "Ответ"
}

export function ProfileSavedTab() {
    const [items, setItems] = React.useState<SavedItem[]>([])
    const [page, setPage] = React.useState(1)
    const [lastPage, setLastPage] = React.useState(1)
    const [loading, setLoading] = React.useState(true)
    const [removingId, setRemovingId] = React.useState<number | null>(null)

    async function loadSavedItems() {
        setLoading(true)

        try {
            const result = await getSavedItems({ page, per_page: 8 })
            setItems((result.data || []).filter((item) => Boolean(item.item)))
            setLastPage(result.meta?.last_page || 1)
        } catch (error) {
            console.log("[PROFILE_SAVED_LOAD_ERROR]", error)
            toast.error("Не удалось загрузить сохранённые материалы")
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        void loadSavedItems()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page])

    async function removeItem(saved: SavedItem) {
        setRemovingId(saved.id)

        try {
            await removeSavedItem({
                saveable_type: saved.saveable_type,
                saveable_id: saved.saveable_id,
            })
            setItems((current) => current.filter((item) => item.id !== saved.id))
            toast.success("Материал удалён из сохранённого")
        } catch (error) {
            console.log("[PROFILE_SAVED_REMOVE_ERROR]", error)
            toast.error("Не удалось удалить материал")
        } finally {
            setRemovingId(null)
        }
    }

    const publicationCount = items.filter((item) => item.saveable_type === "publication").length
    const questionCount = items.filter((item) => item.saveable_type === "issue_question").length
    const answerCount = items.filter((item) => item.saveable_type === "issue_answer").length

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
                <SavedMetric icon={Bookmark} label="Всего" value={items.length} />
                <SavedMetric icon={Newspaper} label="Публикации" value={publicationCount} />
                <SavedMetric icon={CircleHelp} label="Вопросы" value={questionCount} />
                <SavedMetric icon={MessageSquare} label="Ответы" value={answerCount} />
            </div>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Сохранённое</CardTitle>
                    <CardDescription>
                        Материалы, которые вы добавили для быстрого доступа.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" />
                            Загрузка сохранённого...
                        </div>
                    ) : items.length > 0 ? (
                        <div className="space-y-4">
                            <div className="grid gap-4 lg:grid-cols-2">
                                {items.map((saved) => (
                                    <Card key={saved.id} className="bg-muted/15 shadow-none transition-colors hover:border-primary/40">
                                        <CardContent className="space-y-4 p-5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="space-y-2">
                                                    <Badge variant="secondary">
                                                        {getSavedTypeLabel(saved.saveable_type)}
                                                    </Badge>

                                                    <h3 className="line-clamp-2 text-lg font-semibold tracking-tight">
                                                        <Link href={getSavedHref(saved)}>
                                                            {getSavedTitle(saved)}
                                                        </Link>
                                                    </h3>
                                                </div>

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => removeItem(saved)}
                                                    disabled={removingId === saved.id}
                                                    title="Убрать из сохранённого"
                                                >
                                                    {removingId === saved.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                                                </Button>
                                            </div>

                                            <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                                                {getSavedDescription(saved)}
                                            </p>

                                            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                                                <span>Сохранено {formatDate(saved.created_at)}</span>
                                                <Button variant="link" className="h-auto p-0 text-xs" asChild>
                                                    <Link href={getSavedHref(saved)}>Открыть</Link>
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

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
                        </div>
                    ) : (
                        <Empty className="min-h-80 border">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <CircleHelp className="size-5" />
                                </EmptyMedia>
                                <EmptyTitle>Пока ничего не сохранено</EmptyTitle>
                                <EmptyDescription>
                                    Откройте публикацию, вопрос или ответ и нажмите «Сохранить», чтобы материал появился здесь.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <div className="flex flex-wrap justify-center gap-2">
                                    <Button variant="outline" asChild>
                                        <Link href="/publications">К публикациям</Link>
                                    </Button>
                                    <Button variant="outline" asChild>
                                        <Link href="/questions">К вопросам</Link>
                                    </Button>
                                </div>
                            </EmptyContent>
                        </Empty>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

function SavedMetric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
    return (
        <Card className="shadow-sm">
            <CardContent className="flex items-center justify-between gap-4 p-5">
                <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-3xl font-semibold tracking-tight">{getNumber(value)}</p>
                </div>
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                </div>
            </CardContent>
        </Card>
    )
}
