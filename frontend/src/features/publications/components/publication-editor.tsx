"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
    ArrowDown,
    ArrowUp,
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
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { assistPublication, type PublicationAssistResponse, type SourceSuggestion } from "@/features/ai-api"
import { getMySnippets } from "@/features/playground/api"
import { ContentAttachmentsField } from "@/features/files/components/content-attachments-field"
import { CodeSnippetPickerFields } from "@/features/playground/components/code-snippet-picker-fields"
import type { CodeSnippet } from "@/features/playground/types"
import { createPublication, deletePublication, updatePublication } from "@/features/publications/api"
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
    tags: string
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
        tags: (publication?.tags || []).map((tag) => tag.name).join(", "),
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

    React.useEffect(() => {
        getMySnippets()
            .then(setCodeSnippets)
            .catch(() => null)
    }, [])

    const isEditing = Boolean(initialPublication?.id)
    const estimatedReadingTime = React.useMemo(() => calculateEstimatedReadingTime(form.blocks), [form.blocks])

    const payload = React.useMemo<PublicationPayload>(() => ({
        type: form.type,
        status: form.status,
        title: form.title.trim(),
        excerpt: form.excerpt.trim() || null,
        cover_image_path: form.cover_image_path.trim() || null,
        reading_time_minutes: form.reading_time_minutes.trim() ? Number(form.reading_time_minutes) : null,
        tags: form.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        attachment_ids: form.attachmentIds,
        blocks: form.blocks.map((block, index) => ({
            type: block.type,
            sort_order: index,
            content: block.content || {},
        })),
    }), [form])

    function updateField<Key extends keyof PublicationFormState>(field: Key, value: PublicationFormState[Key]) {
        setForm((current) => ({ ...current, [field]: value }))
    }

    function addBlock(type: PublicationBlockType) {
        setForm((current) => ({
            ...current,
            blocks: [...current.blocks, makeBlock(type, current.blocks.length)],
        }))
    }

    function updateBlock(index: number, patch: Partial<PublicationBlock>) {
        setForm((current) => ({
            ...current,
            blocks: current.blocks.map((block, blockIndex) => {
                if (blockIndex !== index) return block
                return { ...block, ...patch }
            }),
        }))
    }

    function updateBlockContent(index: number, key: string, value: unknown) {
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

    function removeBlock(index: number) {
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

    async function save(status: PublicationStatus) {
        if (!payload.title) {
            toast.error("Введите заголовок публикации")
            return
        }

        setPendingAction(status === "published" ? "publish" : "draft")

        try {
            const result = isEditing && initialPublication
                ? await updatePublication(initialPublication.id, { ...payload, status })
                : await createPublication({ ...payload, status })

            toast.success(status === "published" ? "Публикация опубликована" : "Черновик сохранён")

            if (status === "published") {
                router.push(`/publications/${result.slug}`)
                router.refresh()
                return
            }

            router.push(`/publications/editor/${result.id}`)
            router.refresh()
        } catch (error) {
            const message = error instanceof Error ? error.message : "Не удалось сохранить публикацию"
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
                    <p className="text-sm text-muted-foreground">
                        Собери материал из блоков: текст, код, терминал, diff, дерево файлов, изображения, ссылки и callout-блоки.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" type="button" onClick={() => save("draft")} disabled={pendingAction !== null}>
                        {pendingAction === "draft" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                        Сохранить черновик
                    </Button>
                    <Button type="button" onClick={() => save("published")} disabled={pendingAction !== null}>
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

            <Tabs defaultValue="editor" className="space-y-6">
                <TabsList variant="line">
                    <TabsTrigger value="editor">
                        <LayoutTemplate className="size-4" />
                        Редактор
                    </TabsTrigger>
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
                                        <Input
                                            id="publication-tags"
                                            value={form.tags}
                                            onChange={(event) => updateField("tags", event.target.value)}
                                            placeholder="Laravel, API, PostgreSQL, Next.js"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Указывай через запятую. Теги помогут находить публикации в ленте.
                                        </p>
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
                                        <Input
                                            id="publication-cover"
                                            value={form.cover_image_path}
                                            onChange={(event) => updateField("cover_image_path", event.target.value)}
                                            placeholder="URL изображения или путь в storage"
                                        />
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
                                    <SummaryRow label="Название" value={form.title || "Не заполнено"} />
                                    <SummaryRow label="Тип" value={publicationTypeLabels[form.type]} />
                                    <SummaryRow label="Теги" value={form.tags || "Не указаны"} />
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

                <TabsContent value="preview">
                    <PublicationPreview form={form} />
                </TabsContent>
            </Tabs>
        </div>
    )
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
                            <Button type="button" variant="outline" size="sm" onClick={() => onApply({ tags: result.suggested_tags.join(", ") })}>Теги</Button>
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
                isDragging && "scale-[0.99] border-primary/60 opacity-60 shadow-lg"
            )}
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
                    <Button variant="destructive" size="icon-sm" type="button" onClick={onRemove}>
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
                        {form.tags.split(",").map((tag) => tag.trim()).filter(Boolean).map((tag) => (
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
