"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
    Bot,
    CheckCircle2,
    Clock3,
    Copy,
    Download,
    ExternalLink,
    FileCode2,
    FilePlus2,
    Files,
    FolderOpen,
    History,
    Loader2,
    Play,
    RotateCcw,
    Save,
    Terminal,
    Upload,
    XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import {
    Menubar,
    MenubarContent,
    MenubarItem,
    MenubarMenu,
    MenubarSeparator,
    MenubarShortcut,
    MenubarTrigger,
} from "@/components/ui/menubar"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { explainCodeWithAi } from "@/features/ai-rag/api"
import type { CodeExplainIntent, RagSource } from "@/features/ai-rag/types"
import {
    createSnippet,
    getMyFiles,
    getMyRuns,
    getMySnippets,
    getPlaygroundLanguages,
    getRun,
    getSnippet,
    previewUserFile,
    runCode,
    updateSnippet,
} from "@/features/playground/api"
import { MonacoCodeEditor } from "@/features/playground/components/monaco-code-editor"
import type { CodeRun, CodeSnippet, CodeTemplate, PlaygroundLanguage, UserFile } from "@/features/playground/types"

const defaultCodeByLanguage: Record<string, string> = {
    javascript: `const input = require('fs').readFileSync(0, 'utf8').trim();
console.log(input || 'Hello from Vektor Playground');`,
    python: `import sys
text = sys.stdin.read().strip()
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

const extensionByLanguage: Record<string, string> = {
    javascript: "js",
    typescript: "ts",
    python: "py",
    php: "php",
    cpp: "cpp",
    csharp: "cs",
    java: "java",
    go: "go",
    rust: "rs",
}

const languageByExtension: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    php: "php",
    cpp: "cpp",
    cc: "cpp",
    cxx: "cpp",
    hpp: "cpp",
    cs: "csharp",
    java: "java",
    go: "go",
    rs: "rust",
}

const localTemplates: CodeTemplate[] = ["javascript", "python", "php", "cpp", "csharp"].flatMap((language) => [
    {
        id: `${language}-hello`,
        title: "Hello World",
        language,
        code: defaultCodeByLanguage[language] ?? "",
        stdin: "Vektor",
    },
    {
        id: `${language}-stdin`,
        title: "Read STDIN",
        language,
        code: defaultCodeByLanguage[language] ?? "",
        stdin: "42",
    },
])

const pendingRunStatuses = ["queued", "running"]
const terminalRunStatuses = ["finished", "runtime_error", "compilation_error", "time_limit_error", "memory_limit_error"]

export function CodePlaygroundPage() {
    const searchParams = useSearchParams()
    const [languages, setLanguages] = useState<PlaygroundLanguage[]>([])
    const [snippets, setSnippets] = useState<CodeSnippet[]>([])
    const [files, setFiles] = useState<UserFile[]>([])
    const [runs, setRuns] = useState<CodeRun[]>([])
    const [language, setLanguage] = useState("javascript")
    const [title, setTitle] = useState("Быстрый запуск кода")
    const [code, setCode] = useState(defaultCodeByLanguage.javascript)
    const [isWorkspaceDirty, setIsWorkspaceDirty] = useState(false)
    const [stdin, setStdin] = useState("Vektor")
    const [visibility, setVisibility] = useState<"private" | "public">("private")
    const [snippetType, setSnippetType] = useState<"snippet" | "template" | "solution" | "note">("snippet")
    const [snippetStatus, setSnippetStatus] = useState<"draft" | "active">("active")
    const [snippetQ] = useState("")
    const [snippetStatusFilter] = useState("all")
    const [run, setRun] = useState<CodeRun | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isExplaining, setIsExplaining] = useState(false)
    const [aiExplanation, setAiExplanation] = useState<string | null>(null)
    const [aiSources, setAiSources] = useState<RagSource[]>([])
    const [isBooting, setIsBooting] = useState(true)
    const [consoleTab, setConsoleTab] = useState("output")
    const [isTerminalVisible, setIsTerminalVisible] = useState(true)
    const [importDialog, setImportDialog] = useState<"files" | "snippets" | "runs" | "templates" | null>(null)
    const [currentSnippet, setCurrentSnippet] = useState<CodeSnippet | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const activeRunToastRef = useRef<string | number | null>(null)

    useEffect(() => {
        let mounted = true

        Promise.allSettled([
            getPlaygroundLanguages(),
            getMySnippets({ status: snippetStatusFilter === "all" ? undefined : snippetStatusFilter, q: snippetQ || undefined }),
            getMyFiles({ kind: "text", per_page: 50 }),
            getMyRuns({ per_page: 30 }),
        ])
            .then(([languagesResult, snippetsResult, filesResult, runsResult]) => {
                if (!mounted) return

                if (languagesResult.status === "fulfilled") {
                    setLanguages(languagesResult.value)
                    if (languagesResult.value.length > 0 && !languagesResult.value.some((item) => item.value === language)) {
                        setLanguage(languagesResult.value[0].value)
                    }
                }

                if (snippetsResult.status === "fulfilled") setSnippets(snippetsResult.value)
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
        if (!run || !pendingRunStatuses.includes(run.status)) return

        let cancelled = false

        const interval = window.setInterval(() => {
            getRun(run.id)
                .then((latest) => {
                    if (cancelled) return
                    setRun(latest)
                    setRuns((items) => [latest, ...items.filter((item) => item.id !== latest.id)].slice(0, 30))
                    updateRunToast(latest)

                    if (terminalRunStatuses.includes(latest.status) || !pendingRunStatuses.includes(latest.status)) {
                        setConsoleTab(isRunFailed(latest) ? "errors" : "output")
                        window.clearInterval(interval)
                    }
                })
                .catch(() => null)
        }, 2200)

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
                void handleSaveSnippet()
            }

            if (event.key.toLowerCase() === "k") {
                event.preventDefault()
                setImportDialog("snippets")
            }
        }

        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading, isSaving, code, language, stdin, title, visibility, snippetType, snippetStatus, currentSnippet])

    const activeLanguageLabel = useMemo(() => {
        return languages.find((item) => item.value === language)?.label ?? language
    }, [languages, language])

    const monacoLanguage = useMemo(() => {
        return languages.find((item) => item.value === language)?.monaco ?? language
    }, [languages, language])

    function handleLanguageChange(value: string) {
        const currentTemplate = defaultCodeByLanguage[language] ?? ""
        setLanguage(value)
        if (!isWorkspaceDirty || code === currentTemplate) {
            setCode(defaultCodeByLanguage[value] ?? "")
        }
        setIsWorkspaceDirty(true)
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
        setIsWorkspaceDirty(false)
        if (next.stdin !== undefined) setStdin(next.stdin)
        setCurrentSnippet(null)
        setRun(null)
        setAiExplanation(null)
        setAiSources([])
        setConsoleTab("output")
    }

    async function importLocalFile(file: File) {
        try {
            loadDocument({ title: file.name.replace(/\.[^.]+$/, ""), language: detectLanguage(file.name, file.type), code: await file.text() })
            toast.success("Файл импортирован")
        } catch {
            toast.error("Не удалось прочитать файл")
        }
    }

    async function importUserFile(file: UserFile) {
        try {
            const preview = await previewUserFile(file.id)
            loadDocument({ title: file.original_name, language: detectLanguage(file.original_name, file.mime_type), code: preview.content ?? "" })
            if (preview.truncated) toast.warning("Файл был обрезан для предпросмотра")
            toast.success("Файл загружен из менеджера")
        } catch {
            toast.error("Не удалось импортировать файл")
        }
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
        setConsoleTab("output")
    }

    function newFile() {
        loadDocument({ title: "Новый файл", code: defaultCodeByLanguage[language] ?? "", stdin: "" })
    }

    function loadSnippet(snippet: CodeSnippet) {
        setTitle(snippet.title)
        setLanguage(snippet.language)
        setCode(snippet.code)
        setIsWorkspaceDirty(false)
        setStdin(snippet.stdin ?? "")
        setVisibility(snippet.visibility)
        setSnippetType((snippet.snippet_type as "snippet" | "template" | "solution" | "note") ?? "snippet")
        setSnippetStatus(snippet.status === "draft" ? "draft" : "active")
        setCurrentSnippet(snippet)
        setRun(null)
        setAiExplanation(null)
        setAiSources([])
        setConsoleTab("output")
    }

    async function handleSaveSnippet() {
        if (code.trim().length === 0) {
            toast.warning("Добавьте код перед сохранением")
            return
        }

        setIsSaving(true)
        try {
            const payload = {
                title: title.trim() || "Без названия",
                language,
                code,
                stdin,
                visibility,
                snippet_type: snippetType,
                status: snippetStatus,
            }

            const saved = currentSnippet ? await updateSnippet(currentSnippet.id, payload) : await createSnippet(payload)
            setCurrentSnippet(saved)
            setSnippets((items) => [saved, ...items.filter((item) => item.id !== saved.id)])
            setIsWorkspaceDirty(false)
            toast.success("Сниппет сохранён")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Не удалось сохранить сниппет")
        } finally {
            setIsSaving(false)
        }
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

        if (pendingRunStatuses.includes(nextRun.status)) {
            toast.loading(statusLabel(nextRun.status), {
                id: toastId,
                description: "Запуск выполняется в Docker sandbox через очередь.",
                duration: Number.POSITIVE_INFINITY,
            })
            return
        }

        if (!isRunFailed(nextRun)) {
            toast.success("Запуск завершён", { id: toastId, description: "Код успешно завершился.", duration: 5000 })
        } else {
            toast.error("Запуск завершился с ошибкой", { id: toastId, description: nextRun.message ?? `Exit code: ${nextRun.exit_code ?? "—"}`, duration: 5000 })
        }

        activeRunToastRef.current = null
    }

    async function handleRun() {
        if (code.trim().length === 0) {
            toast.warning("Добавьте код перед запуском")
            return
        }

        setIsLoading(true)
        setRun(null)
        setConsoleTab("output")

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
                save: false,
                title,
                visibility,
                snippet_type: snippetType,
                snippet_status: snippetStatus,
                snippet_id: currentSnippet?.id,
            })
            setRun(result)
            setRuns((items) => [result, ...items.filter((item) => item.id !== result.id)].slice(0, 30))
            updateRunToast(result)

            if (result.snippet) {
                setCurrentSnippet(result.snippet)
                setSnippets((items) => [result.snippet!, ...items.filter((item) => item.id !== result.snippet!.id)])
                setIsWorkspaceDirty(false)
            }

            setConsoleTab(isRunFailed(result) ? "errors" : "output")
        } catch (error) {
            activeRunToastRef.current = null
            toast.error(error instanceof Error ? error.message : "Не удалось выполнить код", { id: toastId, duration: 5000 })
            setConsoleTab("errors")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            <section className="overflow-hidden rounded-2xl border bg-card/90 shadow-sm backdrop-blur">
                <PlaygroundToolbar
                    isLoading={isLoading}
                    isSaving={isSaving}
                    code={code}
                    language={language}
                    handleLanguageChange={handleLanguageChange}
                    languages={languages}
                    isBooting={isBooting}
                    run={run}
                    activeLanguageLabel={activeLanguageLabel}
                    handleRun={handleRun}
                    handleSave={handleSaveSnippet}
                    downloadCode={downloadCode}
                    newFile={newFile}
                    clearConsole={clearConsole}
                    resetTemplate={() => handleLanguageChange(language)}
                    isTerminalVisible={isTerminalVisible}
                    toggleTerminal={() => setIsTerminalVisible((value) => !value)}
                    onUpload={() => fileInputRef.current?.click()}
                    onOpenDialog={setImportDialog}
                    onCopyCode={() => copyText(code, "Код скопирован")}
                    onCopyMarkdown={() => copyText(`\`\`\`${language}\n${code}\n\`\`\``, "Markdown-блок скопирован")}
                    onCopyLink={() => copyText(window.location.href, "Ссылка скопирована")}
                    onCopySnippetLink={() =>
                        currentSnippet?.visibility === "public" && currentSnippet.status === "active"
                            ? copyText(`${window.location.origin}/playground?snippet=${currentSnippet.id}`, "Ссылка на сниппет скопирована")
                            : toast.warning("Сниппет приватный. Сделайте его публичным для ссылки.")
                    }
                    title={title}
                    onTitleChange={(value) => {
                        setTitle(value)
                        setIsWorkspaceDirty(true)
                    }}
                    stdin={stdin}
                    aiExplanation={aiExplanation}
                    aiSources={aiSources}
                    isExplaining={isExplaining}
                    onExplain={handleExplainCode}
                    visibility={visibility}
                    onVisibilityChange={setVisibility}
                    snippetStatus={snippetStatus}
                    onSnippetStatusChange={setSnippetStatus}
                    snippetType={snippetType}
                    onSnippetTypeChange={setSnippetType}
                    currentSnippet={currentSnippet}
                    isWorkspaceDirty={isWorkspaceDirty}
                />
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) void importLocalFile(file)
                        event.currentTarget.value = ""
                    }}
                />
            </section>

            <section className="h-[calc(100vh-16rem)] min-h-[680px] overflow-hidden rounded-2xl border bg-card/95 shadow-sm backdrop-blur">
                <div className="flex h-11 items-center justify-between border-b bg-muted/20 px-4 text-xs text-muted-foreground">
                    <div className="flex min-w-0 items-center gap-2">
                        <FileCode2 className="size-4 text-emerald-400" />
                        <span className="truncate font-medium text-foreground">{displayFileName(title, language)}</span>
                        {isWorkspaceDirty ? <Badge variant="outline">есть изменения</Badge> : null}
                    </div>
                    <div className="hidden items-center gap-2 md:flex">
                        <Badge variant="outline">{activeLanguageLabel}</Badge>
                        <Badge variant={run ? statusBadgeVariant(run) : "outline"}>{run ? statusLabel(run.status, run) : "готово"}</Badge>
                    </div>
                </div>

                <ResizablePanelGroup {...{ direction: "vertical" }}>
                    <ResizablePanel defaultSize={isTerminalVisible ? 68 : 100} minSize={45}>
                        <MonacoCodeEditor
                            value={code}
                            onChange={(value) => {
                                setCode(value)
                                setIsWorkspaceDirty(true)
                            }}
                            language={monacoLanguage}
                            height="100%"
                            className="h-full rounded-none border-0"
                        />
                    </ResizablePanel>
                    {isTerminalVisible ? (
                        <>
                            <ResizableHandle withHandle />
                            <ResizablePanel defaultSize={32} minSize={22}>
                                <PlaygroundConsolePanel
                                    run={run}
                                    runs={runs}
                                    stdin={stdin}
                                    setStdin={(value) => {
                                        setStdin(value)
                                        setIsWorkspaceDirty(true)
                                    }}
                                    consoleTab={consoleTab}
                                    setConsoleTab={setConsoleTab}
                                    isLoading={isLoading}
                                    onLoadRun={(item) => loadDocument({ title: `Run #${item.id}`, language: item.language, code: item.code, stdin: item.stdin ?? "" })}
                                />
                            </ResizablePanel>
                        </>
                    ) : null}
                </ResizablePanelGroup>
            </section>

            <ImportFromUserFilesCommandDialog open={importDialog === "files"} onOpenChange={(open) => setImportDialog(open ? "files" : null)} files={files} onSelect={importUserFile} />
            <ImportFromSnippetsCommandDialog open={importDialog === "snippets"} onOpenChange={(open) => setImportDialog(open ? "snippets" : null)} snippets={snippets} onSelect={loadSnippet} />
            <ImportFromRunsCommandDialog open={importDialog === "runs"} onOpenChange={(open) => setImportDialog(open ? "runs" : null)} runs={runs} onSelect={(item) => loadDocument({ title: `Run #${item.id}`, language: item.language, code: item.code, stdin: item.stdin ?? "" })} />
            <ImportFromTemplatesCommandDialog open={importDialog === "templates"} onOpenChange={(open) => setImportDialog(open ? "templates" : null)} templates={localTemplates} onSelect={(item) => loadDocument({ title: item.title, language: item.language, code: item.code, stdin: item.stdin })} />
        </div>
    )
}

type ToolbarProps = {
    isLoading: boolean
    isSaving: boolean
    code: string
    language: string
    handleLanguageChange: (value: string) => void
    languages: PlaygroundLanguage[]
    isBooting: boolean
    run: CodeRun | null
    activeLanguageLabel: string
    handleRun: () => void
    handleSave: () => void
    downloadCode: () => void
    newFile: () => void
    clearConsole: () => void
    resetTemplate: () => void
    isTerminalVisible: boolean
    toggleTerminal: () => void
    onUpload: () => void
    onOpenDialog: (value: "files" | "snippets" | "runs" | "templates") => void
    onCopyCode: () => void
    onCopyMarkdown: () => void
    onCopyLink: () => void
    onCopySnippetLink: () => void
    title: string
    onTitleChange: (value: string) => void
    stdin: string
    aiExplanation: string | null
    aiSources: RagSource[]
    isExplaining: boolean
    onExplain: (intent: CodeExplainIntent) => void
    visibility: "private" | "public"
    onVisibilityChange: (value: "private" | "public") => void
    snippetStatus: "draft" | "active"
    onSnippetStatusChange: (value: "draft" | "active") => void
    snippetType: "snippet" | "template" | "solution" | "note"
    onSnippetTypeChange: (value: "snippet" | "template" | "solution" | "note") => void
    currentSnippet: CodeSnippet | null
    isWorkspaceDirty: boolean
}

function PlaygroundToolbar(props: ToolbarProps) {
    const isRunPending = props.run ? pendingRunStatuses.includes(props.run.status) : false

    return (
        <div className="space-y-4 p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
                    <Menubar className="w-max max-w-full border bg-background/60">
                        <MenubarMenu>
                            <MenubarTrigger>Файл</MenubarTrigger>
                            <MenubarContent>
                                <MenubarItem onSelect={props.newFile}><FilePlus2 />Новый workspace</MenubarItem>
                                <MenubarItem onSelect={props.onUpload}><Upload />Импорт локального файла</MenubarItem>
                                <MenubarItem onSelect={() => props.onOpenDialog("files")}><FolderOpen />Из моих файлов</MenubarItem>
                                <MenubarItem onSelect={() => props.onOpenDialog("snippets")}><FileCode2 />Из сниппетов<MenubarShortcut>⌘K</MenubarShortcut></MenubarItem>
                                <MenubarItem onSelect={() => props.onOpenDialog("runs")}><History />Из истории запусков</MenubarItem>
                                <MenubarItem onSelect={() => props.onOpenDialog("templates")}><Files />Из шаблонов</MenubarItem>
                                <MenubarSeparator />
                                <MenubarItem onSelect={props.handleSave}><Save />Сохранить<MenubarShortcut>⌘S</MenubarShortcut></MenubarItem>
                                <MenubarItem onSelect={props.downloadCode}><Download />Скачать файл</MenubarItem>
                            </MenubarContent>
                        </MenubarMenu>
                        <MenubarMenu>
                            <MenubarTrigger>Запуск</MenubarTrigger>
                            <MenubarContent>
                                <MenubarItem onSelect={props.handleRun} disabled={props.isLoading || props.code.trim().length === 0}><Play />Запустить<MenubarShortcut>⌘↵</MenubarShortcut></MenubarItem>
                                <MenubarItem onSelect={props.clearConsole}>Очистить консоль</MenubarItem>
                                <MenubarItem onSelect={props.resetTemplate}><RotateCcw />Вернуть шаблон языка</MenubarItem>
                            </MenubarContent>
                        </MenubarMenu>
                        <MenubarMenu>
                            <MenubarTrigger>Вид</MenubarTrigger>
                            <MenubarContent>
                                <MenubarItem onSelect={() => props.onOpenDialog("snippets")}>Открыть сниппеты</MenubarItem>
                                <MenubarItem onSelect={() => props.onOpenDialog("files")}>Открыть файлы</MenubarItem>
                                <MenubarItem onSelect={() => props.onOpenDialog("runs")}>Открыть запуски</MenubarItem>
                                <MenubarSeparator />
                                <MenubarItem onSelect={props.toggleTerminal}>{props.isTerminalVisible ? "Скрыть нижнюю панель" : "Показать нижнюю панель"}</MenubarItem>
                            </MenubarContent>
                        </MenubarMenu>
                        <MenubarMenu>
                            <MenubarTrigger>Поделиться</MenubarTrigger>
                            <MenubarContent>
                                <MenubarItem onSelect={props.onCopyCode}><Copy />Копировать код</MenubarItem>
                                <MenubarItem onSelect={props.onCopyMarkdown}>Копировать Markdown-блок</MenubarItem>
                                <MenubarItem onSelect={props.onCopyLink}>Копировать ссылку на страницу</MenubarItem>
                                <MenubarItem onSelect={props.onCopySnippetLink}>Копировать публичную ссылку</MenubarItem>
                            </MenubarContent>
                        </MenubarMenu>
                    </Menubar>

                    <Input
                        value={props.title}
                        onChange={(event) => props.onTitleChange(event.target.value)}
                        aria-label="Название workspace"
                        className="h-10 min-w-0 flex-1 bg-muted/40 text-sm shadow-none lg:max-w-xl"
                        placeholder="Название workspace"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    <NativeSelect
                        size="sm"
                        value={props.language}
                        onChange={(event) => props.handleLanguageChange(event.target.value)}
                        disabled={props.isBooting || props.languages.length === 0}
                        className="h-10 min-w-40"
                    >
                        {props.languages.map((item) => (
                            <NativeSelectOption key={item.value} value={item.value}>{item.label}</NativeSelectOption>
                        ))}
                    </NativeSelect>
                    <Button type="button" variant="outline" size="sm" className="h-10" onClick={props.handleSave} disabled={props.isSaving || props.code.trim().length === 0}>
                        {props.isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                        Сохранить
                    </Button>
                    <PlaygroundAiActionsPopover title={props.title} language={props.language} code={props.code} stdin={props.stdin} run={props.run} isExplaining={props.isExplaining} aiExplanation={props.aiExplanation} aiSources={props.aiSources} onExplain={props.onExplain} />
                    <Button onClick={props.handleRun} disabled={props.isLoading || props.code.trim().length === 0} className="h-10" size="sm">
                        {props.isLoading || isRunPending ? <Loader2 className="animate-spin" /> : <Play />}
                        Запустить
                    </Button>
                </div>
            </div>

            <div className="grid gap-3 border-t pt-3 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={props.currentSnippet ? "secondary" : "outline"}>{props.currentSnippet ? `сниппет #${props.currentSnippet.id}` : "новый workspace"}</Badge>
                    <Badge variant={props.isWorkspaceDirty ? "outline" : "secondary"}>{props.isWorkspaceDirty ? "есть изменения" : "сохранено"}</Badge>
                    <Badge variant="outline">{visibilityLabel(props.visibility)}</Badge>
                    <Badge variant="outline">{statusLabelForSnippet(props.snippetStatus)}</Badge>
                    <Badge variant="outline">{props.activeLanguageLabel}</Badge>
                    {props.run ? <Badge variant={statusBadgeVariant(props.run)}>{statusLabel(props.run.status, props.run)}</Badge> : null}
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <NativeSelect
                        size="sm"
                        value={props.visibility}
                        onChange={(event) => props.onVisibilityChange(event.target.value as "private" | "public")}
                        className="h-8 min-w-32 text-xs"
                    >
                        <NativeSelectOption value="private">Приватный</NativeSelectOption>
                        <NativeSelectOption value="public">Публичный</NativeSelectOption>
                    </NativeSelect>
                    <NativeSelect
                        size="sm"
                        value={props.snippetStatus}
                        onChange={(event) => props.onSnippetStatusChange(event.target.value as "draft" | "active")}
                        className="h-8 min-w-28 text-xs"
                    >
                        <NativeSelectOption value="active">Активный</NativeSelectOption>
                        <NativeSelectOption value="draft">Черновик</NativeSelectOption>
                    </NativeSelect>
                    <NativeSelect
                        size="sm"
                        value={props.snippetType}
                        onChange={(event) => props.onSnippetTypeChange(event.target.value as "snippet" | "template" | "solution" | "note")}
                        className="h-8 min-w-32 text-xs"
                    >
                        <NativeSelectOption value="snippet">Сниппет</NativeSelectOption>
                        <NativeSelectOption value="template">Шаблон</NativeSelectOption>
                        <NativeSelectOption value="solution">Решение</NativeSelectOption>
                        <NativeSelectOption value="note">Заметка</NativeSelectOption>
                    </NativeSelect>
                </div>
            </div>
        </div>
    )
}

function PlaygroundAiActionsPopover({ title, language, code, stdin, run, isExplaining, aiExplanation, aiSources, onExplain }: { title: string; language: string; code: string; stdin: string; run: CodeRun | null; isExplaining: boolean; aiExplanation: string | null; aiSources: RagSource[]; onExplain: (intent: CodeExplainIntent) => void }) {
    const isPending = run ? pendingRunStatuses.includes(run.status) : false
    const hasError = Boolean(run && isRunFailed(run))

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button type="button" variant="secondary" size="sm" className="h-10"><Bot />AI</Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-xl">
                <SheetHeader>
                    <SheetTitle>AI-анализ кода</SheetTitle>
                    <SheetDescription>
                        {!run ? "Запуска ещё нет. AI может разобрать код, но не результат выполнения." : isPending ? "Запуск ещё выполняется. Дождитесь результата для точного разбора." : "AI учтёт stdout/stderr, exit code, время и память."}
                    </SheetDescription>
                </SheetHeader>
                <div className="space-y-4 overflow-auto px-6 pb-6">
                    {hasError ? <Badge variant="destructive">Есть ошибка запуска</Badge> : null}
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" onClick={() => onExplain("explain_result")} disabled={isExplaining}><Bot />Объяснить результат</Button>
                        <Button variant="outline" size="sm" onClick={() => onExplain("explain_error")} disabled={isExplaining}><XCircle />Объяснить ошибку</Button>
                        <Button variant="outline" size="sm" onClick={() => onExplain("find_bug")} disabled={isExplaining}>Найти баг</Button>
                        <Button variant="outline" size="sm" onClick={() => onExplain("optimize")} disabled={isExplaining}>Оптимизировать</Button>
                        <Button variant="outline" size="sm" onClick={() => onExplain("write_tests")} disabled={isExplaining} className="col-span-2">Предложить тесты</Button>
                    </div>
                    <div className="rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
                        <div className="font-medium text-foreground">Контекст</div>
                        <div>{title} · {language} · stdin: {stdin ? "есть" : "нет"} · code: {code.length} симв.</div>
                    </div>
                    {isExplaining ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />AI готовит ответ…</div> : null}
                    {aiExplanation ? (
                        <div className="space-y-3">
                            <div className="whitespace-pre-wrap rounded-xl border bg-background p-3 text-sm leading-6">{aiExplanation}</div>
                            {aiSources.length ? (
                                <details className="rounded-xl border bg-muted/30 p-3">
                                    <summary className="cursor-pointer text-sm font-medium">Источники ({Math.min(aiSources.length, 3)})</summary>
                                    <div className="mt-2 space-y-2">
                                        {aiSources.slice(0, 3).map((source) => (
                                            <a key={source.id} href={source.href ?? "#"} className="block rounded-lg border bg-background p-2 text-sm hover:bg-muted">
                                                <span className="line-clamp-1 font-medium">{source.title}</span>
                                                <span className="text-xs text-muted-foreground">{source.href ?? "Источник платформы"}</span>
                                            </a>
                                        ))}
                                    </div>
                                </details>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </SheetContent>
        </Sheet>
    )
}

function PlaygroundConsolePanel({ run, runs, stdin, setStdin, consoleTab, setConsoleTab, isLoading, onLoadRun }: { run: CodeRun | null; runs: CodeRun[]; stdin: string; setStdin: (value: string) => void; consoleTab: string; setConsoleTab: (value: string) => void; isLoading: boolean; onLoadRun: (run: CodeRun) => void }) {
    const hasError = Boolean(run && isRunFailed(run))
    const isPending = Boolean(run && pendingRunStatuses.includes(run.status))

    return (
        <Tabs value={consoleTab} onValueChange={setConsoleTab} className="flex h-full flex-col bg-zinc-950 text-zinc-100">
            <div className="flex flex-col gap-3 border-b border-white/10 px-3 py-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300">
                    <Badge variant="outline" className="border-white/10 bg-white/5 text-zinc-100">{run ? statusLabel(run.status, run) : "Нет запуска"}</Badge>
                    {run ? <Badge variant="outline" className="border-white/10 bg-white/5 text-zinc-100">exit: {run.exit_code ?? "—"}</Badge> : null}
                    {run ? <Badge variant="outline" className="border-white/10 bg-white/5 text-zinc-100">{run.execution_time ?? 0} ms</Badge> : null}
                    {run ? <Badge variant="outline" className="border-white/10 bg-white/5 text-zinc-100">{formatMemory(run.memory_usage)}</Badge> : null}
                    {run ? <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-zinc-300"><Link href={`/playground/runs/${run.id}`}><ExternalLink className="size-4" />Run #{run.id}</Link></Button> : null}
                </div>
                <TabsList className="h-auto flex-wrap justify-start gap-1 bg-white/5 p-1">
                    <TabsTrigger value="output"><Terminal className="mr-1 size-3.5" />Вывод</TabsTrigger>
                    <TabsTrigger value="errors" className={hasError ? "text-red-300" : undefined}>Ошибки{hasError ? <span className="ml-1 size-2 rounded-full bg-red-400" /> : null}</TabsTrigger>
                    <TabsTrigger value="input">STDIN</TabsTrigger>
                    <TabsTrigger value="runs"><History className="mr-1 size-3.5" />История</TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="output" className="m-0 flex-1 overflow-auto p-4 font-mono text-sm">
                <pre className="whitespace-pre-wrap">{isLoading || isPending ? "Запуск выполняется..." : run?.stdout?.trim() ? run.stdout : "Запустите код, чтобы увидеть stdout."}</pre>
            </TabsContent>

            <TabsContent value="errors" className="m-0 flex-1 overflow-auto p-4 font-mono text-sm text-red-100">
                <pre className="whitespace-pre-wrap">{errorText(run)}</pre>
            </TabsContent>

            <TabsContent value="input" className="m-0 flex-1 p-3">
                <Textarea
                    value={stdin}
                    onChange={(event) => setStdin(event.target.value)}
                    className="h-full min-h-0 resize-none border-white/10 bg-black/30 font-mono text-sm text-zinc-100"
                    spellCheck={false}
                    placeholder="Введите данные, которые программа получит через stdin"
                />
            </TabsContent>

            <TabsContent value="runs" className="m-0 flex-1 overflow-auto p-3">
                {runs.length === 0 ? (
                    <div className="flex h-full items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-sm text-zinc-400">История запусков пока пустая.</div>
                ) : (
                    <div className="space-y-2">
                        {runs.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => onLoadRun(item)}
                                className="flex w-full flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left transition hover:bg-white/[0.06] md:flex-row md:items-center md:justify-between"
                            >
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-zinc-100">
                                        <span>Run #{item.id}</span>
                                        <span className="text-zinc-500">·</span>
                                        <span>{item.language}</span>
                                        <RunStatusIcon run={item} />
                                    </div>
                                    <div className="mt-1 line-clamp-1 text-xs text-zinc-400">{item.message ?? item.stdout ?? item.stderr ?? "Без вывода"}</div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                                    <Badge variant="outline" className="border-white/10 bg-white/5 text-zinc-100">{statusLabel(item.status, item)}</Badge>
                                    <span>{item.execution_time ?? 0} ms</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </TabsContent>
        </Tabs>
    )
}

function RunStatusIcon({ run }: { run: CodeRun }) {
    if (pendingRunStatuses.includes(run.status)) return <Clock3 className="size-4 text-amber-300" />
    if (isRunFailed(run)) return <XCircle className="size-4 text-red-400" />
    return <CheckCircle2 className="size-4 text-emerald-400" />
}

function ImportFromUserFilesCommandDialog(props: { open: boolean; onOpenChange: (open: boolean) => void; files: UserFile[]; onSelect: (file: UserFile) => void }) {
    return <EntityDialog title="Импорт из моих файлов" empty="Файлы не найдены" items={props.files} open={props.open} onOpenChange={props.onOpenChange} onSelect={props.onSelect} label={(item) => item.original_name} meta={(item) => item.mime_type ?? "text"} />
}

function ImportFromSnippetsCommandDialog(props: { open: boolean; onOpenChange: (open: boolean) => void; snippets: CodeSnippet[]; onSelect: (snippet: CodeSnippet) => void }) {
    return <EntityDialog title="Импорт из сниппетов" empty="Сниппеты не найдены" items={props.snippets} open={props.open} onOpenChange={props.onOpenChange} onSelect={props.onSelect} label={(item) => item.title} meta={(item) => item.language} />
}

function ImportFromRunsCommandDialog(props: { open: boolean; onOpenChange: (open: boolean) => void; runs: CodeRun[]; onSelect: (run: CodeRun) => void }) {
    return <EntityDialog title="Импорт из истории запусков" empty="Запуски не найдены" items={props.runs} open={props.open} onOpenChange={props.onOpenChange} onSelect={props.onSelect} label={(item) => `Run #${item.id}`} meta={(item) => `${item.language} · ${statusLabel(item.status, item)}`} />
}

function ImportFromTemplatesCommandDialog(props: { open: boolean; onOpenChange: (open: boolean) => void; templates: CodeTemplate[]; onSelect: (template: CodeTemplate) => void }) {
    return <EntityDialog title="Импорт из шаблонов" empty="Шаблоны не найдены" items={props.templates} open={props.open} onOpenChange={props.onOpenChange} onSelect={props.onSelect} label={(item) => item.title} meta={(item) => item.language} />
}

function EntityDialog<T extends { id: number | string }>({ open, onOpenChange, items, onSelect, title, empty, label, meta }: { open: boolean; onOpenChange: (open: boolean) => void; items: T[]; onSelect: (item: T) => void; title: string; empty: string; label: (item: T) => string; meta: (item: T) => string }) {
    return (
        <CommandDialog open={open} onOpenChange={onOpenChange} title={title}>
            <Command>
                <CommandInput placeholder={title} />
                <CommandList>
                    <CommandEmpty>{empty}</CommandEmpty>
                    <CommandGroup heading={title}>
                        {items.map((item) => (
                            <CommandItem key={item.id} value={`${label(item)} ${meta(item)}`} onSelect={() => { onSelect(item); onOpenChange(false) }}>
                                <span className="line-clamp-1">{label(item)}</span>
                                <Badge variant="outline" className="ml-auto">{meta(item)}</Badge>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </Command>
        </CommandDialog>
    )
}

function statusLabel(status: string, run?: CodeRun | null) {
    if (status === "queued") return "В очереди"
    if (status === "running") return "Выполняется"
    if (status === "finished" && (run?.exit_code ?? 0) === 0) return "Успешно"
    if (status === "finished") return "С ошибкой"
    if (status === "runtime_error") return "Runtime error"
    if (status === "compilation_error") return "Ошибка компиляции"
    if (status === "time_limit_error") return "Превышено время"
    if (status === "memory_limit_error") return "Превышена память"
    return status
}

function statusBadgeVariant(run: CodeRun): "default" | "secondary" | "destructive" | "outline" {
    if (pendingRunStatuses.includes(run.status)) return "secondary"
    if (isRunFailed(run)) return "destructive"
    return "default"
}

function isRunFailed(run: CodeRun) {
    return Boolean(run.stderr?.trim() || (run.status === "finished" && (run.exit_code ?? 0) !== 0) || (run.status && !["finished", "queued", "running"].includes(run.status)))
}

function errorText(run: CodeRun | null) {
    if (!run) return "Запуска ещё не было. Ошибки появятся здесь после выполнения."
    if (pendingRunStatuses.includes(run.status)) return "Запуск ещё выполняется."
    if (run.stderr?.trim()) return run.stderr
    if (run.status === "finished" && (run.exit_code ?? 0) !== 0) return `Программа завершилась с кодом ${run.exit_code ?? "—"}.`
    if (run.status && !["finished", "queued", "running"].includes(run.status)) return run.message || statusLabel(run.status, run)
    return "Ошибок нет."
}

function formatMemory(value?: number | null) {
    if (!value) return "0 KB"
    return value > 1024 ? `${(value / 1024).toFixed(1)} MB` : `${value} KB`
}

function displayFileName(title: string, language: string) {
    const extension = extensionByLanguage[language] ?? "txt"
    const cleanTitle = title.trim() || "playground"
    return cleanTitle.includes(".") ? cleanTitle : `${cleanTitle}.${extension}`
}

function visibilityLabel(value: "private" | "public") {
    return value === "public" ? "публичный" : "приватный"
}

function statusLabelForSnippet(value: "draft" | "active") {
    return value === "draft" ? "черновик" : "активный"
}
