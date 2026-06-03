"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Bot, Code2, ExternalLink, Loader2, Play, Save, Search } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getMySnippets, getPlaygroundLanguages, getRun, getSnippet, runCode } from "@/features/playground/api"
import { MonacoCodeEditor } from "@/features/playground/components/monaco-code-editor"
import { explainCodeWithAi } from "@/features/ai-rag/api"
import { RagSourceCard } from "@/features/ai-rag/components/rag-source-card"
import type { RagSource } from "@/features/ai-rag/types"
import type { CodeRun, CodeSnippet, PlaygroundLanguage } from "@/features/playground/types"

const defaultCodeByLanguage: Record<string, string> = {
    javascript: `const input = require('fs').readFileSync(0, 'utf8').trim();
console.log(input || 'Hello from Vektor Playground');`,
    python: `text = input().strip()
print(text or 'Hello from Vektor Playground')`,
    php: `$text = trim(stream_get_contents(STDIN));
echo ($text !== '' ? $text : 'Hello from Vektor Playground') . PHP_EOL;`,
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    string text;
    getline(cin, text);
    cout << (text.empty() ? "Hello from Vektor Playground" : text) << '\n';
}`,
    csharp: `using System;
var text = Console.ReadLine();
Console.WriteLine(string.IsNullOrWhiteSpace(text) ? "Hello from Vektor Playground" : text);`,
}


const snippetTypeLabels: Record<string, string> = {
    snippet: "Сниппет",
    template: "Шаблон",
    solution: "Решение",
    note: "Заметка",
}

const snippetStatusLabels: Record<string, string> = {
    draft: "Черновик",
    active: "Активный",
    archived: "Архив",
}

export function CodePlaygroundPage() {
    const searchParams = useSearchParams()
    const [languages, setLanguages] = useState<PlaygroundLanguage[]>([])
    const [snippets, setSnippets] = useState<CodeSnippet[]>([])
    const [language, setLanguage] = useState("javascript")
    const [title, setTitle] = useState("Быстрый запуск кода")
    const [code, setCode] = useState(defaultCodeByLanguage.javascript)
    const [stdin, setStdin] = useState("Vektor")
    const [saveSnippet, setSaveSnippet] = useState(false)
    const [visibility, setVisibility] = useState<"private" | "public">("private")
    const [snippetType, setSnippetType] = useState<"snippet" | "template" | "solution" | "note">("snippet")
    const [snippetStatus, setSnippetStatus] = useState<"draft" | "active">("active")
    const [snippetQ, setSnippetQ] = useState("")
    const [snippetStatusFilter, setSnippetStatusFilter] = useState("all")
    const [run, setRun] = useState<CodeRun | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isExplaining, setIsExplaining] = useState(false)
    const [aiExplanation, setAiExplanation] = useState<string | null>(null)
    const [aiSources, setAiSources] = useState<RagSource[]>([])
    const [isBooting, setIsBooting] = useState(true)

    useEffect(() => {
        let mounted = true

        Promise.allSettled([getPlaygroundLanguages(), getMySnippets({ status: snippetStatusFilter === "all" ? undefined : snippetStatusFilter, q: snippetQ || undefined })])
            .then(([languagesResult, snippetsResult]) => {
                if (!mounted) return

                if (languagesResult.status === "fulfilled") {
                    setLanguages(languagesResult.value)
                    if (languagesResult.value.length > 0 && !languagesResult.value.some((item) => item.value === language)) {
                        setLanguage(languagesResult.value[0].value)
                    }
                }

                if (snippetsResult.status === "fulfilled") {
                    setSnippets(snippetsResult.value)
                }

                const snippetId = Number(searchParams.get("snippet"))
                if (Number.isFinite(snippetId) && snippetId > 0) {
                    getSnippet(snippetId)
                        .then((snippet) => {
                            if (!mounted) return
                            loadSnippet(snippet)
                            setSnippets((items) => [snippet, ...items.filter((item) => item.id !== snippet.id)])
                        })
                        .catch(() => null)
                }
            })
            .finally(() => mounted && setIsBooting(false))

        return () => {
            mounted = false
        }
    }, [searchParams, snippetQ, snippetStatusFilter])

    useEffect(() => {
        if (!run || !["queued", "running"].includes(run.status)) return

        let cancelled = false

        const interval = window.setInterval(() => {
            getRun(run.id)
                .then((latest) => {
                    if (cancelled) return
                    setRun(latest)
                    if (!["queued", "running"].includes(latest.status)) {
                        window.clearInterval(interval)
                    }
                })
                .catch(() => null)
        }, 2500)

        return () => {
            cancelled = true
            window.clearInterval(interval)
        }
    }, [run?.id, run?.status])

    const activeLanguageLabel = useMemo(() => {
        return languages.find((item) => item.value === language)?.label ?? language
    }, [languages, language])

    const monacoLanguage = useMemo(() => {
        return languages.find((item) => item.value === language)?.monaco ?? language
    }, [languages, language])

    function handleLanguageChange(value: string) {
        setLanguage(value)
        setCode(defaultCodeByLanguage[value] ?? "")
        setRun(null)
        setAiExplanation(null)
        setAiSources([])
    }

    function loadSnippet(snippet: CodeSnippet) {
        setTitle(snippet.title)
        setLanguage(snippet.language)
        setCode(snippet.code)
        setStdin(snippet.stdin ?? "")
        setSaveSnippet(false)
        setVisibility(snippet.visibility)
        setSnippetType((snippet.snippet_type as "snippet" | "template" | "solution" | "note") ?? "snippet")
        setSnippetStatus(snippet.status === "draft" ? "draft" : "active")
        setRun(null)
        setAiExplanation(null)
        setAiSources([])
    }

    async function handleExplainCode() {
        const currentRun = run
        setIsExplaining(true)

        try {
            const response = await explainCodeWithAi({
                run_id: currentRun?.id,
                language,
                code,
                stdin,
                stdout: currentRun?.stdout ?? null,
                stderr: currentRun?.stderr ?? null,
                query: currentRun?.stderr ? "объясни ошибку запуска кода" : "проверь результат запуска кода",
            })
            setAiExplanation(response.answer)
            setAiSources(response.sources ?? [])
            toast.success("AI разобрал запуск кода")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Не удалось получить AI-разбор")
        } finally {
            setIsExplaining(false)
        }
    }

    async function handleRun() {
        setIsLoading(true)
        setRun(null)

        const toastId = toast.loading("Запускаем код", {
            description: `${activeLanguageLabel} · Docker sandbox`,
        })

        try {
            const result = await runCode({
                language,
                code,
                stdin,
                save: saveSnippet,
                title,
                visibility,
                snippet_type: snippetType,
                snippet_status: snippetStatus,
            })
            setRun(result)

            const toastOptions = {
                id: toastId,
                description: "Запуск выполняется в очереди. Результат придёт через Reverb или обновится на странице запуска.",
                action: {
                    label: "Открыть запуск",
                    onClick: () => {
                        window.location.href = `/playground/runs/${result.id}`
                    },
                },
            }

            toast.success("Код отправлен на проверку", toastOptions)

            if (result.snippet) {
                setSnippets((items) => [result.snippet!, ...items.filter((item) => item.id !== result.snippet!.id)])
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Не удалось выполнить код", { id: toastId })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
                <Card className="shadow-sm">
                    <CardHeader className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="gap-2">
                                <Code2 className="size-3.5" />
                                Code Playground
                            </Badge>
                            <Badge variant="secondary">Docker sandbox</Badge>
                        </div>
                        <div>
                            <CardTitle className="text-3xl tracking-tight md:text-5xl">Песочница кода</CardTitle>
                            <CardDescription className="mt-3 max-w-3xl text-base leading-7">
                                Запускай короткие примеры, проверяй вывод и сохраняй сниппеты для вопросов, ответов и публикаций.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                            <div className="space-y-2">
                                <Label htmlFor="snippet-title">Название</Label>
                                <Input id="snippet-title" value={title} onChange={(event) => setTitle(event.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Язык</Label>
                                <Select value={language} onValueChange={handleLanguageChange} disabled={isBooting || languages.length === 0}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Выбери язык" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {languages.map((item) => (
                                            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="playground-code">Код</Label>
                            <MonacoCodeEditor
                                value={code}
                                onChange={setCode}
                                language={monacoLanguage}
                                height={430}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="playground-stdin">STDIN</Label>
                            <Textarea
                                id="playground-stdin"
                                value={stdin}
                                onChange={(event) => setStdin(event.target.value)}
                                className="min-h-24 font-mono text-sm"
                                spellCheck={false}
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <Button onClick={handleRun} disabled={isLoading || code.trim().length === 0}>
                                {isLoading ? <Loader2 className="animate-spin" /> : <Play />}
                                Запустить
                            </Button>
                            <Button type="button" variant={saveSnippet ? "default" : "outline"} onClick={() => setSaveSnippet((value) => !value)}>
                                <Save />
                                {saveSnippet ? "Сниппет сохранится" : "Сохранить как сниппет"}
                            </Button>
                            <Select value={visibility} onValueChange={(value) => setVisibility(value as "private" | "public")}>
                                <SelectTrigger className="w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="private">Приватный</SelectItem>
                                    <SelectItem value="public">Публичный</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={snippetStatus} onValueChange={(value) => setSnippetStatus(value as "draft" | "active")}>
                                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Активный</SelectItem>
                                    <SelectItem value="draft">Черновик</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={snippetType} onValueChange={(value) => setSnippetType(value as "snippet" | "template" | "solution" | "note")}>
                                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="snippet">Сниппет</SelectItem>
                                    <SelectItem value="template">Шаблон</SelectItem>
                                    <SelectItem value="solution">Решение</SelectItem>
                                    <SelectItem value="note">Заметка</SelectItem>
                                </SelectContent>
                            </Select>
                            <span className="text-sm text-muted-foreground">Активный язык: {activeLanguageLabel}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>Мои сниппеты</CardTitle>
                        <CardDescription>Публичные/приватные сниппеты, шаблоны, решения и черновики.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input value={snippetQ} onChange={(event) => setSnippetQ(event.target.value)} placeholder="Поиск сниппетов" className="pl-9" />
                            </div>
                            <Select value={snippetStatusFilter} onValueChange={setSnippetStatusFilter}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Все</SelectItem>
                                    <SelectItem value="draft">Черновики</SelectItem>
                                    <SelectItem value="active">Активные</SelectItem>
                                    <SelectItem value="archived">Архив</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {snippets.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Сохранённые сниппеты появятся после первого запуска с сохранением.</p>
                        ) : snippets.map((snippet) => (
                            <button
                                key={snippet.id}
                                type="button"
                                onClick={() => loadSnippet(snippet)}
                                className="w-full rounded-2xl border bg-background p-3 text-left transition hover:bg-muted/50"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="line-clamp-1 text-sm font-medium">{snippet.title}</span>
                                    <div className="flex flex-wrap gap-1"><Badge variant="outline">{snippet.language}</Badge><Badge variant="outline">{snippetTypeLabels[snippet.snippet_type ?? "snippet"] ?? snippet.snippet_type}</Badge><Badge variant={snippet.status === "draft" ? "secondary" : "outline"}>{snippetStatusLabels[snippet.status] ?? snippet.status}</Badge><Badge variant={snippet.visibility === "public" ? "secondary" : "outline"}>{snippet.visibility === "public" ? "public" : "private"}</Badge></div>
                                </div>
                                <p className="mt-2 line-clamp-2 font-mono text-xs text-muted-foreground">{snippet.code}</p>
                            </button>
                        ))}
                    </CardContent>
                </Card>
            </section>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Результат запуска</CardTitle>
                    <CardDescription>stdout, stderr, статус очереди, код завершения и время выполнения.</CardDescription>
                </CardHeader>
                <CardContent>
                    {!run ? (
                        <p className="text-sm text-muted-foreground">Результат появится после запуска кода. Если задача в очереди, результат обновится автоматически.</p>
                    ) : (
                        <div className="grid gap-4 lg:grid-cols-2">
                            <OutputBlock title="STDOUT" value={run.stdout || ""} />
                            <OutputBlock title="STDERR" value={run.stderr || run.message || ""} muted={run.status === "finished"} />
                            <div className="flex flex-wrap gap-2 lg:col-span-2">
                                <Badge variant={run.status === "finished" ? "secondary" : run.status === "queued" || run.status === "running" ? "outline" : "destructive"}>status: {run.status}</Badge>
                                <Badge variant="outline">exit: {run.exit_code ?? "—"}</Badge>
                                <Badge variant="outline">time: {run.execution_time} ms</Badge>
                                <Button asChild variant="outline" size="sm">
                                    <Link href={`/playground/runs/${run.id}`}>
                                        <ExternalLink className="size-4" />
                                        Открыть запуск
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {run ? (
                <Card className="border-primary/20 bg-primary/5 shadow-sm xl:col-start-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bot className="size-5" />
                            AI-разбор запуска
                        </CardTitle>
                        <CardDescription>Помощник использует вывод запуска и RAG-индекс материалов платформы.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button type="button" variant="outline" onClick={handleExplainCode} disabled={isExplaining}>
                            {isExplaining ? <Loader2 className="animate-spin" /> : <Bot />}
                            Объяснить через AI
                        </Button>
                        {aiExplanation ? (
                            <div className="space-y-4">
                                <div className="whitespace-pre-wrap rounded-xl border bg-background p-4 text-sm leading-6">{aiExplanation}</div>
                                {aiSources.length ? (
                                    <div className="grid gap-3">
                                        {aiSources.slice(0, 3).map((source) => (
                                            <RagSourceCard key={source.id} source={source} />
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </CardContent>
                </Card>
            ) : null}

        </div>
    )
}

function OutputBlock({ title, value, muted = false }: { title: string; value: string; muted?: boolean }) {
    return (
        <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
            <pre className="min-h-32 overflow-auto rounded-2xl border bg-muted/40 p-4 text-sm leading-6">
                <code className={muted ? "text-muted-foreground" : undefined}>{value || "—"}</code>
            </pre>
        </div>
    )
}
