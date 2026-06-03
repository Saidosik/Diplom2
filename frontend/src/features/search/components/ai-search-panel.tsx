"use client"

import * as React from "react"
import { Loader2, Search, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MarkdownBlock } from "@/components/ui/MarkdownBlock"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RagSourceCard } from "@/features/ai-rag/components/rag-source-card"
import type { RagSource, RagSourceType } from "@/features/ai-rag/types"
import { getAiModels } from "@/features/ai-chat/api"
import type { AiModel } from "@/features/ai-chat/types"
import { browserApi } from "@/lib/http/browser"

type SearchAiResponse = {
    answer: string
    sources: RagSource[]
    meta?: Record<string, unknown>
}

type AiSearchPanelProps = {
    query: string
    type: "all" | "publications" | "questions" | "answers" | "tags" | "users" | "snippets"
}

const typeMap: Record<AiSearchPanelProps["type"], "all" | RagSourceType> = {
    all: "all",
    publications: "publication",
    questions: "question",
    answers: "answer",
    tags: "all",
    users: "all",
    snippets: "snippet",
}

export function AiSearchPanel({ query, type }: AiSearchPanelProps) {
    const [models, setModels] = React.useState<AiModel[]>([])
    const [model, setModel] = React.useState("")
    const [answer, setAnswer] = React.useState<SearchAiResponse | null>(null)
    const [pending, setPending] = React.useState(false)

    React.useEffect(() => {
        getAiModels()
            .then((items) => {
                setModels(items)
                setModel(items.find((item) => item.default)?.id || items[0]?.id || "")
            })
            .catch(() => null)
    }, [])

    async function runAiSearch() {
        if (query.trim().length < 2 || pending) return
        setPending(true)
        try {
            const response = await browserApi.post<SearchAiResponse>("/laravel/ai/search/answer", {
                query,
                type: typeMap[type] ?? "all",
                model: model || null,
                limit: 8,
            })
            setAnswer(response.data)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Не удалось получить AI-ответ по поиску")
        } finally {
            setPending(false)
        }
    }

    if (query.trim().length < 2) return null

    return (
        <Card className="border-primary/20 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.12),transparent_40%)]">
            <CardHeader className="gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="size-5 text-primary" />
                            AI-поиск по платформе
                        </CardTitle>
                        <CardDescription>
                            Сформирует краткий ответ по RAG-индексу и покажет источники. Обычный чат остаётся на странице /assistant.
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={model} onValueChange={setModel}>
                            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Модель" /></SelectTrigger>
                            <SelectContent>
                                {models.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button type="button" onClick={runAiSearch} disabled={pending}>
                            {pending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                            AI-ответ
                        </Button>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">RAG</Badge>
                    <Badge variant="outline">{typeMap[type]}</Badge>
                    {model ? <Badge variant="outline">{models.find((item) => item.id === model)?.label ?? model}</Badge> : null}
                </div>
            </CardHeader>
            {answer ? (
                <CardContent className="space-y-4">
                    <div className="rounded-2xl border bg-background p-4 text-sm leading-6">
                        <MarkdownBlock content={answer.answer} />
                        <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                            Ответ сгенерирован AI и может содержать ошибки. Проверяй источники и важные команды вручную.
                        </p>
                    </div>
                    {answer.sources?.length ? (
                        <div className="grid gap-3 md:grid-cols-2">
                            {answer.sources.slice(0, 4).map((source) => (
                                <RagSourceCard key={source.id} source={source} />
                            ))}
                        </div>
                    ) : null}
                </CardContent>
            ) : null}
        </Card>
    )
}
