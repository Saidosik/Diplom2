"use client"

import Link from "next/link"
import { ArrowLeft, CheckCircle2, CircleAlert, Clock, Code2, Copy, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useQuery } from "@tanstack/react-query"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getRun } from "@/features/playground/api"
import { MonacoCodeEditor } from "@/features/playground/components/monaco-code-editor"

type CodeRunDetailPageProps = {
    runId: number
}

export function CodeRunDetailPage({ runId }: CodeRunDetailPageProps) {
    const runQuery = useQuery({
        queryKey: ["playground", "run", runId],
        queryFn: () => getRun(runId),
        refetchInterval: (query) => {
            const status = query.state.data?.status
            return status === "queued" || status === "running" ? 2500 : false
        },
    })

    const run = runQuery.data

    async function copyCode() {
        if (!run) return
        await navigator.clipboard.writeText(run.code)
        toast.success("Код скопирован")
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-2">
                    <Button asChild variant="ghost" size="sm" className="-ml-2">
                        <Link href="/playground">
                            <ArrowLeft className="size-4" />
                            К песочнице
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Запуск #{runId}</h1>
                        <p className="mt-2 text-muted-foreground">Код, входные данные, статус выполнения и результат Docker sandbox.</p>
                    </div>
                </div>
                {run ? (
                    <div className="flex flex-wrap gap-2">
                        <Badge variant={run.status === "finished" ? "secondary" : run.status === "queued" || run.status === "running" ? "outline" : "destructive"}>
                            {run.status === "finished" ? <CheckCircle2 className="size-3.5" /> : run.status === "queued" || run.status === "running" ? <Loader2 className="size-3.5 animate-spin" /> : <CircleAlert className="size-3.5" />}
                            {run.status}
                        </Badge>
                        <Badge variant="outline"><Clock className="size-3.5" /> {run.execution_time} ms</Badge>
                        <Badge variant="outline"><Code2 className="size-3.5" /> {run.language}</Badge>
                    </div>
                ) : null}
            </div>

            {runQuery.isLoading ? (
                <Card><CardContent className="p-6 text-sm text-muted-foreground">Загружаем запуск...</CardContent></Card>
            ) : !run ? (
                <Card><CardContent className="p-6 text-sm text-muted-foreground">Запуск не найден или недоступен.</CardContent></Card>
            ) : (
                <>
                    <Card>
                        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                            <div>
                                <CardTitle>Код</CardTitle>
                                <CardDescription>Snapshot кода на момент запуска.</CardDescription>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={copyCode}>
                                <Copy className="size-4" />
                                Скопировать
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <MonacoCodeEditor value={run.code} onChange={() => null} language={run.language} readOnly height={360} />
                        </CardContent>
                    </Card>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <OutputCard title="STDIN" value={run.stdin || ""} />
                        <OutputCard title="STDOUT" value={run.stdout || ""} />
                        <OutputCard title="STDERR" value={run.stderr || run.message || ""} />
                        <Card>
                            <CardHeader>
                                <CardTitle>Метаданные</CardTitle>
                                <CardDescription>Статус, код завершения и ресурсные лимиты.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-wrap gap-2">
                                <Badge variant={run.status === "finished" ? "secondary" : run.status === "queued" || run.status === "running" ? "outline" : "destructive"}>status: {run.status}</Badge>
                                <Badge variant="outline">exit: {run.exit_code ?? "—"}</Badge>
                                <Badge variant="outline">time: {run.execution_time} ms</Badge>
                                <Badge variant="outline">memory: {run.memory_usage} MB</Badge>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    )
}

function OutputCard({ title, value }: { title: string; value: string }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <pre className="min-h-40 overflow-auto rounded-2xl border bg-muted/40 p-4 text-sm leading-6"><code>{value || "—"}</code></pre>
            </CardContent>
        </Card>
    )
}
