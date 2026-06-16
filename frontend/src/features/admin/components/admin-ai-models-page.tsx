"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Bot, Database, RefreshCw, Save, Search, SlidersHorizontal } from "lucide-react"
import { getAdminAiModels, getAdminAiPrompts, syncAdminAiModels, updateAdminAiModel, updateAdminAiPrompts } from "@/features/admin/api"
import type { AdminAiModelConfig, AdminAiPrompts } from "@/features/admin/types"
import { AdminPageHeader, AdminTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./admin-shared"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"

const promptLabels: Record<keyof AdminAiPrompts, string> = {
    chat: "Обычный чат",
    rag: "RAG-ответ",
    files: "Файлы",
    code: "Код / playground",
    project: "Проектный режим",
    question_auto_answer: "Автоответ на вопрос",
}

export function AdminAiModelsPage() {
    const queryClient = useQueryClient()
    const [q, setQ] = React.useState("")
    const [usage, setUsage] = React.useState("all")
    const [enabled, setEnabled] = React.useState("all")
    const [editing, setEditing] = React.useState<AdminAiModelConfig | null>(null)

    const modelsQuery = useQuery({
        queryKey: ["admin", "ai", "models", q, usage, enabled],
        queryFn: () => getAdminAiModels({ q: q || undefined, usage, enabled }),
    })
    const promptsQuery = useQuery({ queryKey: ["admin", "ai", "prompts"], queryFn: getAdminAiPrompts })

    const syncMutation = useMutation({
        mutationFn: () => syncAdminAiModels({ limit: 600 }),
        onSuccess: (payload) => {
            toast.success(payload.message || "Модели обновлены")
            void queryClient.invalidateQueries({ queryKey: ["admin", "ai"] })
        },
        onError: () => toast.error("Не удалось получить модели OpenRouter"),
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: Partial<AdminAiModelConfig> }) => updateAdminAiModel(id, payload),
        onSuccess: (model) => {
            toast.success("Настройки модели сохранены")
            setEditing(model)
            void queryClient.invalidateQueries({ queryKey: ["admin", "ai"] })
        },
        onError: () => toast.error("Не удалось сохранить модель"),
    })

    const promptMutation = useMutation({
        mutationFn: updateAdminAiPrompts,
        onSuccess: () => {
            toast.success("Промпты сохранены")
            void queryClient.invalidateQueries({ queryKey: ["admin", "ai", "prompts"] })
        },
        onError: () => toast.error("Не удалось сохранить промпты"),
    })

    const models = modelsQuery.data?.data ?? []
    const meta = modelsQuery.data?.meta

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="AI модели и промпты"
                description="Синхронизация OpenRouter, назначение моделей для чата/embeddings/rerank, defaults и системные промпты."
                actions={(
                    <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
                        <RefreshCw className="mr-2 size-4" />Получить модели OpenRouter
                    </Button>
                )}
            />

            {meta ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Metric label="Всего моделей" value={meta.stats.models_total} />
                    <Metric label="Включено" value={meta.stats.models_enabled} />
                    <Metric label="Chat" value={meta.stats.chat_models} />
                    <Metric label="Embeddings" value={meta.stats.embedding_models} />
                </div>
            ) : null}

            <Tabs defaultValue="models">
                <TabsList>
                    <TabsTrigger value="models"><Bot className="mr-2 size-4" />Модели</TabsTrigger>
                    <TabsTrigger value="prompts"><SlidersHorizontal className="mr-2 size-4" />Промпты</TabsTrigger>
                </TabsList>

                <TabsContent value="models" className="space-y-4">
                    <Card>
                        <CardContent className="grid gap-3 pt-6 md:grid-cols-[1fr_180px_180px]">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Поиск модели" className="pl-9" />
                            </div>
                            <select value={usage} onChange={(event) => setUsage(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
                                <option value="all">Все назначения</option>
                                <option value="chat">Chat</option>
                                <option value="embedding">Embedding</option>
                                <option value="rerank">Rerank</option>
                            </select>
                            <select value={enabled} onChange={(event) => setEnabled(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
                                <option value="all">Все статусы</option>
                                <option value="enabled">Включённые</option>
                                <option value="disabled">Отключённые</option>
                            </select>
                        </CardContent>
                    </Card>

                    {modelsQuery.isLoading ? <Skeleton className="h-64" /> : (
                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
                            <AdminTable>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Модель</TableHead>
                                        <TableHead>Назначение</TableHead>
                                        <TableHead>Контекст</TableHead>
                                        <TableHead className="text-right">Действия</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {models.map((model) => (
                                        <TableRow key={model.database_id}>
                                            <TableCell className="max-w-xl">
                                                <div className="space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="font-medium">{model.name}</p>
                                                        {model.default_for_chat ? <Badge>default chat</Badge> : null}
                                                        {model.default_for_embeddings ? <Badge variant="secondary">default embedding</Badge> : null}
                                                    </div>
                                                    <p className="break-all text-xs text-muted-foreground">{model.provider} / {model.id}</p>
                                                    {model.description ? <p className="line-clamp-2 text-xs text-muted-foreground">{model.description}</p> : null}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {model.enabled ? <Badge>enabled</Badge> : <Badge variant="secondary">off</Badge>}
                                                    {model.use_for_chat ? <Badge variant="outline">chat</Badge> : null}
                                                    {model.use_for_embeddings ? <Badge variant="outline"><Database className="mr-1 size-3" />embedding</Badge> : null}
                                                    {model.use_for_rerank ? <Badge variant="outline">rerank</Badge> : null}
                                                </div>
                                            </TableCell>
                                            <TableCell>{model.context_length ? model.context_length.toLocaleString("ru-RU") : "—"}</TableCell>
                                            <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => setEditing(model)}>Настроить</Button></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </AdminTable>
                            <ModelEditor model={editing ?? models[0] ?? null} onSave={(id, payload) => updateMutation.mutate({ id, payload })} pending={updateMutation.isPending} />
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="prompts">
                    {promptsQuery.isLoading ? <Skeleton className="h-80" /> : promptsQuery.data ? (
                        <PromptEditor prompts={promptsQuery.data.data} onSave={(payload) => promptMutation.mutate(payload)} pending={promptMutation.isPending} />
                    ) : null}
                </TabsContent>
            </Tabs>
        </div>
    )
}

function Metric({ label, value }: { label: string; value: number }) {
    return (
        <Card><CardHeader className="pb-2"><CardDescription>{label}</CardDescription><CardTitle className="text-3xl">{value}</CardTitle></CardHeader></Card>
    )
}

function ModelEditor({ model, onSave, pending }: { model: AdminAiModelConfig | null; onSave: (id: number, payload: Partial<AdminAiModelConfig>) => void; pending: boolean }) {
    const [draft, setDraft] = React.useState<Partial<AdminAiModelConfig>>({})
    React.useEffect(() => setDraft(model ?? {}), [model])

    if (!model) {
        return <Card><CardContent className="py-10 text-sm text-muted-foreground">Сначала получите список моделей OpenRouter.</CardContent></Card>
    }

    const update = (key: keyof AdminAiModelConfig, value: unknown) => setDraft((current) => ({ ...current, [key]: value }))

    return (
        <Card className="h-fit">
            <CardHeader>
                <CardTitle>Настройка модели</CardTitle>
                <CardDescription className="break-all">{model.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                    <Toggle label="Включить" checked={!!draft.enabled} onChange={(v) => update("enabled", v)} />
                    <Toggle label="Для чата" checked={!!draft.use_for_chat} onChange={(v) => update("use_for_chat", v)} />
                    <Toggle label="Для embeddings" checked={!!draft.use_for_embeddings} onChange={(v) => update("use_for_embeddings", v)} />
                    <Toggle label="Для rerank" checked={!!draft.use_for_rerank} onChange={(v) => update("use_for_rerank", v)} />
                    <Toggle label="Default chat" checked={!!draft.default_for_chat} onChange={(v) => update("default_for_chat", v)} />
                    <Toggle label="Default embedding" checked={!!draft.default_for_embeddings} onChange={(v) => update("default_for_embeddings", v)} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-sm"><span>Temperature</span><Input type="number" step="0.05" min={0} max={2} value={draft.temperature ?? ""} onChange={(e) => update("temperature", e.target.value === "" ? null : Number(e.target.value))} /></label>
                    <label className="space-y-1 text-sm"><span>Max tokens</span><Input type="number" value={draft.max_tokens ?? ""} onChange={(e) => update("max_tokens", e.target.value === "" ? null : Number(e.target.value))} /></label>
                    <label className="space-y-1 text-sm"><span>Dimensions</span><Input type="number" value={draft.dimensions ?? ""} onChange={(e) => update("dimensions", e.target.value === "" ? null : Number(e.target.value))} /></label>
                    <label className="space-y-1 text-sm"><span>Порядок</span><Input type="number" value={draft.sort_order ?? 100} onChange={(e) => update("sort_order", Number(e.target.value))} /></label>
                </div>
                <label className="space-y-1 text-sm"><span>Персональный system prompt для модели</span><Textarea rows={8} value={draft.system_prompt ?? ""} onChange={(e) => update("system_prompt", e.target.value)} placeholder="Если пусто, используется общий prompt по режиму." /></label>
                <Button className="w-full" disabled={pending} onClick={() => onSave(model.database_id, draft)}><Save className="mr-2 size-4" />Сохранить модель</Button>
            </CardContent>
        </Card>
    )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
    return <label className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm"><span>{label}</span><Switch checked={checked} onCheckedChange={onChange} /></label>
}

function PromptEditor({ prompts, onSave, pending }: { prompts: AdminAiPrompts; onSave: (payload: Partial<AdminAiPrompts>) => void; pending: boolean }) {
    const [draft, setDraft] = React.useState<AdminAiPrompts>(prompts)
    React.useEffect(() => setDraft(prompts), [prompts])

    return (
        <Card>
            <CardHeader>
                <CardTitle>Системные промпты по режимам</CardTitle>
                <CardDescription>Эти промпты применяются, если у выбранной модели не задан персональный prompt.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {(Object.keys(promptLabels) as Array<keyof AdminAiPrompts>).map((key) => (
                    <label key={key} className="block space-y-1 text-sm">
                        <span className="font-medium">{promptLabels[key]}</span>
                        <Textarea rows={5} value={draft[key] ?? ""} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} />
                    </label>
                ))}
                <Button disabled={pending} onClick={() => onSave(draft)}><Save className="mr-2 size-4" />Сохранить промпты</Button>
            </CardContent>
        </Card>
    )
}
