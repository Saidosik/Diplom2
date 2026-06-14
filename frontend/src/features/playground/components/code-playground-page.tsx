"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Bot, ChevronDown, Code2, Download, ExternalLink, FileCode2, Files, FolderOpen, History, Import, Loader2, Play, Save, Search, Share2, Terminal, Upload } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getMyFiles, getMyRuns, getMySnippets, getPlaygroundLanguages, getRun, getSnippet, previewUserFile, runCode } from "@/features/playground/api"
import { MonacoCodeEditor } from "@/features/playground/components/monaco-code-editor"
import { explainCodeWithAi } from "@/features/ai-rag/api"
import { RagSourceCard } from "@/features/ai-rag/components/rag-source-card"
import type { RagSource } from "@/features/ai-rag/types"
import type { CodeRun, CodeSnippet, CodeTemplate, PlaygroundLanguage, UserFile } from "@/features/playground/types"

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

const extensionByLanguage: Record<string, string> = { javascript: "js", typescript: "ts", python: "py", php: "php", cpp: "cpp", csharp: "cs", java: "java", go: "go", rust: "rs" }
const languageByExtension: Record<string, string> = { js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript", py: "python", php: "php", cpp: "cpp", cc: "cpp", cxx: "cpp", hpp: "cpp", cs: "csharp", java: "java", go: "go", rs: "rust" }

const localTemplates: CodeTemplate[] = ["javascript", "python", "php", "cpp", "csharp"].flatMap((language) => [
    { id: `${language}-hello`, title: "Hello World", language, code: defaultCodeByLanguage[language] ?? "", stdin: "Vektor" },
    { id: `${language}-stdin`, title: "Read STDIN", language, code: defaultCodeByLanguage[language] ?? "", stdin: "42" },
    { id: `${language}-array`, title: "Array processing", language, code: defaultCodeByLanguage[language] ?? "", stdin: "1 2 3 4 5" },
    { id: `${language}-function`, title: "Function example", language, code: defaultCodeByLanguage[language] ?? "", stdin: "" },
])

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
    const [files, setFiles] = useState<UserFile[]>([])
    const [runs, setRuns] = useState<CodeRun[]>([])
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
    const [consoleTab, setConsoleTab] = useState("console")
    const [importDialog, setImportDialog] = useState<"files" | "snippets" | "runs" | "templates" | null>(null)
    const [currentSnippet, setCurrentSnippet] = useState<CodeSnippet | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        let mounted = true

        Promise.allSettled([getPlaygroundLanguages(), getMySnippets({ status: snippetStatusFilter === "all" ? undefined : snippetStatusFilter, q: snippetQ || undefined }), getMyFiles({ kind: "text", per_page: 50 }), getMyRuns({ per_page: 30 })])
            .then(([languagesResult, snippetsResult, filesResult, runsResult]) => {
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
                if (filesResult.status === "fulfilled") setFiles(filesResult.value)
                if (runsResult.status === "fulfilled") setRuns(runsResult.value)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    function detectLanguage(name?: string | null, mime?: string | null) {
        return languageByExtension[name?.split(".").pop()?.toLowerCase() ?? ""] ?? (mime?.includes("python") ? "python" : language)
    }

    function loadDocument(next: { title?: string; language?: string; code: string; stdin?: string }) {
        setTitle(next.title ?? title)
        setLanguage(next.language ?? language)
        setCode(next.code)
        if (next.stdin !== undefined) setStdin(next.stdin)
        setCurrentSnippet(null)
        setRun(null)
        setAiExplanation(null)
        setAiSources([])
    }

    async function importLocalFile(file: File) {
        try {
            loadDocument({ title: file.name.replace(/\.[^.]+$/, ""), language: detectLanguage(file.name, file.type), code: await file.text() })
            toast.success("Файл импортирован")
        } catch { toast.error("Не удалось прочитать файл") }
    }

    async function importUserFile(file: UserFile) {
        try {
            const preview = await previewUserFile(file.id)
            loadDocument({ title: file.original_name, language: detectLanguage(file.original_name, file.mime_type), code: preview.content ?? "" })
            if (preview.truncated) toast.warning("Файл был обрезан для предпросмотра")
            toast.success("Файл загружен из менеджера")
        } catch { toast.error("Не удалось импортировать файл") }
    }

    function downloadCode() {
        const safe = (title || "playground").replace(/[^a-zа-яё0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || "playground"
        const url = URL.createObjectURL(new Blob([code], { type: "text/plain;charset=utf-8" }))
        const link = document.createElement("a")
        link.href = url
        link.download = `${safe}.${extensionByLanguage[language] ?? "txt"}`
        link.click()
        URL.revokeObjectURL(url)
        toast.success("Файл скачан")
    }

    async function copyText(value: string, message: string) {
        await navigator.clipboard.writeText(value)
        toast.success(message)
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
        <div className="space-y-4">
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border bg-card/70 p-3 shadow-sm backdrop-blur">
                <div className="flex min-w-0 items-center gap-2">
                    <Badge variant="outline" className="gap-2"><Code2 className="size-3.5" />Mini IDE</Badge>
                    <Input value={title} onChange={(event) => setTitle(event.target.value)} className="h-9 w-56 border-0 bg-muted/60 font-medium shadow-none" />
                </div>
                <PlaygroundToolbar isLoading={isLoading} code={code} saveSnippet={saveSnippet} setSaveSnippet={setSaveSnippet} language={language} handleLanguageChange={handleLanguageChange} languages={languages} isBooting={isBooting} run={run} activeLanguageLabel={activeLanguageLabel} handleRun={handleRun} downloadCode={downloadCode} onUpload={() => fileInputRef.current?.click()} onOpenDialog={setImportDialog} onCopyCode={() => copyText(code, "Код скопирован")} onCopyMarkdown={() => copyText(`\`\`\`${language}\n${code}\n\`\`\``, "Markdown-блок скопирован")} onCopyLink={() => copyText(window.location.href, "Ссылка скопирована")} onCopySnippetLink={() => currentSnippet?.visibility === "public" && currentSnippet.status === "active" ? copyText(`${window.location.origin}/playground?snippet=${currentSnippet.id}`, "Ссылка на сниппет скопирована") : toast.warning("Сниппет приватный. Сделайте его публичным для ссылки.")} />
                <input ref={fileInputRef} type="file" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importLocalFile(file); event.currentTarget.value = "" }} />
            </section>

            <section className="grid min-h-[720px] gap-4 xl:grid-cols-[1fr_320px]">
                <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
                    <ResizablePanelGroup {...{ direction: "vertical" }}>
                        <ResizablePanel defaultSize={68} minSize={40}>
                            <MonacoCodeEditor value={code} onChange={setCode} language={monacoLanguage} height="100%" className="h-full rounded-none border-0" />
                        </ResizablePanel>
                        <ResizableHandle withHandle />
                        <ResizablePanel defaultSize={32} minSize={20}>
                            <PlaygroundConsolePanel run={run} stdin={stdin} setStdin={setStdin} consoleTab={consoleTab} setConsoleTab={setConsoleTab} isLoading={isLoading} isExplaining={isExplaining} aiExplanation={aiExplanation} aiSources={aiSources} handleExplainCode={handleExplainCode} />
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>
                <SidePanel snippets={snippets} files={files} runs={runs} snippetQ={snippetQ} setSnippetQ={setSnippetQ} snippetStatusFilter={snippetStatusFilter} setSnippetStatusFilter={setSnippetStatusFilter} onSnippet={loadSnippet} onFile={importUserFile} onRun={(item) => loadDocument({ title: `Run #${item.id}`, language: item.language, code: item.code, stdin: item.stdin ?? "" })} />
            </section>

            <ImportFromUserFilesCommandDialog open={importDialog === "files"} onOpenChange={(open) => setImportDialog(open ? "files" : null)} files={files} onSelect={importUserFile} />
            <ImportFromSnippetsCommandDialog open={importDialog === "snippets"} onOpenChange={(open) => setImportDialog(open ? "snippets" : null)} snippets={snippets} onSelect={loadSnippet} />
            <ImportFromRunsCommandDialog open={importDialog === "runs"} onOpenChange={(open) => setImportDialog(open ? "runs" : null)} runs={runs} onSelect={(item) => loadDocument({ title: `Run #${item.id}`, language: item.language, code: item.code, stdin: item.stdin ?? "" })} />
            <ImportFromTemplatesCommandDialog open={importDialog === "templates"} onOpenChange={(open) => setImportDialog(open ? "templates" : null)} templates={localTemplates} onSelect={(item) => loadDocument({ title: item.title, language: item.language, code: item.code, stdin: item.stdin })} />


        </div>
    )
}


type ToolbarProps = { isLoading: boolean; code: string; saveSnippet: boolean; setSaveSnippet: (updater: (value: boolean) => boolean) => void; language: string; handleLanguageChange: (value: string) => void; languages: PlaygroundLanguage[]; isBooting: boolean; run: CodeRun | null; activeLanguageLabel: string; handleRun: () => void; downloadCode: () => void; onUpload: () => void; onOpenDialog: (value: "files" | "snippets" | "runs" | "templates") => void; onCopyCode: () => void; onCopyMarkdown: () => void; onCopyLink: () => void; onCopySnippetLink: () => void }
function PlaygroundToolbar(props: ToolbarProps) { return <div className="flex flex-wrap items-center gap-2"><Button onClick={props.handleRun} disabled={props.isLoading || props.code.trim().length === 0} size="sm">{props.isLoading ? <Loader2 className="animate-spin" /> : <Play />}Run</Button><ImportCodeDropdown onUpload={props.onUpload} onOpenDialog={props.onOpenDialog} /><Button type="button" variant={props.saveSnippet ? "default" : "outline"} size="sm" onClick={() => props.setSaveSnippet((value) => !value)}><Save />Save</Button><Button type="button" variant="outline" size="sm" onClick={props.downloadCode}><Download />Download</Button><ShareSnippetDropdown onCopyLink={props.onCopyLink} onCopyCode={props.onCopyCode} onCopyMarkdown={props.onCopyMarkdown} onCopySnippetLink={props.onCopySnippetLink} /><Select value={props.language} onValueChange={props.handleLanguageChange} disabled={props.isBooting || props.languages.length === 0}><SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger><SelectContent>{props.languages.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select><Badge variant={props.run?.status === "failed" ? "destructive" : "secondary"}>{props.isLoading ? "running" : props.run?.status ?? props.activeLanguageLabel}</Badge></div> }
function ImportCodeDropdown({ onUpload, onOpenDialog }: { onUpload: () => void; onOpenDialog: (value: "files" | "snippets" | "runs" | "templates") => void }) { return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Import />Import<ChevronDown className="size-3" /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onSelect={onUpload}><Upload />Upload local file</DropdownMenuItem><DropdownMenuItem onSelect={() => onOpenDialog("files")}><FolderOpen />From my files</DropdownMenuItem><DropdownMenuItem onSelect={() => onOpenDialog("snippets")}><FileCode2 />From my snippets</DropdownMenuItem><DropdownMenuItem onSelect={() => onOpenDialog("runs")}><History />From recent runs</DropdownMenuItem><DropdownMenuItem onSelect={() => onOpenDialog("templates")}><Files />From templates</DropdownMenuItem></DropdownMenuContent></DropdownMenu> }
function ShareSnippetDropdown(props: { onCopyLink: () => void; onCopyCode: () => void; onCopyMarkdown: () => void; onCopySnippetLink: () => void }) { return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Share2 />Share</Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onSelect={props.onCopyLink}>Copy playground link</DropdownMenuItem><DropdownMenuItem onSelect={props.onCopyCode}>Copy code</DropdownMenuItem><DropdownMenuItem onSelect={props.onCopyMarkdown}>Copy markdown code block</DropdownMenuItem><DropdownMenuItem onSelect={() => toast.info("Будет добавлено позже")}>Send to AI assistant</DropdownMenuItem><DropdownMenuItem onSelect={props.onCopySnippetLink}>Share snippet link</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem disabled>Insert into publication</DropdownMenuItem><DropdownMenuItem disabled>Insert into question/answer</DropdownMenuItem><DropdownMenuItem disabled>Send to chat</DropdownMenuItem></DropdownMenuContent></DropdownMenu> }
function PlaygroundConsolePanel({ run, stdin, setStdin, consoleTab, setConsoleTab, isLoading, isExplaining, aiExplanation, aiSources, handleExplainCode }: { run: CodeRun | null; stdin: string; setStdin: (value: string) => void; consoleTab: string; setConsoleTab: (value: string) => void; isLoading: boolean; isExplaining: boolean; aiExplanation: string | null; aiSources: RagSource[]; handleExplainCode: () => void }) { const hasError = Boolean(run?.stderr || run?.message); return <Tabs value={consoleTab} onValueChange={setConsoleTab} className="flex h-full flex-col bg-zinc-950 text-zinc-100"><div className="flex items-center justify-between border-b border-white/10 px-3 py-2"><TabsList className="bg-white/5"><TabsTrigger value="console"><Terminal className="size-3.5" />Console</TabsTrigger><TabsTrigger value="errors" className={hasError ? "text-red-300" : undefined}>Errors{hasError ? <span className="ml-1 size-2 rounded-full bg-red-400" /> : null}</TabsTrigger><TabsTrigger value="input">Input</TabsTrigger><TabsTrigger value="ai">AI</TabsTrigger></TabsList>{run ? <Button asChild variant="ghost" size="sm" className="text-zinc-300"><Link href={`/playground/runs/${run.id}`}><ExternalLink className="size-4" />Run #{run.id}</Link></Button> : null}</div><TabsContent value="console" className="m-0 flex-1 overflow-auto p-4 font-mono text-sm"><pre className="whitespace-pre-wrap">{isLoading || ["queued", "running"].includes(run?.status ?? "") ? "Running..." : run?.stdout || "Run code to see stdout."}</pre>{run ? <p className="mt-4 whitespace-pre-line text-xs text-zinc-400">Program finished with exit code {run.exit_code ?? "—"}{"\n"}Time: {run.execution_time ?? 0} ms · Memory: {formatMemory(run.memory_usage)}</p> : null}</TabsContent><TabsContent value="errors" className="m-0 flex-1 overflow-auto p-4 font-mono text-sm text-red-100"><pre className="whitespace-pre-wrap">{run?.stderr || run?.message || "No errors."}</pre></TabsContent><TabsContent value="input" className="m-0 flex-1 p-3"><Textarea value={stdin} onChange={(event) => setStdin(event.target.value)} className="h-full min-h-0 resize-none border-white/10 bg-black/30 font-mono text-sm text-zinc-100" spellCheck={false} /></TabsContent><TabsContent value="ai" className="m-0 flex-1 overflow-auto p-4"><Button type="button" variant="secondary" onClick={handleExplainCode} disabled={isExplaining}>{isExplaining ? <Loader2 className="animate-spin" /> : <Bot />}{hasError ? "Explain error with AI" : "Explain result with AI"}</Button>{aiExplanation ? <div className="mt-4 space-y-4"><div className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/30 p-4 text-sm leading-6">{aiExplanation}</div>{aiSources.slice(0, 3).map((source) => <RagSourceCard key={source.id} source={source} />)}</div> : null}</TabsContent></Tabs> }
function SidePanel({ snippets, files, runs, snippetQ, setSnippetQ, snippetStatusFilter, setSnippetStatusFilter, onSnippet, onFile, onRun }: { snippets: CodeSnippet[]; files: UserFile[]; runs: CodeRun[]; snippetQ: string; setSnippetQ: (value: string) => void; snippetStatusFilter: string; setSnippetStatusFilter: (value: string) => void; onSnippet: (item: CodeSnippet) => void; onFile: (item: UserFile) => void; onRun: (item: CodeRun) => void }) { return <Card className="h-full shadow-sm"><CardHeader className="pb-3"><CardTitle>Workspace</CardTitle><CardDescription>Сниппеты, файлы и последние запуски.</CardDescription></CardHeader><CardContent><Tabs defaultValue="snippets"><TabsList className="grid w-full grid-cols-3"><TabsTrigger value="snippets">Snippets</TabsTrigger><TabsTrigger value="files">Files</TabsTrigger><TabsTrigger value="runs">Runs</TabsTrigger></TabsList><TabsContent value="snippets" className="space-y-3"><div className="grid gap-2"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={snippetQ} onChange={(event) => setSnippetQ(event.target.value)} placeholder="Поиск" className="pl-9" /></div><Select value={snippetStatusFilter} onValueChange={setSnippetStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Все</SelectItem><SelectItem value="draft">Черновики</SelectItem><SelectItem value="active">Активные</SelectItem><SelectItem value="archived">Архив</SelectItem></SelectContent></Select></div><CompactList items={snippets} empty="Сниппетов пока нет" onClick={(item) => onSnippet(item as CodeSnippet)} /></TabsContent><TabsContent value="files"><CompactList items={files} empty="Текстовые файлы не найдены" onClick={(item) => onFile(item as UserFile)} /></TabsContent><TabsContent value="runs"><CompactList items={runs} empty="Запусков пока нет" onClick={(item) => onRun(item as CodeRun)} /></TabsContent></Tabs></CardContent></Card> }
function CompactList({ items, empty, onClick }: { items: Array<CodeSnippet | UserFile | CodeRun>; empty: string; onClick: (item: CodeSnippet | UserFile | CodeRun) => void }) {
    if (!items.length) return <p className="py-6 text-sm text-muted-foreground">{empty}</p>
    return <div className="max-h-[560px] space-y-2 overflow-auto pr-1">{items.map((raw) => {
        const item = raw as CodeSnippet & UserFile & CodeRun
        const name = item.title ?? item.original_name ?? `Run #${item.id}`
        const badge = item.language ?? item.extension ?? item.status ?? "file"
        const preview = item.code ?? item.mime_type ?? item.stderr ?? item.stdout ?? "—"
        return <button key={item.id} type="button" onClick={() => onClick(raw)} className="w-full rounded-2xl border bg-background p-3 text-left transition hover:bg-muted/50"><div className="flex items-center justify-between gap-2"><span className="line-clamp-1 text-sm font-medium">{name}</span><Badge variant="outline">{badge}</Badge></div><p className="mt-2 line-clamp-2 font-mono text-xs text-muted-foreground">{preview}</p>{item.snippet_type ? <div className="mt-2 flex gap-1"><Badge variant="outline">{snippetTypeLabels[item.snippet_type] ?? item.snippet_type}</Badge><Badge variant={item.status === "draft" ? "secondary" : "outline"}>{snippetStatusLabels[item.status] ?? item.status}</Badge></div> : null}</button>
    })}</div>
}

function ImportFromUserFilesCommandDialog(props: { open: boolean; onOpenChange: (open: boolean) => void; files: UserFile[]; onSelect: (file: UserFile) => void }) { return <EntityDialog title="Import from my files" empty="Файлы не найдены" items={props.files} open={props.open} onOpenChange={props.onOpenChange} onSelect={props.onSelect} label={(item) => item.original_name} meta={(item) => item.mime_type ?? "text"} /> }
function ImportFromSnippetsCommandDialog(props: { open: boolean; onOpenChange: (open: boolean) => void; snippets: CodeSnippet[]; onSelect: (snippet: CodeSnippet) => void }) { return <EntityDialog title="Import from snippets" empty="Сниппеты не найдены" items={props.snippets} open={props.open} onOpenChange={props.onOpenChange} onSelect={props.onSelect} label={(item) => item.title} meta={(item) => item.language} /> }
function ImportFromRunsCommandDialog(props: { open: boolean; onOpenChange: (open: boolean) => void; runs: CodeRun[]; onSelect: (run: CodeRun) => void }) { return <EntityDialog title="Import from recent runs" empty="Запуски не найдены" items={props.runs} open={props.open} onOpenChange={props.onOpenChange} onSelect={props.onSelect} label={(item) => `Run #${item.id}`} meta={(item) => `${item.language} · ${item.status}`} /> }
function ImportFromTemplatesCommandDialog(props: { open: boolean; onOpenChange: (open: boolean) => void; templates: CodeTemplate[]; onSelect: (template: CodeTemplate) => void }) { return <EntityDialog title="Import from templates" empty="Шаблоны не найдены" items={props.templates} open={props.open} onOpenChange={props.onOpenChange} onSelect={props.onSelect} label={(item) => item.title} meta={(item) => item.language} /> }
function EntityDialog<T extends { id: number | string }>({ open, onOpenChange, items, onSelect, title, empty, label, meta }: { open: boolean; onOpenChange: (open: boolean) => void; items: T[]; onSelect: (item: T) => void; title: string; empty: string; label: (item: T) => string; meta: (item: T) => string }) { return <CommandDialog open={open} onOpenChange={onOpenChange} title={title}><Command><CommandInput placeholder={title} /><CommandList><CommandEmpty>{empty}</CommandEmpty><CommandGroup heading={title}>{items.map((item) => <CommandItem key={item.id} value={`${label(item)} ${meta(item)}`} onSelect={() => { onSelect(item); onOpenChange(false) }}><span className="line-clamp-1">{label(item)}</span><Badge variant="outline" className="ml-auto">{meta(item)}</Badge></CommandItem>)}</CommandGroup></CommandList></Command></CommandDialog> }
function formatMemory(value?: number | null) { if (!value) return "0 KB"; return value > 1024 ? `${(value / 1024).toFixed(1)} MB` : `${value} KB` }
