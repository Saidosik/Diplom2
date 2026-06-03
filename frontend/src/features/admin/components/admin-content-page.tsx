"use client"

import Link from "next/link"
import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { deleteAdminContent, getAdminContent, restoreAdminContent, updateAdminContentStatus } from "@/features/admin/api"
import { AdminFilters, AdminPageHeader, AdminTable, StatusBadge, TableBody, TableCell, TableHead, TableHeader, TableRow, formatDateTime } from "./admin-shared"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type ContentKind = "publications" | "questions" | "answers" | "comments"

const statusOptions: Record<ContentKind, Array<{ value: string; label: string }>> = {
    publications: ["all", "published", "draft", "hidden", "archived"].map((value) => ({ value, label: value })),
    questions: ["all", "published", "draft", "hidden", "closed"].map((value) => ({ value, label: value })),
    answers: ["all", "published", "hidden"].map((value) => ({ value, label: value })),
    comments: ["all", "published", "hidden"].map((value) => ({ value, label: value })),
}

export function AdminContentPage() {
    const queryClient = useQueryClient()
    const [kind, setKind] = React.useState<ContentKind>("publications")
    const [q, setQ] = React.useState("")
    const [status, setStatus] = React.useState("all")

    React.useEffect(() => setStatus("all"), [kind])

    const contentQuery = useQuery({
        queryKey: ["admin", "content", kind, q, status],
        queryFn: () => getAdminContent(kind, { q: q || undefined, status, per_page: 50 }),
    })

    const invalidate = () => {
        void queryClient.invalidateQueries({ queryKey: ["admin", "content"] })
        void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] })
    }

    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) => updateAdminContentStatus(kind, id, status),
        onSuccess: () => { toast.success("Статус обновлён"); invalidate() },
        onError: () => toast.error("Не удалось обновить статус"),
    })
    const deleteMutation = useMutation({
        mutationFn: ({ id }: { id: number }) => deleteAdminContent(kind as "publications" | "questions" | "comments", id),
        onSuccess: () => { toast.success("Объект скрыт"); invalidate() },
        onError: () => toast.error("Не удалось скрыть объект"),
    })
    const restoreMutation = useMutation({
        mutationFn: ({ id }: { id: number }) => restoreAdminContent(kind as "publications" | "questions" | "comments", id),
        onSuccess: () => { toast.success("Объект восстановлен"); invalidate() },
        onError: () => toast.error("Не удалось восстановить объект"),
    })

    return (
        <div className="space-y-6">
            <AdminPageHeader title="Контент" description="Модерация публикаций, вопросов, ответов и комментариев: статусы, скрытие, восстановление и быстрый переход к материалу." />
            <Tabs value={kind} onValueChange={(value) => setKind(value as ContentKind)}>
                <TabsList>
                    <TabsTrigger value="publications">Публикации</TabsTrigger>
                    <TabsTrigger value="questions">Вопросы</TabsTrigger>
                    <TabsTrigger value="answers">Ответы</TabsTrigger>
                    <TabsTrigger value="comments">Комментарии</TabsTrigger>
                </TabsList>
            </Tabs>
            <AdminFilters query={q} onQueryChange={setQ} status={status} onStatusChange={setStatus} statusOptions={statusOptions[kind]} />

            <AdminTable>
                <TableHeader>
                    <TableRow>
                        <TableHead>Материал</TableHead>
                        <TableHead>Автор</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Метрики</TableHead>
                        <TableHead>Дата</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(contentQuery.data?.data ?? []).map((item) => {
                        const canSoftDelete = kind !== "answers"
                        const availableStatuses = statusOptions[kind].filter((option) => option.value !== "all")
                        const title = item.title ?? item.question?.title ?? item.target?.title ?? item.content ?? `#${item.id}`

                        return (
                            <TableRow key={`${kind}-${item.id}`}>
                                <TableCell className="max-w-md">
                                    <div className="space-y-1">
                                        {item.href ? <Link href={item.href} className="font-medium hover:underline">{title}</Link> : <p className="font-medium">{title}</p>}
                                        {item.excerpt ? <p className="line-clamp-2 text-xs text-muted-foreground">{item.excerpt}</p> : null}
                                        {item.content ? <p className="line-clamp-2 text-xs text-muted-foreground">{item.content}</p> : null}
                                    </div>
                                </TableCell>
                                <TableCell>{item.author?.name ?? "—"}</TableCell>
                                <TableCell><StatusBadge status={item.deleted_at ? "deleted" : item.status} /></TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {Object.entries(item.counts ?? {}).map(([key, value]) => `${key}: ${value}`).join(" · ") || "—"}
                                </TableCell>
                                <TableCell>{formatDateTime(item.created_at)}</TableCell>
                                <TableCell>
                                    <div className="flex justify-end gap-2">
                                        <select value={item.status} onChange={(event) => statusMutation.mutate({ id: item.id, status: event.target.value })} className="h-9 rounded-md border bg-background px-2 text-sm">
                                            {availableStatuses.map((option) => <option key={option.value} value={option.value}>{option.value}</option>)}
                                        </select>
                                        {canSoftDelete ? item.deleted_at ? (
                                            <Button size="sm" variant="outline" onClick={() => restoreMutation.mutate({ id: item.id })}>Восст.</Button>
                                        ) : (
                                            <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate({ id: item.id })}>Удалить</Button>
                                        ) : null}
                                    </div>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </AdminTable>
        </div>
    )
}
