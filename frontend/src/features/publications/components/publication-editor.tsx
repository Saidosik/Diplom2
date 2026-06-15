"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
    ArrowDown,
    ArrowUp,
    CheckCircle2,
    Copy,
    FileUp,
    Hash,
    Eye,
    Clock3,
    FileText,
    GripVertical,
    ImageIcon,
    LayoutTemplate,
    ListPlus,
    Loader2,
    Plus,
    Save,
    Send,
    Sparkles,
    Trash2,
    WandSparkles,
    History,
    X,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { assistPublication, type PublicationAssistResponse, type SourceSuggestion } from "@/features/ai-api"
import { uploadMyFile } from "@/features/files/api"
import { getMySnippets } from "@/features/playground/api"
import { ContentAttachmentsField } from "@/features/files/components/content-attachments-field"
import { CodeSnippetPickerFields } from "@/features/playground/components/code-snippet-picker-fields"
import type { CodeSnippet } from "@/features/playground/types"
import { analyzePublicationQuality, autosavePublication, createDraftIfNotExists, createPublication, deletePublication, getPublicationVersions, restorePublicationVersion, updatePublication } from "@/features/publications/api"
import { PublicationBlockRenderer } from "@/features/publications/components/publication-block-renderer"
import { PublicationBreadcrumbs } from "@/features/publications/components/publication-breadcrumbs"
import {
    publicationBlockTypeLabels,
    publicationStatusLabels,
    publicationTypeLabels,
} from "@/features/publications/lib/publication-labels"
import type {
    Publication,
    PublicationBlock,
    PublicationBlockContent,
    PublicationBlockType,
    PublicationPayload,
    PublicationStatus,
    PublicationType,
} from "@/features/publications/types"

type PublicationEditorProps = {
    initialPublication?: Publication | null
}

type PublicationFormState = {
    title: string
    type: PublicationType
    status: PublicationStatus
    excerpt: string
    cover_image_path: string
    reading_time_minutes: string
    tags: string[]
    tagDraft: string
    attachmentIds: number[]
    blocks: PublicationBlock[]
}

const blockTypes: PublicationBlockType[] = [
    "heading",
    "paragraph",
    "markdown",
    "image",
    "video",
    "code",
    "terminal",
    "diff",
    "file_tree",
    "callout",
    "code_snippet",
    "important",
    "quote",
    "warning",
    "link",
    "divider",
    "table",
    "diagram",
]

function createClientId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID()
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function defaultContentByType(type: PublicationBlockType): PublicationBlockContent {
    switch (type) {
        case "heading":
            return { text: "Новый заголовок", level: 2 }
        case "paragraph":
            return { text: "Введите основной текст публикации." }
        case "markdown":
            return { text: "### Подзаголовок\n\nТекст с **Markdown**-разметкой." }
        case "image":
            return { src: "", alt: "", caption: "" }
        case "video":
            return { url: "", title: "" }
        case "code":
            return { language: "php", filename: "", code: "<?php\n\necho 'Hello, world!';" }
        case "terminal":
            return { shell: "bash", cwd: "~/project", command: "php artisan queue:work redis", output: "INFO  Processing jobs from the [default] queue." }
        case "diff":
            return { filename: ".env", language: "diff", code: "- QUEUE_CONNECTION=sync\n+ QUEUE_CONNECTION=redis" }
        case "file_tree":
            return { title: "Структура модуля", tree: "src/\n  features/\n    community/\n      api.ts\n      components/\n      types.ts" }
        case "callout":
            return { variant: "info", title: "На заметку", text: "Короткая подсказка, предупреждение или практический вывод." }
        case "code_snippet":
            return { snippet_id: "", title: "", language: "php", code: "", stdin: "", href: "", note: "" }
        case "important":
            return { text: "Важное примечание для читателя." }
        case "quote":
            return { text: "Цитата или выделенная мысль." }
        case "warning":
            return { text: "Предупреждение о возможной ошибке." }
        case "link":
            return { url: "", title: "Полезная ссылка", description: "Краткое описание ссылки." }
        case "table":
            return { rows: [["Колонка 1", "Колонка 2"], ["Значение", "Описание"]], header: true, alignment: ["left", "left"] }
        case "diagram":
            return { syntax: "mermaid", source: "flowchart TD\n  A[Идея] --> B[Редактор]\n  B --> C[Публикация]", caption: "Диаграмма процесса" }
        case "divider":
            return {}
    }
}

function makeBlock(type: PublicationBlockType, sortOrder: number): PublicationBlock {
    return {
        client_id: createClientId(),
        type,
        sort_order: sortOrder,
        content: defaultContentByType(type),
    }
}

function normalizeBlocks(blocks?: PublicationBlock[]): PublicationBlock[] {
    if (!blocks?.length) {
        return [makeBlock("heading", 0), makeBlock("paragraph", 1)]
    }

    return blocks.map((block, index) => ({
        ...block,
        client_id: block.client_id || createClientId(),
        sort_order: index,
        content: block.content || block.properties || defaultContentByType(block.type),
    }))
}

function getString(value: unknown, fallback = "") {
    return typeof value === "string" ? value : fallback
}

function getNumber(value: unknown, fallback: number) {
    return typeof value === "number" ? value : fallback
}

function createInitialState(publication?: Publication | null): PublicationFormState {
    return {
        title: publication?.title || "",
        type: publication?.type || "article",
        status: publication?.status || "draft",
        excerpt: publication?.excerpt || "",
        cover_image_path: publication?.cover_image_path || publication?.cover_image_url || "",
        reading_time_minutes: publication?.reading_time_minutes ? String(publication.reading_time_minutes) : "",
        tags: (publication?.tags || []).map((tag) => tag.name),
        tagDraft: "",
        attachmentIds: (publication?.attachments || []).map((attachment) => attachment.user_file_id),
        blocks: normalizeBlocks(publication?.blocks),
    }
}

function getBlockKey(block: PublicationBlock) {
    return block.client_id || (block.id ? `block-${block.id}` : `${block.type}-${block.sort_order}`)
}

function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number) {
    const nextItems = [...items]
    const [removed] = nextItems.splice(fromIndex, 1)
    nextItems.splice(toIndex, 0, removed)
    return nextItems
}

function calculateEstimatedReadingTime(blocks: PublicationBlock[]) {
    const text = blocks
        .map((block) => Object.values(block.content || {}).join(" "))
        .join(" ")

    const words = text.match(/[\p{L}\p{N}_]+/gu)?.length || 0

    return Math.max(1, Math.ceil(words / 180))
}

export function PublicationEditor({ initialPublication }: PublicationEditorProps) {
    const router = useRouter()
    const [form, setForm] = React.useState<PublicationFormState>(() => createInitialState(initialPublication))
    const [pendingAction, setPendingAction] = React.useState<"draft" | "publish" | "delete" | null>(null)
    const [draggedBlockKey, setDraggedBlockKey] = React.useState<string | null>(null)
    const [assistantPending, setAssistantPending] = React.useState(false)
    const [assistantResult, setAssistantResult] = React.useState<PublicationAssistResponse | null>(null)
    const [codeSnippets, setCodeSnippets] = React.useState<CodeSnippet[]>([])
    const [mode, setMode] = React.useState("editor")
    const [commandOpen, setCommandOpen] = React.useState(false)
    const [publishDialogOpen, setPublishDialogOpen] = React.useState(false)
    const [templateDialogOpen, setTemplateDialogOpen] = React.useState(false)
    const [saveState, setSaveState] = React.useState<"saved" | "saving" | "dirty" | "error" | "conflict">("saved")
    const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(initialPublication?.last_autosaved_at || initialPublication?.updated_at ? new Date(initialPublication.last_autosaved_at || initialPublication.updated_at!) : null)
    const [autosaveId, setAutosaveId] = React.useState<number | null>(initialPublication?.id || null)
    const [autosaveVersion, setAutosaveVersion] = React.useState(initialPublication?.autosave_version || 0)
    const [qualityReport, setQualityReport] = React.useState<{ score: number; blockers: string[]; warnings: string[]; suggestions: string[] } | null>(null)
    const [versionsOpen, setVersionsOpen] = React.useState(false)
    const [versions, setVersions] = React.useState<Array<{ version_number: number; title: string; change_summary?: string | null; created_at?: string | null }>>([])
    const [activeBlockKey, setActiveBlockKey] = React.useState<string | null>(null)

    React.useEffect(() => {
        getMySnippets()
            .then(setCodeSnippets)
            .catch(() => null)
    }, [])

    const isEditing = Boolean(autosaveId)
    const estimatedReadingTime = React.useMemo(() => calculateEstimatedReadingTime(form.blocks), [form.blocks])
    const outline = React.useMemo(() => form.blocks.map((block, index) => ({ block, index })).filter(({ block }) => block.type === "heading" && getString(block.content?.text)), [form.blocks])
    const readinessItems = React.useMemo(() => buildReadiness(form, estimatedReadingTime), [form, estimatedReadingTime])
    const readinessPercent = Math.round((readinessItems.filter((item) => item.done).length / readinessItems.length) * 100)

    const payload = React.useMemo<PublicationPayload>(() => ({
        type: form.type,
        status: form.status,
        title: form.title.trim(),
        excerpt: form.excerpt.trim() || null,
        cover_image_path: form.cover_image_path.trim() || null,
        reading_time_minutes: form.reading_time_minutes.trim() ? Number(form.reading_time_minutes) : null,
        tags: form.tags,
        attachment_ids: form.attachmentIds,
        blocks: form.blocks.map((block, index) => ({
            type: block.type,
            sort_order: index,
            content: block.content || {},
        })),
    }), [form])

    function markDirty() {
        setSaveState((current) => current === "saving" ? current : "dirty")
    }

    function updateField<Key extends keyof PublicationFormState>(field: Key, value: PublicationFormState[Key]) {
        markDirty()
        setForm((current) => ({ ...current, [field]: value }))
    }

    function addTag(tag: string) {
        const clean = tag.trim().replace(/^#/, "")
        if (!clean) return
        updateField("tags", Array.from(new Set([...form.tags, clean])).slice(0, 12))
        updateField("tagDraft", "")
    }

    function removeTag(tag: string) {
        updateField("tags", form.tags.filter((item) => item !== tag))
    }

    function addBlock(type: PublicationBlockType) {
        markDirty()
        setForm((current) => ({
            ...current,
            blocks: [...current.blocks, makeBlock(type, current.blocks.length)],
        }))
    }

    function updateBlock(index: number, patch: Partial<PublicationBlock>) {
        markDirty()
        setForm((current) => ({
            ...current,
            blocks: current.blocks.map((block, blockIndex) => {
                if (blockIndex !== index) return block
                return { ...block, ...patch }
            }),
        }))
    }

    function updateBlockContent(index: number, key: string, value: unknown) {
        markDirty()
        setForm((current) => ({
            ...current,
            blocks: current.blocks.map((block, blockIndex) => {
                if (blockIndex !== index) return block
                return {
                    ...block,
                    content: {
                        ...block.content,
                        [key]: value,
                    },
                }
            }),
        }))
    }

    function changeBlockType(index: number, type: PublicationBlockType) {
        updateBlock(index, {
            type,
            content: defaultContentByType(type),
        })
    }

    function duplicateBlock(index: number) {
        markDirty()
        setForm((current) => ({
            ...current,
            blocks: [
                ...current.blocks.slice(0, index + 1),
                { ...current.blocks[index], id: undefined, client_id: createClientId() },
                ...current.blocks.slice(index + 1),
            ],
        }))
    }

    function removeBlock(index: number) {
        markDirty()
        setForm((current) => {
            if (current.blocks.length <= 1) {
                toast.error("В публикации должен остаться хотя бы один блок")
                return current
            }

            return {
                ...current,
                blocks: current.blocks.filter((_, blockIndex) => blockIndex !== index),
            }
        })
    }

    function moveBlock(index: number, direction: -1 | 1) {
        markDirty()
        setForm((current) => {
            const nextIndex = index + direction
            if (nextIndex < 0 || nextIndex >= current.blocks.length) return current

            const blocks = [...current.blocks]
            const currentBlock = blocks[index]
            blocks[index] = blocks[nextIndex]
            blocks[nextIndex] = currentBlock

            return { ...current, blocks }
        })
    }

    function reorderBlock(fromIndex: number, toIndex: number) {
        if (fromIndex === toIndex) return

        setForm((current) => {
            if (fromIndex < 0 || toIndex < 0 || fromIndex >= current.blocks.length || toIndex >= current.blocks.length) {
                return current
            }

            return {
                ...current,
                blocks: moveArrayItem(current.blocks, fromIndex, toIndex),
            }
        })
    }

    function handleBlockDragStart(index: number, event: React.DragEvent<HTMLElement>) {
        const block = form.blocks[index]
        const key = getBlockKey(block)

        setDraggedBlockKey(key)
        event.dataTransfer.effectAllowed = "move"
        event.dataTransfer.setData("text/plain", String(index))
    }

    function handleBlockDrop(targetIndex: number, event: React.DragEvent<HTMLElement>) {
        event.preventDefault()

        const rawIndex = event.dataTransfer.getData("text/plain")
        const sourceIndex = Number(rawIndex)

        if (Number.isNaN(sourceIndex)) {
            setDraggedBlockKey(null)
            return
        }

        reorderBlock(sourceIndex, targetIndex)
        setDraggedBlockKey(null)
    }

    async function autosaveDraft() {
        if (saveState !== "dirty" || pendingAction) return
        setSaveState("saving")
        try {
            const id = autosaveId || (await createDraftIfNotExists()).id
            if (!autosaveId) setAutosaveId(id)
            const result = await autosavePublication(id, { ...payload, title: payload.title || "Новый черновик", status: "draft", autosave_version: autosaveVersion, editor_state: { ...payload, saved_from: "publication-studio" } })
            setAutosaveVersion(result.autosave_version)
            setSaveState("saved")
            setLastSavedAt(new Date(result.last_autosaved_at))
            window.localStorage.removeItem("publication-studio-draft")
        } catch (error) {
            const status = typeof error === "object" && error && "response" in error ? (error as { response?: { status?: number } }).response?.status : undefined
            setSaveState(status === 409 ? "conflict" : "error")
            window.localStorage.setItem("publication-studio-draft", JSON.stringify({ form, savedAt: new Date().toISOString() }))
        }
    }

    React.useEffect(() => {
        if (saveState !== "dirty") return
        const timer = window.setTimeout(() => { void autosaveDraft() }, 1700)
        return () => window.clearTimeout(timer)
    }, [saveState, payload])

    React.useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (saveState === "dirty" || saveState === "error") {
                event.preventDefault()
                event.returnValue = ""
            }
        }
        window.addEventListener("beforeunload", handleBeforeUnload)
        return () => window.removeEventListener("beforeunload", handleBeforeUnload)
    }, [saveState])

    React.useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const mod = event.ctrlKey || event.metaKey
            if (!mod) return
            if (event.key.toLowerCase() === "s") { event.preventDefault(); void save("draft") }
            if (event.key === "/") { event.preventDefault(); setCommandOpen(true) }
            if (event.key === "Enter") { event.preventDefault(); setPublishDialogOpen(true) }
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [payload])

    async function save(status: PublicationStatus) {
        if (!payload.title) {
            toast.error("Введите заголовок публикации")
            return
        }

        setPendingAction(status === "published" ? "publish" : "draft")

        try {
            const result = autosaveId
                ? await updatePublication(autosaveId, { ...payload, title: payload.title || "Новый черновик", status })
                : await createPublication({ ...payload, status })

            setSaveState("saved")
            setLastSavedAt(new Date())
            toast.success(status === "published" ? "Публикация опубликована" : "Черновик сохранён")

            if (status === "published") {
                router.push(`/publications/${result.slug}`)
                router.refresh()
                return
            }

            setAutosaveId(result.id)
            setAutosaveVersion(result.autosave_version || autosaveVersion)
            router.push(`/publications/editor/${result.id}`)
            router.refresh()
        } catch (error) {
            const message = error instanceof Error ? error.message : "Не удалось сохранить публикацию"
            setSaveState("error")
            toast.error(message)
        } finally {
            setPendingAction(null)
        }
    }

    async function handleDelete() {
        if (!initialPublication?.id) return

        const confirmed = window.confirm("Удалить публикацию? Это действие можно будет восстановить только через базу данных.")
        if (!confirmed) return

        setPendingAction("delete")

        try {
            await deletePublication(initialPublication.id)
            toast.success("Публикация удалена")
            router.push("/publications/my")
            router.refresh()
        } catch (error) {
            const message = error instanceof Error ? error.message : "Не удалось удалить публикацию"
            toast.error(message)
        } finally {
            setPendingAction(null)
        }
    }

    async function runAssistant() {
        setAssistantPending(true)

        try {
            const result = await assistPublication(payload)
            setAssistantResult(result)
            toast.success("Публикация проанализирована")
        } catch (error) {
            const message = error instanceof Error ? error.message : "Не удалось выполнить анализ публикации"
            toast.error(message)
        } finally {
            setAssistantPending(false)
        }
    }

    function applyAssistantPatch(patch: Partial<Pick<PublicationFormState, "title" | "excerpt" | "tags">>) {
        setForm((current) => ({ ...current, ...patch }))
    }

    function addOutlineBlocks(outline: string[]) {
        setForm((current) => ({
            ...current,
            blocks: [
                ...current.blocks,
                ...outline.map((title, index) => ({
                    client_id: createClientId(),
                    type: "heading" as PublicationBlockType,
                    sort_order: current.blocks.length + index,
                    content: { text: title, level: 2 },
                })),
            ],
        }))
    }

    function addSourceBlocks(sources: SourceSuggestion[]) {
        if (!sources.length) {
            toast.info("Источники пока не найдены")
            return
        }

        const markdown = [
            "## Источники из базы знаний",
            "",
            ...sources.slice(0, 6).map((source, index) => {
                const title = source.href ? `[${source.title}](${source.href})` : source.title
                const excerpt = source.excerpt ? ` — ${source.excerpt}` : ""
                return `${index + 1}. ${title}${excerpt}`
            }),
        ].join("\n")

        setForm((current) => ({
            ...current,
            blocks: [
                ...current.blocks,
                {
                    client_id: createClientId(),
                    type: "markdown" as PublicationBlockType,
                    sort_order: current.blocks.length,
                    content: { text: markdown },
                },
            ],
        }))

        toast.success("Источники добавлены в публикацию")
    }

    return (
        <div className="space-y-6">
            <PublicationBreadcrumbs
                items={[
                    { label: "Публикации", href: "/publications" },
                    { label: isEditing ? "Редактирование" : "Создание" },
                ]}
            />

            <section className="flex flex-col gap-4 rounded-4xl border bg-card p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                    <p className="text-sm font-medium text-primary">Конструктор публикации</p>
                    <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                        {isEditing ? "Редактирование публикации" : "Новая публикация"}
                    </h1>
                    <p className="text-sm text-muted-foreground">Конструктор технических материалов с блоками, файлами, сниппетами, AI-подсказками и live preview.</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant={form.status === "published" ? "default" : "secondary"}>{publicationStatusLabels[form.status]}</Badge>
                        <SaveStatus state={saveState} lastSavedAt={lastSavedAt} />
                        {initialPublication?.updated_at ? <span>Изменено: {new Date(initialPublication.updated_at).toLocaleString("ru-RU")}</span> : null}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" type="button" onClick={() => setCommandOpen(true)}><Sparkles className="size-4" />Команды</Button>
                    <Button variant="outline" type="button" onClick={() => setTemplateDialogOpen(true)}><LayoutTemplate className="size-4" />Шаблоны</Button>
                    <Button variant="outline" type="button" onClick={async () => { if (autosaveId) { setVersions(await getPublicationVersions(autosaveId)); setVersionsOpen(true) } }}><History className="size-4" />История</Button>
                    <Button variant="outline" type="button" onClick={async () => setQualityReport(await analyzePublicationQuality(payload))}><CheckCircle2 className="size-4" />Качество</Button>
                    <Button variant="outline" type="button" onClick={() => setMode("preview")}><Eye className="size-4" />Предпросмотр</Button>
                    <Button variant="outline" type="button" onClick={() => save("draft")} disabled={pendingAction !== null}>
                        {pendingAction === "draft" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                        Сохранить черновик
                    </Button>
                    <Button type="button" onClick={() => setPublishDialogOpen(true)} disabled={pendingAction !== null}>
                        {pendingAction === "publish" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                        Опубликовать
                    </Button>
                    {isEditing && (
                        <Button variant="destructive" type="button" onClick={handleDelete} disabled={pendingAction !== null}>
                            {pendingAction === "delete" ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                            Удалить
                        </Button>
                    )}
                </div>
            </section>

            <EditorCommandPalette open={commandOpen} onOpenChange={setCommandOpen} onSave={() => save("draft")} onPublish={() => setPublishDialogOpen(true)} onMode={setMode} onAdd={addBlock} onRunAi={runAssistant} />
            <TemplateDialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen} onInsert={(blocks) => setForm((current) => ({ ...current, blocks: [...current.blocks, ...blocks.map((block, index) => ({ ...block, sort_order: current.blocks.length + index }))] }))} />
            <VersionHistoryDialog open={versionsOpen} onOpenChange={setVersionsOpen} versions={versions} onRestore={async (version) => { if (!autosaveId) return; const restored = await restorePublicationVersion(autosaveId, version); setForm(createInitialState(restored)); toast.success("Версия восстановлена") }} />
            <PublishDialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen} form={form} readinessItems={readinessItems} onConfirm={() => save("published")} pending={pendingAction === "publish"} />

            {qualityReport ? <QualityPanel report={qualityReport} /> : null}

            <Tabs value={mode} onValueChange={setMode} className="space-y-6">
                <TabsList variant="line">
                    <TabsTrigger value="editor">
                        <LayoutTemplate className="size-4" />
                        Редактор
                    </TabsTrigger>
                    <TabsTrigger value="split"><LayoutTemplate className="size-4" />Сплит</TabsTrigger>
                    <TabsTrigger value="preview">
                        <Eye className="size-4" />
                        Предпросмотр
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="editor" className="space-y-6">
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                        <div className="space-y-6">
                            <Card className="shadow-sm">
                                <CardHeader>
                                    <CardTitle>Основная информация</CardTitle>
                                    <CardDescription>
                                        Эти данные отображаются в ленте публикаций и на странице материала.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="publication-title">Заголовок</Label>
                                        <Input
                                            id="publication-title"
                                            value={form.title}
                                            onChange={(event) => updateField("title", event.target.value)}
                                            placeholder="Например: Как устроена авторизация в Laravel API"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Тип публикации</Label>
                                        <Select value={form.type} onValueChange={(value) => updateField("type", value as PublicationType)}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(publicationTypeLabels).map(([value, label]) => (
                                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Статус</Label>
                                        <Select value={form.status} onValueChange={(value) => updateField("status", value as PublicationStatus)}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(publicationStatusLabels).map(([value, label]) => (
                                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="publication-reading-time">Время чтения</Label>
                                        <div className="grid gap-2 md:grid-cols-[220px_1fr]">
                                            <Input
                                                id="publication-reading-time"
                                                type="number"
                                                min={1}
                                                max={999}
                                                value={form.reading_time_minutes}
                                                onChange={(event) => updateField("reading_time_minutes", event.target.value)}
                                                placeholder={String(estimatedReadingTime)}
                                            />
                                            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 text-sm text-muted-foreground">
                                                <Clock3 className="size-4" />
                                                Если оставить поле пустым, система поставит примерно {estimatedReadingTime} мин.
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="publication-tags">Теги</Label>
                                        <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-md border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
                                            {form.tags.map((tag) => (
                                                <Badge key={tag} variant="secondary" className="gap-1">
                                                    <Hash className="size-3" />{tag}
                                                    <button type="button" aria-label={`Удалить тег ${tag}`} onClick={() => removeTag(tag)}><X className="size-3" /></button>
                                                </Badge>
                                            ))}
                                            <input
                                                id="publication-tags"
                                                value={form.tagDraft}
                                                onChange={(event) => updateField("tagDraft", event.target.value)}
                                                onKeyDown={(event) => {
                                                    if (["Enter", ","].includes(event.key)) {
                                                        event.preventDefault()
                                                        addTag(form.tagDraft)
                                                    }
                                                }}
                                                onBlur={() => addTag(form.tagDraft)}
                                                className="min-w-40 flex-1 bg-transparent text-sm outline-none"
                                                placeholder={form.tags.length ? "Добавить тег" : "Laravel, API, PostgreSQL"}
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">Enter или запятая добавляют тег. Минимум два тега повышают готовность публикации.</p>
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="publication-excerpt">Краткое описание</Label>
                                        <Textarea
                                            id="publication-excerpt"
                                            value={form.excerpt}
                                            onChange={(event) => updateField("excerpt", event.target.value)}
                                            placeholder="Коротко объясни, о чём публикация. Это описание будет видно в карточке."
                                            className="min-h-24"
                                        />
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="publication-cover">Обложка</Label>
                                        <CoverField value={form.cover_image_path} onChange={(value) => updateField("cover_image_path", value)} />
                                    </div>

                                    <div className="md:col-span-2">
                                        <ContentAttachmentsField
                                            value={form.attachmentIds}
                                            onChange={(attachmentIds) => updateField("attachmentIds", attachmentIds)}
                                            initialAttachments={initialPublication?.attachments || []}
                                            description="Прикрепи архив, исходники, изображение, лог или дополнительный материал к публикации."
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-sm">
                                <CardHeader>
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <CardTitle>Блоки публикации</CardTitle>
                                            <CardDescription>
                                                Основной контент материала. Блоки можно менять местами и удалять.
                                            </CardDescription>
                                        </div>

                                        <AddBlockMenu onAdd={addBlock} />
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-4">
                                    {form.blocks.map((block, index) => (
                                        <BlockEditorCard
                                            key={block.client_id || `${block.type}-${index}`}
                                            block={block}
                                            index={index}
                                            total={form.blocks.length}
                                            onTypeChange={(type) => changeBlockType(index, type)}
                                            onContentChange={(key, value) => updateBlockContent(index, key, value)}
                                            codeSnippets={codeSnippets}
                                            isDragging={draggedBlockKey === getBlockKey(block)}
                                            onDragStart={(event) => handleBlockDragStart(index, event)}
                                            onDragOver={(event) => event.preventDefault()}
                                            onDrop={(event) => handleBlockDrop(index, event)}
                                            onDragEnd={() => setDraggedBlockKey(null)}
                                            onMoveUp={() => moveBlock(index, -1)}
                                            onMoveDown={() => moveBlock(index, 1)}
                                            onRemove={() => removeBlock(index)}
                                            onDuplicate={() => duplicateBlock(index)}
                                            active={activeBlockKey === getBlockKey(block)}
                                            onActivate={() => setActiveBlockKey(getBlockKey(block))}
                                        />
                                    ))}
                                </CardContent>
                            </Card>
                        </div>

                        <aside className="space-y-4">
                            <PublicationAssistantCard
                                pending={assistantPending}
                                result={assistantResult}
                                onRun={runAssistant}
                                onApply={applyAssistantPatch}
                                onAddOutline={addOutlineBlocks}
                                onAddSources={addSourceBlocks}
                            />

                            <Card className="sticky top-24 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="size-5" />
                                        Сводка
                                    </CardTitle>
                                    <CardDescription>
                                        Быстрая проверка перед сохранением.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm">
                                    <div className="space-y-2 rounded-2xl border bg-muted/20 p-3">
                                        <div className="flex items-center justify-between"><span className="font-medium">Готовность</span><span>{readinessPercent}%</span></div>
                                        <Progress value={readinessPercent} />
                                        <div className="grid gap-1">
                                            {readinessItems.slice(0, 5).map((item) => (
                                                <span key={item.label} className="inline-flex items-center gap-2 text-xs"><CheckCircle2 className={cn("size-3", item.done ? "text-primary" : "text-muted-foreground")} />{item.label}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2 rounded-2xl border bg-muted/20 p-3">
                                        <p className="font-medium">Структура</p>
                                        {outline.length ? outline.map(({ block, index }) => (
                                            <button key={getBlockKey(block)} type="button" className="block w-full truncate rounded-md px-2 py-1 text-left text-xs hover:bg-muted" onClick={() => document.getElementById(`publication-block-${index}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>
                                                H{getNumber(block.content?.level, 2)} · {getString(block.content?.text)}
                                            </button>
                                        )) : <p className="text-xs text-muted-foreground">Добавьте заголовки, чтобы появилась структура.</p>}
                                    </div>
                                    <SummaryRow label="Название" value={form.title || "Не заполнено"} />
                                    <SummaryRow label="Тип" value={publicationTypeLabels[form.type]} />
                                    <SummaryRow label="Теги" value={form.tags.join(", ") || "Не указаны"} />
                                    <SummaryRow label="Статус" value={publicationStatusLabels[form.status]} />
                                    <SummaryRow label="Блоков" value={String(form.blocks.length)} />
                                    <SummaryRow label="Вложений" value={String(form.attachmentIds.length)} />
                                    <SummaryRow label="Время чтения" value={`${form.reading_time_minutes || estimatedReadingTime} мин.`} />
                                    <Separator />
                                    <div className="space-y-2">
                                        <p className="font-medium">Быстро добавить</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button variant="outline" size="sm" type="button" onClick={() => addBlock("paragraph")}>Текст</Button>
                                            <Button variant="outline" size="sm" type="button" onClick={() => addBlock("code")}>Код</Button>
                                            <Button variant="outline" size="sm" type="button" onClick={() => addBlock("image")}>Фото</Button>
                                            <Button variant="outline" size="sm" type="button" onClick={() => addBlock("warning")}>Важно</Button>
                                            <Button variant="outline" size="sm" type="button" onClick={() => addBlock("code_snippet")}>Сниппет</Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </aside>
                    </div>
                </TabsContent>

                <TabsContent value="split">
                    <ResizablePanelGroup orientation="horizontal" className="min-h-[760px] rounded-3xl border bg-card">
                        <ResizablePanel defaultSize={52} minSize={35}><ScrollArea className="h-[760px] p-4"><EditorMain form={form} updateField={updateField} estimatedReadingTime={estimatedReadingTime} initialPublication={initialPublication} addBlock={addBlock} blocks={form.blocks.map((block, index) => ({ block, index }))} renderBlock={(block, index) => (<BlockEditorCard key={block.client_id || `${block.type}-${index}`} block={block} index={index} total={form.blocks.length} onTypeChange={(type) => changeBlockType(index, type)} onContentChange={(key, value) => updateBlockContent(index, key, value)} codeSnippets={codeSnippets} isDragging={draggedBlockKey === getBlockKey(block)} onDragStart={(event) => handleBlockDragStart(index, event)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleBlockDrop(index, event)} onDragEnd={() => setDraggedBlockKey(null)} onMoveUp={() => moveBlock(index, -1)} onMoveDown={() => moveBlock(index, 1)} onRemove={() => removeBlock(index)} onDuplicate={() => duplicateBlock(index)} active={activeBlockKey === getBlockKey(block)} onActivate={() => setActiveBlockKey(getBlockKey(block))} />)} /></ScrollArea></ResizablePanel>
                        <ResizableHandle withHandle />
                        <ResizablePanel defaultSize={48} minSize={30}><ScrollArea className="h-[760px] bg-muted/20 p-4"><PublicationPreview form={form} /></ScrollArea></ResizablePanel>
                    </ResizablePanelGroup>
                </TabsContent>

                <TabsContent value="preview">
                    <PublicationPreview form={form} />
                </TabsContent>
            </Tabs>
        </div>
    )
}

function EditorMain({ form, updateField, estimatedReadingTime, initialPublication, addBlock, blocks, renderBlock }: { form: PublicationFormState; updateField: <Key extends keyof PublicationFormState>(field: Key, value: PublicationFormState[Key]) => void; estimatedReadingTime: number; initialPublication?: Publication | null; addBlock: (type: PublicationBlockType) => void; blocks: Array<{ block: PublicationBlock; index: number }>; renderBlock: (block: PublicationBlock, index: number) => React.ReactNode }) {
    return (
        <div className="space-y-4">
            <Card><CardHeader><CardTitle>Редактор</CardTitle><CardDescription>Сплит-режим: слева блоки, справа live preview.</CardDescription></CardHeader><CardContent className="space-y-4">
                <Field label="Заголовок"><Input value={form.title} onChange={(event) => updateField("title", event.target.value)} /></Field>
                <Field label="Описание"><Textarea value={form.excerpt} onChange={(event) => updateField("excerpt", event.target.value)} className="min-h-20" /></Field>
                <div className="grid gap-3 md:grid-cols-2"><Field label="Время чтения"><Input value={form.reading_time_minutes} onChange={(event) => updateField("reading_time_minutes", event.target.value)} placeholder={String(estimatedReadingTime)} /></Field><div className="pt-7"><ContentAttachmentsField value={form.attachmentIds} onChange={(ids) => updateField("attachmentIds", ids)} initialAttachments={initialPublication?.attachments || []} /></div></div>
            </CardContent></Card>
            <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => addBlock("paragraph")}>+ Текст</Button><Button size="sm" variant="outline" onClick={() => addBlock("code")}>+ Код</Button><Button size="sm" variant="outline" onClick={() => addBlock("image")}>+ Изображение</Button><Button size="sm" variant="outline" onClick={() => addBlock("callout")}>+ Callout</Button></div>
            {blocks.map(({ block, index }) => renderBlock(block, index))}
        </div>
    )
}

function SaveStatus({ state, lastSavedAt }: { state: "saved" | "saving" | "dirty" | "error" | "conflict"; lastSavedAt: Date | null }) {
    const map = { saved: "Сохранено", saving: "Сохраняем…", dirty: "Есть несохранённые изменения", error: "Ошибка сохранения", conflict: "Конфликт версии" }
    return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1", (state === "error" || state === "conflict") && "border-destructive text-destructive", state === "dirty" && "border-amber-500/50 text-amber-500")}><CheckCircle2 className="size-3" />{map[state]}{state === "saved" && lastSavedAt ? ` ${lastSavedAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}` : ""}</span>
}

function buildReadiness(form: PublicationFormState, estimatedReadingTime: number) {
    const textBlocks = form.blocks.filter((block) => ["paragraph", "markdown", "important", "quote", "warning"].includes(block.type) && getString(block.content?.text).trim())
    return [
        { label: "Заголовок заполнен", done: form.title.trim().length >= 5, critical: true },
        { label: "Описание заполнено", done: form.excerpt.trim().length >= 40, critical: false },
        { label: "Есть минимум 2 тега", done: form.tags.length >= 2, critical: false },
        { label: "Есть основной текст", done: textBlocks.length > 0, critical: true },
        { label: "Есть структура/заголовки", done: form.blocks.some((block) => block.type === "heading"), critical: false },
        { label: "Есть вывод", done: form.blocks.some((block) => getString(block.content?.text).toLowerCase().includes("вывод")), critical: false },
        { label: "Время чтения рассчитано", done: Boolean(form.reading_time_minutes) || estimatedReadingTime > 0, critical: false },
        { label: "Нет пустых блоков", done: form.blocks.every((block) => block.type === "divider" || Object.values(block.content || {}).some((value) => String(value ?? "").trim())), critical: true },
    ]
}

function CoverField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    const [pending, setPending] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement | null>(null)
    async function upload(file?: File) {
        if (!file) return
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast.error("Поддерживаются jpg, png и webp"); return }
        setPending(true)
        try { const uploaded = await uploadMyFile({ file, visibility: "public" }); onChange(uploaded.public_url || uploaded.download_url || uploaded.preview_url || ""); toast.success("Обложка загружена") }
        catch (error) { toast.error(error instanceof Error ? error.message : "Не удалось загрузить обложку") }
        finally { setPending(false); if (inputRef.current) inputRef.current.value = "" }
    }
    return <div className="space-y-3"><div className="rounded-2xl border border-dashed bg-muted/20 p-4 text-center" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void upload(e.dataTransfer.files?.[0]) }}>
        {value ? <img src={value} alt="Превью обложки" className="mx-auto max-h-52 rounded-xl object-cover" /> : <div className="py-6 text-sm text-muted-foreground"><ImageIcon className="mx-auto mb-2 size-8" />Перетащите изображение или укажите URL. Рекомендуемый размер 1600×900.</div>}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
        <div className="mt-3 flex flex-wrap justify-center gap-2"><Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}Загрузить обложку</Button>{value ? <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>Удалить</Button> : null}</div>
    </div><Input value={value} onChange={(event) => onChange(event.target.value)} placeholder="URL изображения или путь в storage" /></div>
}

function EditorCommandPalette({ open, onOpenChange, onSave, onPublish, onMode, onAdd, onRunAi }: { open: boolean; onOpenChange: (open: boolean) => void; onSave: () => void; onPublish: () => void; onMode: (mode: string) => void; onAdd: (type: PublicationBlockType) => void; onRunAi: () => void }) {
    const run = (fn: () => void) => { fn(); onOpenChange(false) }
    return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Командная палитра</DialogTitle><DialogDescription>Ctrl+/ открывает быстрые действия редактора.</DialogDescription></DialogHeader><Command><CommandInput placeholder="Сохранить, блок, AI..." /><CommandList><CommandEmpty>Команды не найдены</CommandEmpty><CommandGroup heading="Действия"><CommandItem onSelect={() => run(onSave)}>Сохранить черновик</CommandItem><CommandItem onSelect={() => run(onPublish)}>Опубликовать</CommandItem><CommandItem onSelect={() => run(() => onMode("preview"))}>Открыть предпросмотр</CommandItem><CommandItem onSelect={() => run(() => onMode("split"))}>Переключить split view</CommandItem><CommandItem onSelect={() => run(onRunAi)}>Запустить AI-анализ</CommandItem></CommandGroup><CommandSeparator /><CommandGroup heading="Добавить блок">{blockTypes.map((type) => <CommandItem key={type} onSelect={() => run(() => onAdd(type))}>{publicationBlockTypeLabels[type]}</CommandItem>)}</CommandGroup></CommandList></Command></DialogContent></Dialog>
}

function TemplateDialog({ open, onOpenChange, onInsert }: { open: boolean; onOpenChange: (open: boolean) => void; onInsert: (blocks: PublicationBlock[]) => void }) {
    const templates = ["Статья", "Гайд", "Туториал", "Разбор ошибки", "DevOps runbook", "Laravel guide", "API documentation", "Q&A recap", "Сравнение технологий", "Чеклист"]
    function makeTemplate(name: string) { return [makeBlock("heading", 0), { ...makeBlock("paragraph", 1), content: { text: `Введение: ${name}` } }, { ...makeBlock("heading", 2), content: { text: "Пошаговый разбор", level: 2 } }, makeBlock("code", 3), { ...makeBlock("heading", 4), content: { text: "Вывод", level: 2 } }] }
    return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Шаблоны публикаций</DialogTitle><DialogDescription>Шаблон добавляется в конец статьи и не затирает текущий контент.</DialogDescription></DialogHeader><div className="grid gap-2 sm:grid-cols-2">{templates.map((name) => <Button key={name} variant="outline" onClick={() => { onInsert(makeTemplate(name)); onOpenChange(false); toast.success("Шаблон добавлен") }}>{name}</Button>)}</div></DialogContent></Dialog>
}


function QualityPanel({ report }: { report: { score: number; blockers: string[]; warnings: string[]; suggestions: string[] } }) {
    return <Card className="border-primary/20"><CardHeader><CardTitle>Quality panel</CardTitle><CardDescription>Проверка готовности материала перед публикацией.</CardDescription></CardHeader><CardContent className="space-y-3"><Progress value={report.score} /><p className="text-sm font-medium">Score: {report.score}/100</p>{[["Blockers", report.blockers], ["Warnings", report.warnings], ["Suggestions", report.suggestions]].map(([title, items]) => <div key={title as string} className="space-y-1"><p className="text-xs font-semibold uppercase text-muted-foreground">{title as string}</p>{(items as string[]).length ? (items as string[]).map((item) => <p key={item} className="rounded-xl border bg-muted/30 px-3 py-2 text-sm">{item}</p>) : <p className="text-sm text-muted-foreground">Нет замечаний</p>}</div>)}</CardContent></Card>
}

function VersionHistoryDialog({ open, onOpenChange, versions, onRestore }: { open: boolean; onOpenChange: (open: boolean) => void; versions: Array<{ version_number: number; title: string; change_summary?: string | null; created_at?: string | null }>; onRestore: (version: number) => void }) {
    return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>История изменений</DialogTitle><DialogDescription>Версии создаются при ручном сохранении и публикации. Текущая версия отмечена первой.</DialogDescription></DialogHeader><div className="space-y-2">{versions.length ? versions.map((version, index) => <div key={version.version_number} className="flex items-center justify-between rounded-2xl border p-3"><div><p className="font-medium">v{version.version_number} · {version.title} {index === 0 ? <Badge>Текущая версия</Badge> : null}</p><p className="text-xs text-muted-foreground">{version.change_summary || "Снимок публикации"} · {version.created_at ? new Date(version.created_at).toLocaleString("ru-RU") : ""}</p></div><Button variant="outline" size="sm" onClick={() => onRestore(version.version_number)}>Восстановить</Button></div>) : <p className="text-sm text-muted-foreground">Версий пока нет.</p>}</div></DialogContent></Dialog>
}

function PublishDialog({ open, onOpenChange, form, readinessItems, onConfirm, pending }: { open: boolean; onOpenChange: (open: boolean) => void; form: PublicationFormState; readinessItems: ReturnType<typeof buildReadiness>; onConfirm: () => void; pending: boolean }) {
    const blockers = readinessItems.filter((item) => item.critical && !item.done)
    return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Публикация материала</DialogTitle><DialogDescription>Проверьте сводку перед публикацией.</DialogDescription></DialogHeader><div className="space-y-3 text-sm"><SummaryRow label="Название" value={form.title || "Не заполнено"} /><SummaryRow label="Теги" value={form.tags.join(", ") || "Нет"} /><SummaryRow label="Блоков" value={String(form.blocks.length)} />{readinessItems.map((item) => <div key={item.label} className="flex items-center gap-2"><Checkbox checked={item.done} disabled /><span className={cn(!item.done && item.critical && "text-destructive")}>{item.label}</span></div>)}</div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button><Button onClick={onConfirm} disabled={pending || blockers.length > 0}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}Опубликовать</Button></DialogFooter></DialogContent></Dialog>
}

function PublicationAssistantCard({
    pending,
    result,
    onRun,
    onApply,
    onAddOutline,
    onAddSources,
}: {
    pending: boolean
    result: PublicationAssistResponse | null
    onRun: () => void
    onApply: (patch: Partial<Pick<PublicationFormState, "title" | "excerpt" | "tags">>) => void
    onAddOutline: (outline: string[]) => void
    onAddSources: (sources: SourceSuggestion[]) => void
}) {
    return (
        <Card className="border-primary/20 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="size-5 text-primary" />
                    Анализ публикации
                </CardTitle>
                <CardDescription>
                    Инструмент предлагает структуру, описание, теги и редакторские правки.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button type="button" variant="secondary" className="w-full" onClick={onRun} disabled={pending}>
                    {pending ? <Loader2 className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
                    Проанализировать
                </Button>

                {result ? (
                    <div className="space-y-4 text-sm">
                        <div className="grid gap-2 rounded-2xl border bg-muted/30 p-3">
                            <p className="font-medium">Применить рекомендации</p>
                            <Button type="button" variant="outline" size="sm" onClick={() => onApply({ title: result.suggested_title })}>Заголовок</Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => onApply({ excerpt: result.suggested_excerpt })}>Описание</Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => onApply({ tags: result.suggested_tags })}>Теги</Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => onAddOutline(result.outline)}>Добавить план блоками</Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => onAddSources(result.source_suggestions || [])}>Добавить источники</Button>
                        </div>

                        {result.source_suggestions?.length ? (
                            <div className="space-y-2">
                                <p className="font-medium">Источники из базы знаний</p>
                                <div className="grid gap-2">
                                    {result.source_suggestions.slice(0, 5).map((source) => (
                                        <a key={`${source.type}-${source.title}`} href={source.href || "#"} className="rounded-2xl border bg-background/50 p-2 text-xs transition-colors hover:border-primary/50">
                                            <span className="block font-medium line-clamp-2">{source.title}</span>
                                            <span className="mt-1 block line-clamp-2 text-muted-foreground">{source.excerpt}</span>
                                            <span className="mt-1 block text-[11px] text-muted-foreground">score {Math.round((source.score || 0) * 100)}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {result.editor_hints.length > 0 ? (
                            <div className="space-y-2">
                                <p className="font-medium">Редакторские подсказки</p>
                                <ul className="list-disc space-y-1 pl-4 text-xs leading-5 text-muted-foreground">
                                    {result.editor_hints.map((hint) => <li key={hint}>{hint}</li>)}
                                </ul>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </CardContent>
        </Card>
    )
}

function AddBlockMenu({ onAdd }: { onAdd: (type: PublicationBlockType) => void }) {
    return (
        <div className="flex flex-wrap gap-2">
            {blockTypes.map((type) => (
                <Button key={type} variant="outline" size="sm" type="button" onClick={() => onAdd(type)}>
                    <Plus className="size-4" />
                    {publicationBlockTypeLabels[type]}
                </Button>
            ))}
        </div>
    )
}

function BlockEditorCard({
    block,
    index,
    total,
    onTypeChange,
    onContentChange,
    codeSnippets,
    onMoveUp,
    onMoveDown,
    onRemove,
    onDuplicate,
    active,
    onActivate,
    isDragging,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
}: {
    block: PublicationBlock
    index: number
    total: number
    onTypeChange: (type: PublicationBlockType) => void
    onContentChange: (key: string, value: unknown) => void
    codeSnippets: CodeSnippet[]
    onMoveUp: () => void
    onMoveDown: () => void
    onRemove: () => void
    onDuplicate: () => void
    active: boolean
    onActivate: () => void
    isDragging: boolean
    onDragStart: (event: React.DragEvent<HTMLElement>) => void
    onDragOver: (event: React.DragEvent<HTMLElement>) => void
    onDrop: (event: React.DragEvent<HTMLElement>) => void
    onDragEnd: () => void
}) {
    return (
        <div
            className={cn(
                "rounded-3xl border bg-background/40 p-4 transition-all",
                isDragging && "scale-[0.99] border-primary/60 opacity-60 shadow-lg",
                active && "border-primary/70 shadow-md"
            )}
            id={`publication-block-${index}`}
            onClick={onActivate}
            onDragOver={onDragOver}
            onDrop={onDrop}
        >
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        draggable
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        className="inline-flex size-8 cursor-grab items-center justify-center rounded-full border bg-muted/50 text-muted-foreground transition-colors hover:bg-muted active:cursor-grabbing"
                        aria-label="Перетащить блок"
                        title="Перетащи блок мышкой"
                    >
                        <GripVertical className="size-4" />
                    </button>
                    <span className="inline-flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {index + 1}
                    </span>
                    <Select value={block.type} onValueChange={(value) => onTypeChange(value as PublicationBlockType)}>
                        <SelectTrigger className="w-56">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {blockTypes.map((type) => (
                                <SelectItem key={type} value={type}>{publicationBlockTypeLabels[type]}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" size="icon-sm" type="button" onClick={onMoveUp} disabled={index === 0}>
                        <ArrowUp className="size-4" />
                    </Button>
                    <Button variant="outline" size="icon-sm" type="button" onClick={onMoveDown} disabled={index === total - 1}>
                        <ArrowDown className="size-4" />
                    </Button>
                    <Button variant="outline" size="icon-sm" type="button" onClick={onDuplicate} aria-label="Дублировать блок">
                        <Copy className="size-4" />
                    </Button>
                    <Button variant="destructive" size="icon-sm" type="button" onClick={onRemove} aria-label="Удалить блок">
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            </div>

            <BlockFields block={block} onContentChange={onContentChange} codeSnippets={codeSnippets} />
        </div>
    )
}

function BlockFields({
    block,
    onContentChange,
    codeSnippets,
}: {
    block: PublicationBlock
    onContentChange: (key: string, value: unknown) => void
    codeSnippets: CodeSnippet[]
}) {
    const content = block.content || {}

    switch (block.type) {
        case "heading":
            return (
                <div className="grid gap-4 md:grid-cols-[1fr_160px]">
                    <Field label="Текст заголовка">
                        <Input value={getString(content.text)} onChange={(event) => onContentChange("text", event.target.value)} />
                    </Field>
                    <Field label="Уровень">
                        <Select value={String(getNumber(content.level, 2))} onValueChange={(value) => onContentChange("level", Number(value))}>
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">H1</SelectItem>
                                <SelectItem value="2">H2</SelectItem>
                                <SelectItem value="3">H3</SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>
                </div>
            )

        case "paragraph":
        case "markdown":
        case "important":
        case "quote":
        case "warning":
            return (
                <Field label={block.type === "markdown" ? "Markdown" : "Текст"}>
                    <Textarea
                        value={getString(content.text)}
                        onChange={(event) => onContentChange("text", event.target.value)}
                        className="min-h-36 font-mono text-sm"
                    />
                </Field>
            )

        case "image":
            return (
                <div className="grid gap-4">
                    <Field label="Ссылка на изображение">
                        <Input value={getString(content.src)} onChange={(event) => onContentChange("src", event.target.value)} placeholder="https://..." />
                    </Field>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Alt-текст">
                            <Input value={getString(content.alt)} onChange={(event) => onContentChange("alt", event.target.value)} />
                        </Field>
                        <Field label="Подпись">
                            <Input value={getString(content.caption)} onChange={(event) => onContentChange("caption", event.target.value)} />
                        </Field>
                    </div>
                </div>
            )

        case "video":
            return (
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Ссылка на видео">
                        <Input value={getString(content.url)} onChange={(event) => onContentChange("url", event.target.value)} placeholder="YouTube/VK/внешняя ссылка" />
                    </Field>
                    <Field label="Название">
                        <Input value={getString(content.title)} onChange={(event) => onContentChange("title", event.target.value)} />
                    </Field>
                </div>
            )

        case "code":
            return (
                <div className="grid gap-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Язык">
                            <Input value={getString(content.language)} onChange={(event) => onContentChange("language", event.target.value)} placeholder="php, js, ts, html" />
                        </Field>
                        <Field label="Название файла">
                            <Input value={getString(content.filename)} onChange={(event) => onContentChange("filename", event.target.value)} placeholder="routes/api.php" />
                        </Field>
                    </div>
                    <Field label="Код">
                        <Textarea
                            value={getString(content.code)}
                            onChange={(event) => onContentChange("code", event.target.value)}
                            className="min-h-64 font-mono text-sm"
                        />
                    </Field>
                </div>
            )

        case "terminal":
            return (
                <div className="grid gap-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Shell">
                            <Input value={getString(content.shell)} onChange={(event) => onContentChange("shell", event.target.value)} placeholder="bash, zsh, powershell" />
                        </Field>
                        <Field label="Рабочая директория">
                            <Input value={getString(content.cwd)} onChange={(event) => onContentChange("cwd", event.target.value)} placeholder="~/project" />
                        </Field>
                    </div>
                    <Field label="Команда">
                        <Input value={getString(content.command)} onChange={(event) => onContentChange("command", event.target.value)} placeholder="php artisan migrate" />
                    </Field>
                    <Field label="Вывод">
                        <Textarea value={getString(content.output)} onChange={(event) => onContentChange("output", event.target.value)} className="min-h-40 font-mono text-sm" />
                    </Field>
                </div>
            )

        case "diff":
            return (
                <div className="grid gap-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Файл">
                            <Input value={getString(content.filename)} onChange={(event) => onContentChange("filename", event.target.value)} placeholder=".env" />
                        </Field>
                        <Field label="Язык подсветки">
                            <Input value={getString(content.language, "diff")} onChange={(event) => onContentChange("language", event.target.value)} placeholder="diff" />
                        </Field>
                    </div>
                    <Field label="Изменения">
                        <Textarea value={getString(content.code)} onChange={(event) => onContentChange("code", event.target.value)} className="min-h-52 font-mono text-sm" />
                    </Field>
                </div>
            )

        case "file_tree":
            return (
                <div className="grid gap-4">
                    <Field label="Название">
                        <Input value={getString(content.title)} onChange={(event) => onContentChange("title", event.target.value)} placeholder="Структура проекта" />
                    </Field>
                    <Field label="Дерево файлов">
                        <Textarea value={getString(content.tree)} onChange={(event) => onContentChange("tree", event.target.value)} className="min-h-52 font-mono text-sm" />
                    </Field>
                </div>
            )

        case "callout":
            return (
                <div className="grid gap-4">
                    <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                        <Field label="Тип">
                            <Select value={getString(content.variant, "info")} onValueChange={(value) => onContentChange("variant", value)}>
                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="info">Информация</SelectItem>
                                    <SelectItem value="tip">Совет</SelectItem>
                                    <SelectItem value="success">Успех</SelectItem>
                                    <SelectItem value="warning">Предупреждение</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label="Заголовок">
                            <Input value={getString(content.title)} onChange={(event) => onContentChange("title", event.target.value)} placeholder="На заметку" />
                        </Field>
                    </div>
                    <Field label="Текст">
                        <Textarea value={getString(content.text)} onChange={(event) => onContentChange("text", event.target.value)} className="min-h-28" />
                    </Field>
                </div>
            )

        case "code_snippet":
            return <CodeSnippetPickerFields content={content} snippets={codeSnippets} onChange={onContentChange} />

        case "link":
            return (
                <div className="grid gap-4">
                    <Field label="URL">
                        <Input value={getString(content.url)} onChange={(event) => onContentChange("url", event.target.value)} placeholder="https://..." />
                    </Field>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Название">
                            <Input value={getString(content.title)} onChange={(event) => onContentChange("title", event.target.value)} />
                        </Field>
                        <Field label="Описание">
                            <Input value={getString(content.description)} onChange={(event) => onContentChange("description", event.target.value)} />
                        </Field>
                    </div>
                </div>
            )

        case "divider":
            return (
                <div className="flex items-center gap-3 rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">
                    <ListPlus className="size-4" />
                    Разделитель не требует дополнительных настроек.
                </div>
            )
    }
}


function PublicationPreview({ form }: { form: PublicationFormState }) {
    return (
        <Card className="mx-auto max-w-5xl shadow-sm">
            {form.cover_image_path && (
                <div className="border-b bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.cover_image_path} alt={form.title} className="max-h-[420px] w-full object-cover" />
                </div>
            )}
            <CardContent className="space-y-7 p-6 md:p-10">
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                            <ImageIcon className="size-3.5" />
                            {publicationTypeLabels[form.type]}
                        </div>
                        {form.tags.map((tag) => (
                            <span key={tag} className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                                {tag}
                            </span>
                        ))}
                    </div>
                    <h1 className={cn("text-4xl font-semibold tracking-tight md:text-6xl", !form.title && "text-muted-foreground")}>
                        {form.title || "Заголовок публикации"}
                    </h1>
                    {form.excerpt && <p className="max-w-3xl text-lg leading-8 text-muted-foreground">{form.excerpt}</p>}
                    <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock3 className="size-4" />
                        {form.reading_time_minutes || calculateEstimatedReadingTime(form.blocks)} мин. чтения
                    </div>
                </div>

                <Separator />

                <div className="space-y-7">
                    {form.blocks.map((block, index) => (
                        <PublicationBlockRenderer key={block.client_id || index} block={{ ...block, sort_order: index }} />
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            {children}
        </div>
    )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-4">
            <span className="text-muted-foreground">{label}</span>
            <span className="max-w-44 truncate text-right font-medium">{value}</span>
        </div>
    )
}
