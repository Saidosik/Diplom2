"use client"

import * as React from "react"
import Link from "next/link"
import { Loader2, Search, Sparkles, Tags } from "lucide-react"
import { toast } from "sonner"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { AuthRequiredMessage } from "@/features/auth/components/auth-required-message"
import { getMyInterests, updateMyInterests } from "@/features/community/api"
import type { InterestTag } from "@/features/community/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function InterestsPage() {
    const queryClient = useQueryClient()
    const [search, setSearch] = React.useState("")
    const [selectedIds, setSelectedIds] = React.useState<number[]>([])

    const interestsQuery = useQuery({
        queryKey: ["community", "interests"],
        queryFn: getMyInterests,
        retry: false,
    })

    React.useEffect(() => {
        if (interestsQuery.data) {
            setSelectedIds(interestsQuery.data.selected_tag_ids)
        }
    }, [interestsQuery.data])

    const mutation = useMutation({
        mutationFn: updateMyInterests,
        onSuccess: (data) => {
            setSelectedIds(data.selected_tag_ids)
            queryClient.setQueryData(["community", "interests"], data)
            queryClient.invalidateQueries({ queryKey: ["community", "recommendations"] })
            toast.success("Интересы обновлены", {
                description: "Рекомендации будут точнее учитывать выбранные технологии.",
            })
        },
        onError: () => toast.error("Не удалось сохранить интересы"),
    })

    const tags = interestsQuery.data?.tags ?? []
    const normalizedSearch = search.trim().toLowerCase()
    const visibleTags = tags.filter((tag) => {
        if (normalizedSearch === "") return true
        return tag.name.toLowerCase().includes(normalizedSearch) || tag.slug.toLowerCase().includes(normalizedSearch)
    })
    const selectedTags = tags.filter((tag) => selectedIds.includes(tag.id))
    const hasChanges = interestsQuery.data ? !sameIds(selectedIds, interestsQuery.data.selected_tag_ids) : false

    function toggleTag(tag: InterestTag) {
        setSelectedIds((current) => current.includes(tag.id)
            ? current.filter((id) => id !== tag.id)
            : [...current, tag.id]
        )
    }

    function reset() {
        setSelectedIds(interestsQuery.data?.selected_tag_ids ?? [])
    }

    if (interestsQuery.isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Загружаем интересы...
                </CardContent>
            </Card>
        )
    }

    if (interestsQuery.isError) {
        return (
            <AuthRequiredMessage
                title="Войдите, чтобы настроить интересы"
                description="Выбранные технологии используются для персональных рекомендаций, подборки вопросов и популярных материалов."
            />
        )
    }

    return (
        <div className="space-y-6">
            <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
                <Card className="shadow-sm">
                    <CardHeader className="space-y-4 p-6 md:p-8">
                        <Badge variant="secondary" className="w-fit gap-2">
                            <Sparkles className="size-3.5" />
                            Профиль рекомендаций
                        </Badge>
                        <div className="space-y-3">
                            <CardTitle className="text-4xl tracking-tight md:text-6xl">Мои интересы</CardTitle>
                            <CardDescription className="max-w-3xl text-base leading-7">
                                Выберите технологии и темы, которые должны сильнее влиять на раздел “Для вас”, рекомендации и подборку вопросов.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Найти тег: Laravel, Redis, Docker..."
                                className="pl-9"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {visibleTags.map((tag) => {
                                const active = selectedIds.includes(tag.id)
                                return (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => toggleTag(tag)}
                                        className={cn(
                                            "rounded-full border px-3 py-2 text-sm transition hover:border-primary/60",
                                            active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted/60"
                                        )}
                                    >
                                        #{tag.name}
                                        <span className={cn("ml-2 text-xs", active ? "text-primary-foreground/75" : "text-muted-foreground")}>{tag.usage_count}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                <Card className="h-fit shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Tags className="size-5" />
                            Выбрано: {selectedIds.length}
                        </CardTitle>
                        <CardDescription>Эти теги напрямую усиливают персональные рекомендации.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {selectedTags.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {selectedTags.map((tag) => (
                                    <Badge key={tag.id} variant="secondary">#{tag.name}</Badge>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">Выберите хотя бы несколько технологий, чтобы рекомендации стали точнее.</p>
                        )}

                        <div className="flex flex-col gap-2">
                            <Button onClick={() => mutation.mutate(selectedIds)} disabled={!hasChanges || mutation.isPending}>
                                {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                                Сохранить интересы
                            </Button>
                            <Button type="button" variant="outline" onClick={reset} disabled={!hasChanges || mutation.isPending}>Сбросить изменения</Button>
                            <Button asChild variant="ghost">
                                <Link href="/recommendations">Перейти к рекомендациям</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    )
}

function sameIds(left: number[], right: number[]) {
    if (left.length !== right.length) return false
    const a = [...left].sort((x, y) => x - y)
    const b = [...right].sort((x, y) => x - y)
    return a.every((value, index) => value === b[index])
}
