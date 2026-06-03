"use client"

import Link from "next/link"
import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { deleteAdminAiDocument, getAdminAiDocuments, getAdminAiIndexStatus, rebuildAdminAiIndex, reindexAdminAiSource, reindexAdminAiStale } from "@/features/admin/api"
import { AdminFilters, AdminPageHeader, AdminTable, StatCard, StatusBadge, TableBody, TableCell, TableHead, TableHeader, TableRow, formatDateTime } from "./admin-shared"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const typeOptions = [
    { value: "all", label: "Все типы" },
    { value: "publication", label: "Публикации" },
    { value: "question", label: "Вопросы" },
    { value: "answer", label: "Ответы" },
    { value: "snippet", label: "Сниппеты" },
]

const statusOptions = [
    { value: "all", label: "Все" },
    { value: "indexed", label: "Индексированные" },
    { value: "stale", label: "Устаревшие" },
    { value: "failed", label: "Ошибки" },
    { value: "indexing", label: "Индексируются" },
]

const sourceLabels: Record<string, string> = {
    publication: "Публикация",
    question: "Вопрос",
    answer: "Ответ",
    snippet: "Сниппет",
}

export function AdminAiIndexPage({ canManageSystem = false }: { canManageSystem?: boolean }) {
    const queryClient = useQueryClient()
    const [q, setQ] = React.useState("")
    const [status, setStatus] = React.useState("all")
    const [type, setType] = React.useState("all")

    const statusQuery = useQuery({ queryKey: ["admin", "ai-index", "status"], queryFn: getAdminAiIndexStatus })
    const documentsQuery = useQuery({
        queryKey: ["admin", "ai-index", "documents", q, status, type],
        queryFn: () => getAdminAiDocuments({ q: q || undefined, status, type, per_page: 50 }),
    })

    const invalidate = () => {
        void queryClient.invalidateQueries({ queryKey: ["admin", "ai-index"] })
        void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] })
    }

    const rebuildMutation = useMutation({
        mutationFn: () => rebuildAdminAiIndex({ mode: "queued", force: true }),
        onSuccess: (payload) => { toast.success(payload.message || "Полная пересборка добавлена в очередь"); invalidate() },
        onError: () => toast.error("Не удалось запустить пересборку индекса"),
    })

    const staleMutation = useMutation({
        mutationFn: () => reindexAdminAiStale({ force: false }),
        onSuccess: (payload) => { toast.success(payload.message || "Устаревшие материалы добавлены в очередь"); invalidate() },
        onError: () => toast.error("Не удалось запустить re-embed устаревших материалов"),
    })

    const sourceMutation = useMutation({
        mutationFn: ({ source_type, source_id }: { source_type: string; source_id: number }) => reindexAdminAiSource({ source_type, source_id, mode: "queued", force: true }),
        onSuccess: (payload) => { toast.success(payload.message || "Материал добавлен в очередь re-embed"); invalidate() },
        onError: () => toast.error("Не удалось добавить материал в очередь re-embed"),
    })

    const deleteMutation = useMutation({
        mutationFn: (id: number) => deleteAdminAiDocument(id),
        onSuccess: () => { toast.success("Документ удалён из AI индекса"); invalidate() },
        onError: () => toast.error("Не удалось удалить документ из индекса"),
    })

    const statusData = statusQuery.data

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="AI индекс"
                description="Контроль RAG-базы знаний: embeddings, chunks, устаревшие документы и ручной re-embed материалов."
               
            />

            {statusQuery.isLoading ? <Skeleton className="h-32" /> : statusData ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Документы" value={statusData.documents.total} hint={`${statusData.documents.indexed} indexed · ${statusData.documents.stale} stale`} />
                    <StatCard label="Chunks" value={statusData.chunks.total} hint={`${statusData.provider.embedding_dimensions ?? "—"} dimensions`} />
                    <StatCard label="Ошибки индекса" value={statusData.documents.failed} hint={statusData.provider.embedding_model ?? "embedding model не указан"} />
                    <StatCard label="Новые источники" value={Object.values(statusData.missing_by_type ?? {}).reduce((sum, value) => sum + value, 0)} hint="ещё не попали в RAG" />
                </div>
            ) : null}

            {statusData ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Конфигурация AI</CardTitle>
                        <CardDescription>Эти значения берутся из Laravel AI SDK конфигурации и .env.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                        <ConfigItem label="Chat" value={`${statusData.provider.chat_provider ?? "—"} / ${statusData.provider.chat_model ?? "—"}`} />
                        <ConfigItem label="Embeddings" value={`${statusData.provider.embedding_provider ?? "—"} / ${statusData.provider.embedding_model ?? "—"}`} />
                        <ConfigItem label="Vector store" value={statusData.provider.vector_driver ?? "—"} />
                        <ConfigItem label="Rerank" value={statusData.provider.rerank_enabled ? "enabled" : "disabled"} />
                    </CardContent>
                </Card>
            ) : null}

            {canManageSystem ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Управление индексом</CardTitle>
                        <CardDescription>Для обычной работы достаточно re-embed устаревших материалов. Полная пересборка нужна после смены embedding-модели или dimensions.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                        <Button onClick={() => staleMutation.mutate()} disabled={staleMutation.isPending}>Re-embed новых и изменённых</Button>
                        <Button variant="outline" onClick={() => rebuildMutation.mutate()} disabled={rebuildMutation.isPending}>Полная пересборка</Button>
                        <Button variant="ghost" onClick={invalidate}>Обновить статус</Button>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>AI индекс</CardTitle>
                        <CardDescription>Модератор может просматривать состояние индекса, но переиндексация и удаление документов доступны только администратору.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="ghost" onClick={invalidate}>Обновить статус</Button>
                    </CardContent>
                </Card>
            )}

            <AdminFilters
                query={q}
                onQueryChange={setQ}
                status={status}
                onStatusChange={setStatus}
                statusOptions={statusOptions}
                extra={(
                    <select value={type} onChange={(event) => setType(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
                        {typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                )}
            />

            <AdminTable>
                <TableHeader>
                    <TableRow>
                        <TableHead>Источник</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Chunks</TableHead>
                        <TableHead>Embedding</TableHead>
                        <TableHead>Индекс</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(documentsQuery.data?.data ?? []).map((document) => (
                        <TableRow key={document.id}>
                            <TableCell className="max-w-md">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">{sourceLabels[document.source_type] ?? document.source_type} #{document.source_id}</p>
                                    {document.href ? <Link href={document.href} className="font-medium hover:underline">{document.title}</Link> : <p className="font-medium">{document.title}</p>}
                                    {document.last_error ? <p className="line-clamp-2 text-xs text-destructive">{document.last_error}</p> : null}
                                </div>
                            </TableCell>
                            <TableCell><StatusBadge status={document.is_stale ? "stale" : document.status} /></TableCell>
                            <TableCell>{document.chunks_count}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{document.embedding_provider ?? "—"}<br />{document.embedding_model ?? "—"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                                <div>source: {formatDateTime(document.source_updated_at)}</div>
                                <div>indexed: {formatDateTime(document.indexed_at)}</div>
                            </TableCell>
                            <TableCell>
                                {canManageSystem ? (
                                    <div className="flex justify-end gap-2">
                                        <Button size="sm" variant="outline" onClick={() => sourceMutation.mutate({ source_type: document.source_type, source_id: document.source_id })} disabled={sourceMutation.isPending}>Re-embed</Button>
                                        <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(document.id)} disabled={deleteMutation.isPending}>Удалить</Button>
                                    </div>
                                ) : (
                                    <span className="text-sm text-muted-foreground">Только просмотр</span>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </AdminTable>
        </div>
    )
}

function ConfigItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 break-words font-medium">{value}</p>
        </div>
    )
}
