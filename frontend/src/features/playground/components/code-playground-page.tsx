"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Bot, Download, ExternalLink, FileCode2, Files, FolderOpen, History, Loader2, Play, Save, Terminal, Upload } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarShortcut, MenubarTrigger } from "@/components/ui/menubar"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getMyFiles, getMyRuns, getMySnippets, getPlaygroundLanguages, getRun, getSnippet, previewUserFile, runCode } from "@/features/playground/api"
import { MonacoCodeEditor } from "@/features/playground/components/monaco-code-editor"
import { explainCodeWithAi } from "@/features/ai-rag/api"
import type { CodeExplainIntent, RagSource } from "@/features/ai-rag/types"
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



export function CodePlaygroundPage() {
    const searchParams = useSearchParams()
    const [languages, setLanguages] = useState<PlaygroundLanguage[]>([])
    const [snippets, setSnippets] = useState<CodeSnippet[]>([])
    const [files, setFiles] = useState<UserFile[]>([])
    const [runs, setRuns] = useState<CodeRun[]>([])
    const [language, setLanguage] = useState("javascript")
    const [title, setTitle] = useState("Быстрый запуск кода")
    const [code, setCode] = useState(defaultCodeByLanguage.javascript)
    const [isCodeDirty, setIsCodeDirty] = useState(false)
    const [stdin, setStdin] = useState("Vektor")
    const [saveSnippet, setSaveSnippet] = useState(false)
    const [visibility, setVisibility] = useState<"private" | "public">("private")
    const [snippetType, setSnippetType] = useState<"snippet" | "template" | "solution" | "note">("snippet")
    const [snippetStatus, setSnippetStatus] = useState<"draft" | "active">("active")
    const [snippetQ] = useState("")
    const [snippetStatusFilter] = useState("all")
    const [run, setRun] = useState<CodeRun | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isExplaining, setIsExplaining] = useState(false)
    const [aiExplanation, setAiExplanation] = useState<string | null>(null)
    const [aiSources, setAiSources] = useState<RagSource[]>([])
    const [isBooting, setIsBooting] = useState(true)
    const [consoleTab, setConsoleTab] = useState("console")
    const [isTerminalVisible, setIsTerminalVisible] = useState(true)
    const [importDialog, setImportDialog] = useState<"files" | "snippets" | "runs" | "templates" | null>(null)
    const [currentSnippet, setCurrentSnippet] = useState<CodeSnippet | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const activeRunToastRef = useRef<string | number | null>(null)

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
                    updateRunToast(latest)
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

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (!(event.ctrlKey || event.metaKey)) return

            if (event.key === "Enter") {
                event.preventDefault()
                if (!isLoading && code.trim().length > 0) void handleRun()
            }

            if (event.key.toLowerCase() === "s") {
                event.preventDefault()
                setSaveSnippet(true)
                toast.success("Сниппет будет сохранён при следующем запуске")
            }

            if (event.key.toLowerCase() === "k") {
                event.preventDefault()
                setImportDialog("snippets")
            }
        }

        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading, code, language, stdin, title, saveSnippet, visibility, snippetType, snippetStatus])

    const activeLanguageLabel = useMemo(() => {
        return languages.find((item) => item.value === language)?.label ?? language
    }, [languages, language])

    const monacoLanguage = useMemo(() => {
        return languages.find((item) => item.value === language)?.monaco ?? language
    }, [languages, language])

    function handleLanguageChange(value: string) {
        const currentTemplate = defaultCodeByLanguage[language] ?? ""
        setLanguage(value)
        if (!isCodeDirty || code === currentTemplate) {
            setCode(defaultCodeByLanguage[value] ?? "")
            setIsCodeDirty(false)
        }
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
        setIsCodeDirty(false)
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

    function clearConsole() {
        setRun(null)
        setAiExplanation(null)
        setAiSources([])
        setConsoleTab("console")
    }

    function newFile() {
        loadDocument({ title: "Новый файл", code: defaultCodeByLanguage[language] ?? "", stdin: "" })
    }

    function markSnippetForSave() {
        setSaveSnippet(true)
        toast.success("Сниппет будет сохранён при следующем запуске")
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

    function clearConsole() {
        setRun(null)
        setAiExplanation(null)
        setAiSources([])
        setConsoleTab("console")
    }

    function newFile() {
        loadDocument({ title: "Новый файл", code: defaultCodeByLanguage[language] ?? "", stdin: "" })
    }

    function markSnippetForSave() {
        setSaveSnippet(true)
        toast.success("Сниппет будет сохранён при следующем запуске")
    }

    function loadSnippet(snippet: CodeSnippet) {
        setTitle(snippet.title)
        setLanguage(snippet.language)
        setCode(snippet.code)
        setIsCodeDirty(false)
        setStdin(snippet.stdin ?? "")
        setSaveSnippet(false)
        setVisibility(snippet.visibility)
        setSnippetType((snippet.snippet_type as "snippet" | "template" | "solution" | "note") ?? "snippet")
        setSnippetStatus(snippet.status === "draft" ? "draft" : "active")
        setRun(null)
        setAiExplanation(null)
        setAiSources([])
    }


    async function handleExplainCode(intent: CodeExplainIntent) {
        const currentRun = run
        const effectiveIntent: CodeExplainIntent = !currentRun && intent === "explain_result" ? "explain_code" : intent
        setIsExplaining(true)

        try {
            const response = await explainCodeWithAi({
                title,
                run_id: currentRun?.id,
                run_status: currentRun?.status ?? null,
                exit_code: currentRun?.exit_code ?? null,
                execution_time: currentRun?.execution_time ?? null,
                memory_usage: currentRun?.memory_usage ?? null,
                intent: effectiveIntent,
                backend_runner: "Laravel queue + Docker sandbox",
                backend_execution_note: "Код выполняется на backend через Laravel queue job и Docker sandbox. Browser не выполняет код напрямую.",
                language,
                code,
                stdin,
                stdout: currentRun?.stdout ?? null,
                stderr: currentRun?.stderr ?? null,
                query: intentQuery(effectiveIntent, currentRun),
            })
            setAiExplanation(response.answer)
            setAiSources(response.sources ?? [])
            toast.success("AI подготовил разбор")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Не удалось получить AI-разбор")
        } finally {
            setIsExplaining(false)
        }
    }

    function intentQuery(intent: CodeExplainIntent, currentRun: CodeRun | null) {
        const labels: Record<CodeExplainIntent, string> = {
            explain_code: "объясни код без результата запуска",
            explain_result: "объясни результат запуска кода",
            explain_error: "объясни ошибку запуска кода",
            find_bug: "найди проблему в коде",
            optimize: "оптимизируй код без изменения поведения",
            write_tests: "предложи тестовые входные данные",
        }

        return `${labels[intent]} ${currentRun?.status ?? "no_run"} ${currentRun?.stderr ?? currentRun?.stdout ?? ""}`
    }

    function updateRunToast(nextRun: CodeRun) {
        const toastId = activeRunToastRef.current
        if (!toastId) return

        if (["queued", "running"].includes(nextRun.status)) {
            toast.loading("Код отправлен в обработку", {
                id: toastId,
                description: "Запуск выполняется в Docker sandbox через очередь.",
                duration: Number.POSITIVE_INFINITY,
            })
            return
        }

        if (nextRun.status === "finished" && nextRun.exit_code === 0) {
            toast.success("Запуск завершён", { id: toastId, description: "Код успешно завершился в Docker sandbox.", duration: 5000 })
        } else if (nextRun.status === "finished") {
            toast.error("Запуск завершился с ошибкой", { id: toastId, description: `Exit code: ${nextRun.exit_code ?? "—"}`, duration: 5000 })
        } else {
            toast.error("Запуск не выполнен", { id: toastId, description: nextRun.message ?? nextRun.status, duration: 5000 })
        }

        activeRunToastRef.current = null
    }

    async function handleRun() {
        setIsLoading(true)
        setRun(null)

        if (activeRunToastRef.current) {
            toast.dismiss(activeRunToastRef.current)
            activeRunToastRef.current = null
        }

        const toastId = toast.loading("Код отправлен в обработку", {
            description: "Запуск выполняется в Docker sandbox через очередь.",
            duration: Number.POSITIVE_INFINITY,
        })
        activeRunToastRef.current = toastId

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

            updateRunToast(result)

            if (result.snippet) {
                setSnippets((items) => [result.snippet!, ...items.filter((item) => item.id !== result.snippet!.id)])
            }
        } catch (error) {
            activeRunToastRef.current = null
            toast.error(error instanceof Error ? error.message : "Не удалось выполнить код", { id: toastId, duration: 5000 })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            <section className="rounded-2xl border bg-card/80 p-2 shadow-sm backdrop-blur">
                <PlaygroundToolbar isLoading={isLoading} code={code} saveSnippet={saveSnippet} setSaveSnippet={setSaveSnippet} language={language} handleLanguageChange={handleLanguageChange} languages={languages} isBooting={isBooting} run={run} activeLanguageLabel={activeLanguageLabel} handleRun={handleRun} downloadCode={downloadCode} newFile={newFile} clearConsole={clearConsole} resetTemplate={() => handleLanguageChange(language)} markSnippetForSave={markSnippetForSave} isTerminalVisible={isTerminalVisible} toggleTerminal={() => setIsTerminalVisible((value) => !value)} onUpload={() => fileInputRef.current?.click()} onOpenDialog={setImportDialog} onCopyCode={() => copyText(code, "Код скопирован")} onCopyMarkdown={() => copyText(`\`\`\`${language}\n${code}\n\`\`\``, "Markdown-блок скопирован")} onCopyLink={() => copyText(window.location.href, "Ссылка скопирована")} onCopySnippetLink={() => currentSnippet?.visibility === "public" && currentSnippet.status === "active" ? copyText(`${window.location.origin}/playground?snippet=${currentSnippet.id}`, "Ссылка на сниппет скопирована") : toast.warning("Сниппет приватный. Сделайте его публичным для ссылки.")} title={title} onTitleChange={setTitle} stdin={stdin} aiExplanation={aiExplanation} aiSources={aiSources} isExplaining={isExplaining} onExplain={handleExplainCode} />
                <input ref={fileInputRef} type="file" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importLocalFile(file); event.currentTarget.value = "" }} />
            </section>

            <section className="min-h-[720px]">
                <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
                    <ResizablePanelGroup {...{ direction: "vertical" }}>
                        <ResizablePanel defaultSize={isTerminalVisible ? 68 : 100} minSize={40}>
                            <MonacoCodeEditor value={code} onChange={(value) => { setCode(value); setIsCodeDirty(true) }} language={monacoLanguage} height="100%" className="h-full rounded-none border-0" />
                        </ResizablePanel>
                        {isTerminalVisible ? <>
                            <ResizableHandle withHandle />
                            <ResizablePanel defaultSize={32} minSize={20}>
                                <PlaygroundConsolePanel run={run} stdin={stdin} setStdin={setStdin} consoleTab={consoleTab} setConsoleTab={setConsoleTab} isLoading={isLoading} />
                            </ResizablePanel>
                        </> : null}
                    </ResizablePanelGroup>
                </div>
            </section>

            <ImportFromUserFilesCommandDialog open={importDialog === "files"} onOpenChange={(open) => setImportDialog(open ? "files" : null)} files={files} onSelect={importUserFile} />
            <ImportFromSnippetsCommandDialog open={importDialog === "snippets"} onOpenChange={(open) => setImportDialog(open ? "snippets" : null)} snippets={snippets} onSelect={loadSnippet} />
            <ImportFromRunsCommandDialog open={importDialog === "runs"} onOpenChange={(open) => setImportDialog(open ? "runs" : null)} runs={runs} onSelect={(item) => loadDocument({ title: `Run #${item.id}`, language: item.language, code: item.code, stdin: item.stdin ?? "" })} />
            <ImportFromTemplatesCommandDialog open={importDialog === "templates"} onOpenChange={(open) => setImportDialog(open ? "templates" : null)} templates={localTemplates} onSelect={(item) => loadDocument({ title: item.title, language: item.language, code: item.code, stdin: item.stdin })} />


        </div>
    )
}


type ToolbarProps = { isLoading: boolean; code: string; saveSnippet: boolean; setSaveSnippet: (updater: (value: boolean) => boolean) => void; language: string; handleLanguageChange: (value: string) => void; languages: PlaygroundLanguage[]; isBooting: boolean; run: CodeRun | null; activeLanguageLabel: string; handleRun: () => void; downloadCode: () => void; newFile: () => void; clearConsole: () => void; resetTemplate: () => void; markSnippetForSave: () => void; isTerminalVisible: boolean; toggleTerminal: () => void; onUpload: () => void; onOpenDialog: (value: "files" | "snippets" | "runs" | "templates") => void; onCopyCode: () => void; onCopyMarkdown: () => void; onCopyLink: () => void; onCopySnippetLink: () => void; title: string; onTitleChange: (value: string) => void; stdin: string; aiExplanation: string | null; aiSources: RagSource[]; isExplaining: boolean; onExplain: (intent: CodeExplainIntent) => void }
function PlaygroundToolbar(props: ToolbarProps) {
    return <div className="flex w-full flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><Menubar className="bg-background/60"><MenubarMenu><MenubarTrigger>File</MenubarTrigger><MenubarContent><MenubarItem onSelect={props.newFile}>New file</MenubarItem><MenubarItem onSelect={props.onUpload}><Upload />Import local file</MenubarItem><MenubarItem onSelect={() => props.onOpenDialog("files")}><FolderOpen />Import from my files</MenubarItem><MenubarItem onSelect={() => props.onOpenDialog("snippets")}><FileCode2 />Import from snippets<MenubarShortcut>⌘K</MenubarShortcut></MenubarItem><MenubarItem onSelect={() => props.onOpenDialog("runs")}><History />Import from recent runs</MenubarItem><MenubarItem onSelect={() => props.onOpenDialog("templates")}><Files />Import from templates</MenubarItem><MenubarSeparator /><MenubarItem onSelect={props.markSnippetForSave}><Save />Save snippet<MenubarShortcut>⌘S</MenubarShortcut></MenubarItem><MenubarItem onSelect={props.downloadCode}><Download />Download script</MenubarItem></MenubarContent></MenubarMenu><MenubarMenu><MenubarTrigger>Run</MenubarTrigger><MenubarContent><MenubarItem onSelect={props.handleRun} disabled={props.isLoading || props.code.trim().length === 0}><Play />Run code<MenubarShortcut>⌘↵</MenubarShortcut></MenubarItem><MenubarItem onSelect={props.clearConsole}>Clear console</MenubarItem><MenubarItem onSelect={props.resetTemplate}>Reset template</MenubarItem></MenubarContent></MenubarMenu><MenubarMenu><MenubarTrigger>View</MenubarTrigger><MenubarContent><MenubarItem onSelect={() => props.onOpenDialog("snippets")}>Open snippets</MenubarItem><MenubarItem onSelect={() => props.onOpenDialog("files")}>Open files</MenubarItem><MenubarItem onSelect={() => props.onOpenDialog("runs")}>Open recent runs</MenubarItem><MenubarSeparator /><MenubarItem onSelect={props.toggleTerminal}>{props.isTerminalVisible ? "Hide terminal" : "Show terminal"}</MenubarItem></MenubarContent></MenubarMenu><MenubarMenu><MenubarTrigger>Share</MenubarTrigger><MenubarContent><MenubarItem onSelect={props.onCopyCode}>Copy code</MenubarItem><MenubarItem onSelect={props.onCopyMarkdown}>Copy markdown code block</MenubarItem><MenubarItem onSelect={props.onCopyLink}>Copy playground link</MenubarItem><MenubarItem onSelect={props.onCopySnippetLink}>Copy public snippet link</MenubarItem></MenubarContent></MenubarMenu><MenubarMenu><MenubarTrigger>AI</MenubarTrigger><MenubarContent><MenubarItem onSelect={() => props.onExplain("explain_result")}>Explain result</MenubarItem><MenubarItem onSelect={() => props.onExplain("explain_error")}>Explain error</MenubarItem><MenubarItem onSelect={() => props.onExplain("find_bug")}>Find bug</MenubarItem><MenubarItem onSelect={() => props.onExplain("optimize")}>Optimize code</MenubarItem><MenubarItem onSelect={() => props.onExplain("write_tests")}>Write tests</MenubarItem></MenubarContent></MenubarMenu></Menubar><Input value={props.title} onChange={(event) => props.onTitleChange(event.target.value)} aria-label="Название файла" className="h-8 w-48 border-0 bg-muted/50 text-sm shadow-none" /><Button onClick={props.handleRun} disabled={props.isLoading || props.code.trim().length === 0} size="sm">{props.isLoading ? <Loader2 className="animate-spin" /> : <Play />}Run</Button><Button type="button" variant={props.saveSnippet ? "default" : "outline"} size="sm" onClick={() => props.setSaveSnippet((value) => !value)}><Save />Save</Button><PlaygroundAiActionsPopover title={props.title} language={props.language} code={props.code} stdin={props.stdin} run={props.run} isExplaining={props.isExplaining} aiExplanation={props.aiExplanation} aiSources={props.aiSources} onExplain={props.onExplain} /></div><div className="flex items-center gap-2"><NativeSelect size="sm" value={props.language} onChange={(event) => props.handleLanguageChange(event.target.value)} disabled={props.isBooting || props.languages.length === 0} className="w-44">{props.languages.map((item) => <NativeSelectOption key={item.value} value={item.value}>{item.label}</NativeSelectOption>)}</NativeSelect></div></div>
}

function PlaygroundAiActionsPopover({ title, language, code, stdin, run, isExplaining, aiExplanation, aiSources, onExplain }: { title: string; language: string; code: string; stdin: string; run: CodeRun | null; isExplaining: boolean; aiExplanation: string | null; aiSources: RagSource[]; onExplain: (intent: CodeExplainIntent) => void }) {
    const isPending = run ? ["queued", "running"].includes(run.status) : false
    const hasError = Boolean(run?.stderr || (run?.exit_code !== null && run?.exit_code !== undefined && run.exit_code !== 0))
    return <Sheet><SheetTrigger asChild><Button type="button" variant="secondary" size="sm"><Bot />AI</Button></SheetTrigger><SheetContent side="right" className="w-full sm:max-w-xl"><SheetHeader><SheetTitle>AI-анализ кода</SheetTitle><SheetDescription>{!run ? "Запуска ещё нет. AI может разобрать код, но не результат выполнения." : isPending ? "Запуск ещё выполняется. Дождитесь результата для точного разбора." : "AI учтёт stdout/stderr, exit code, время и память."}</SheetDescription></SheetHeader><div className="space-y-4 overflow-auto px-6 pb-6">{hasError ? <Badge variant="destructive">Есть ошибка запуска</Badge> : null}<div className="grid grid-cols-2 gap-2"><Button variant="outline" size="sm" onClick={() => onExplain("explain_result")} disabled={isExplaining}><Bot />Explain result</Button><Button variant="outline" size="sm" onClick={() => onExplain("explain_error")} disabled={isExplaining}><Bot />Explain error</Button><Button variant="outline" size="sm" onClick={() => onExplain("find_bug")} disabled={isExplaining}>Find bug</Button><Button variant="outline" size="sm" onClick={() => onExplain("optimize")} disabled={isExplaining}>Optimize code</Button><Button variant="outline" size="sm" onClick={() => onExplain("write_tests")} disabled={isExplaining} className="col-span-2">Write tests</Button></div><div className="rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground"><div className="font-medium text-foreground">Контекст</div><div>{title} · {language} · stdin: {stdin ? "есть" : "нет"} · code: {code.length} симв.</div></div>{isExplaining ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />AI готовит ответ…</div> : null}{aiExplanation ? <div className="space-y-3"><div className="whitespace-pre-wrap rounded-xl border bg-background p-3 text-sm leading-6">{aiExplanation}</div>{aiSources.length ? <details className="rounded-xl border bg-muted/30 p-3"><summary className="cursor-pointer text-sm font-medium">Источники ({Math.min(aiSources.length, 3)})</summary><div className="mt-2 space-y-2">{aiSources.slice(0, 3).map((source) => <a key={source.id} href={source.href ?? "#"} className="block rounded-lg border bg-background p-2 text-sm hover:bg-muted"><span className="line-clamp-1 font-medium">{source.title}</span><span className="text-xs text-muted-foreground">{source.href ?? "Источник платформы"}</span></a>)}</div></details> : null}</div> : null}</div></SheetContent></Sheet>
}

function PlaygroundConsolePanel({ run, stdin, setStdin, consoleTab, setConsoleTab, isLoading }: { run: CodeRun | null; stdin: string; setStdin: (value: string) => void; consoleTab: string; setConsoleTab: (value: string) => void; isLoading: boolean }) { const hasError = Boolean(run?.stderr || run?.message); return <Tabs value={consoleTab} onValueChange={setConsoleTab} className="flex h-full flex-col bg-zinc-950 text-zinc-100"><div className="flex items-center justify-between border-b border-white/10 px-3 py-2"><TabsList className="bg-white/5"><TabsTrigger value="console"><Terminal className="size-3.5" />Console</TabsTrigger><TabsTrigger value="errors" className={hasError ? "text-red-300" : undefined}>Errors{hasError ? <span className="ml-1 size-2 rounded-full bg-red-400" /> : null}</TabsTrigger><TabsTrigger value="input">Input</TabsTrigger></TabsList>{run ? <Button asChild variant="ghost" size="sm" className="text-zinc-300"><Link href={`/playground/runs/${run.id}`}><ExternalLink className="size-4" />Run #{run.id}</Link></Button> : null}</div><TabsContent value="console" className="m-0 flex-1 overflow-auto p-4 font-mono text-sm"><pre className="whitespace-pre-wrap">{isLoading || ["queued", "running"].includes(run?.status ?? "") ? "Running..." : run?.stdout || "Run code to see stdout."}</pre>{run ? <p className="mt-4 whitespace-pre-line text-xs text-zinc-400">Program finished with exit code {run.exit_code ?? "—"}{"\n"}Time: {run.execution_time ?? 0} ms · Memory: {formatMemory(run.memory_usage)}</p> : null}</TabsContent><TabsContent value="errors" className="m-0 flex-1 overflow-auto p-4 font-mono text-sm text-red-100"><pre className="whitespace-pre-wrap">{run?.stderr || run?.message || "No errors."}</pre></TabsContent><TabsContent value="input" className="m-0 flex-1 p-3"><Textarea value={stdin} onChange={(event) => setStdin(event.target.value)} className="h-full min-h-0 resize-none border-white/10 bg-black/30 font-mono text-sm text-zinc-100" spellCheck={false} /></TabsContent></Tabs> }

function ImportFromUserFilesCommandDialog(props: { open: boolean; onOpenChange: (open: boolean) => void; files: UserFile[]; onSelect: (file: UserFile) => void }) { return <EntityDialog title="Import from my files" empty="Файлы не найдены" items={props.files} open={props.open} onOpenChange={props.onOpenChange} onSelect={props.onSelect} label={(item) => item.original_name} meta={(item) => item.mime_type ?? "text"} /> }
function ImportFromSnippetsCommandDialog(props: { open: boolean; onOpenChange: (open: boolean) => void; snippets: CodeSnippet[]; onSelect: (snippet: CodeSnippet) => void }) { return <EntityDialog title="Import from snippets" empty="Сниппеты не найдены" items={props.snippets} open={props.open} onOpenChange={props.onOpenChange} onSelect={props.onSelect} label={(item) => item.title} meta={(item) => item.language} /> }
function ImportFromRunsCommandDialog(props: { open: boolean; onOpenChange: (open: boolean) => void; runs: CodeRun[]; onSelect: (run: CodeRun) => void }) { return <EntityDialog title="Import from recent runs" empty="Запуски не найдены" items={props.runs} open={props.open} onOpenChange={props.onOpenChange} onSelect={props.onSelect} label={(item) => `Run #${item.id}`} meta={(item) => `${item.language} · ${item.status}`} /> }
function ImportFromTemplatesCommandDialog(props: { open: boolean; onOpenChange: (open: boolean) => void; templates: CodeTemplate[]; onSelect: (template: CodeTemplate) => void }) { return <EntityDialog title="Import from templates" empty="Шаблоны не найдены" items={props.templates} open={props.open} onOpenChange={props.onOpenChange} onSelect={props.onSelect} label={(item) => item.title} meta={(item) => item.language} /> }
function EntityDialog<T extends { id: number | string }>({ open, onOpenChange, items, onSelect, title, empty, label, meta }: { open: boolean; onOpenChange: (open: boolean) => void; items: T[]; onSelect: (item: T) => void; title: string; empty: string; label: (item: T) => string; meta: (item: T) => string }) { return <CommandDialog open={open} onOpenChange={onOpenChange} title={title}><Command><CommandInput placeholder={title} /><CommandList><CommandEmpty>{empty}</CommandEmpty><CommandGroup heading={title}>{items.map((item) => <CommandItem key={item.id} value={`${label(item)} ${meta(item)}`} onSelect={() => { onSelect(item); onOpenChange(false) }}><span className="line-clamp-1">{label(item)}</span><Badge variant="outline" className="ml-auto">{meta(item)}</Badge></CommandItem>)}</CommandGroup></CommandList></Command></CommandDialog> }
function formatMemory(value?: number | null) { if (!value) return "0 KB"; return value > 1024 ? `${(value / 1024).toFixed(1)} MB` : `${value} KB` }
