"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
    ArrowDown,
    ArrowUp,
    AlertTriangle,
    CheckCircle2,
    Eye,
    GripVertical,
    Loader2,
    Plus,
    Save,
    Send,
    Sparkles,
    Trash2,
    WandSparkles,
    XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { assistQuestion, draftAnswerFromQuestion, type QuestionAssistResponse, type QuestionDraftAnswerResponse } from "@/features/ai-api"
import { getMySnippets } from "@/features/playground/api"
import { ContentAttachmentsField } from "@/features/files/components/content-attachments-field"
import { CodeSnippetPickerFields } from "@/features/playground/components/code-snippet-picker-fields"
import type { CodeSnippet } from "@/features/playground/types"
import type { RagSource } from "@/features/ai-rag/types"
import { createIssueQuestion, deleteIssueQuestion, updateIssueQuestion } from "@/features/issues/api"
import { IssueBlockRenderer } from "@/features/issues/components/issue-block-renderer"
import { IssueBreadcrumbs } from "@/features/issues/components/issue-breadcrumbs"
import { issueBlockTypeLabels, issueStatusLabels } from "@/features/issues/lib/issue-labels"
import type {
    IssueBlock,
    IssueBlockContent,
    IssueBlockType,
    IssueQuestion,
    IssueQuestionPayload,
    IssueQuestionStatus,
} from "@/features/issues/types"

type IssueQuestionEditorProps = {
    initialQuestion?: IssueQuestion | null
}

type IssueQuestionFormState = {
    title: string
    status: IssueQuestionStatus
    excerpt: string
    tags: string
    attachmentIds: number[]
    blocks: IssueBlock[]
}

const blockTypes: IssueBlockType[] = [
    "heading",
    "paragraph",
    "markdown",
    "code",
    "terminal",
    "diff",
    "file_tree",
    "callout",
    "code_snippet",
    "image",
    "quote",
    "warning",
    "divider",
]

function createClientId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID()
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function defaultIssueContentByType(type: IssueBlockType): IssueBlockContent {
    switch (type) {
        case "heading":
            return { text: "Кратко сформулируй проблему", level: 2 }
        case "paragraph":
            return { text: "Опиши, что должно работать, что происходит сейчас и какие ошибки видишь." }
        case "markdown":
            return { text: "### Что уже проверено\n\n- пункт 1\n- пункт 2" }
        case "code":
            return { language: "php", filename: "example.php", code: "<?php\n\n// Вставь проблемный участок кода" }
        case "terminal":
            return { shell: "bash", cwd: "~/project", command: "php artisan queue:work", output: "" }
        case "diff":
            return { filename: "config/queue.php", language: "diff", code: "- 'default' => env('QUEUE_CONNECTION', 'sync'),\n+ 'default' => env('QUEUE_CONNECTION', 'redis')," }
        case "file_tree":
            return { title: "Структура", tree: "app/\n  Jobs/\n  Services/\nconfig/\n  queue.php" }
        case "callout":
            return { variant: "info", title: "Окружение", text: "Укажи версии Laravel, PHP, Node.js, базу данных и способ запуска." }
        case "code_snippet":
            return { snippet_id: "", title: "", language: "php", code: "", stdin: "", href: "", note: "" }
        case "image":
            return { src: "", alt: "", caption: "" }
        case "quote":
            return { text: "Текст ошибки или важная цитата из документации." }
        case "warning":
            return { text: "Важное ограничение, версия библиотеки или условие запуска." }
        case "divider":
            return {}
    }
}

function makeBlock(type: IssueBlockType, sortOrder: number): IssueBlock {
    return {
        client_id: createClientId(),
        type,
        sort_order: sortOrder,
        content: defaultIssueContentByType(type),
    }
}

function normalizeBlocks(blocks?: IssueBlock[]): IssueBlock[] {
    if (!blocks?.length) {
        return [makeBlock("paragraph", 0), makeBlock("code", 1)]
    }

    return blocks.map((block, index) => ({
        ...block,
        client_id: block.client_id || createClientId(),
        sort_order: index,
        content: block.content || defaultIssueContentByType(block.type),
    }))
}

function createInitialState(question?: IssueQuestion | null): IssueQuestionFormState {
    return {
        title: question?.title || "",
        status: question?.status || "draft",
        excerpt: question?.excerpt || "",
        tags: question?.tags?.map((tag) => tag.name).join(", ") || "",
        attachmentIds: (question?.attachments || []).map((attachment) => attachment.user_file_id),
        blocks: normalizeBlocks(question?.blocks),
    }
}

function getBlockKey(block: IssueBlock) {
    return block.client_id || (block.id ? `block-${block.id}` : `${block.type}-${block.sort_order}`)
}

function getString(value: unknown, fallback = "") {
    return typeof value === "string" ? value : fallback
}

function getNumber(value: unknown, fallback: number) {
    return typeof value === "number" ? value : fallback
}

function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number) {
    const nextItems = [...items]
    const [removed] = nextItems.splice(fromIndex, 1)
    nextItems.splice(toIndex, 0, removed)
    return nextItems
}

function parseTags(value: string) {
    return value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 8)
}

export function IssueQuestionEditor({ initialQuestion }: IssueQuestionEditorProps) {
    const router = useRouter()
    const [form, setForm] = React.useState<IssueQuestionFormState>(() => createInitialState(initialQuestion))
    const [pendingAction, setPendingAction] = React.useState<"draft" | "publish" | "delete" | null>(null)
    const [draggedBlockKey, setDraggedBlockKey] = React.useState<string | null>(null)
    const [assistantPending, setAssistantPending] = React.useState(false)
    const [assistantResult, setAssistantResult] = React.useState<QuestionAssistResponse | null>(null)
    const [draftAnswerPending, setDraftAnswerPending] = React.useState(false)
    const [draftAnswer, setDraftAnswer] = React.useState<QuestionDraftAnswerResponse | null>(null)
    const [codeSnippets, setCodeSnippets] = React.useState<CodeSnippet[]>([])

    React.useEffect(() => {
        getMySnippets()
            .then(setCodeSnippets)
            .catch(() => null)
    }, [])

    const isEditing = Boolean(initialQuestion?.id)

    const payload = React.useMemo<IssueQuestionPayload>(() => ({
        title: form.title.trim(),
        status: form.status,
        excerpt: form.excerpt.trim() || null,
        tags: parseTags(form.tags),
        attachment_ids: form.attachmentIds,
        blocks: form.blocks.map((block, index) => ({
            type: block.type,
            sort_order: index,
            content: block.content || {},
        })),
    }), [form])

    function updateField<Key extends keyof IssueQuestionFormState>(field: Key, value: IssueQuestionFormState[Key]) {
        setForm((current) => ({ ...current, [field]: value }))
    }

    function addBlock(type: IssueBlockType) {
        setForm((current) => ({
            ...current,
            blocks: [...current.blocks, makeBlock(type, current.blocks.length)],
        }))
    }

    function updateBlock(index: number, patch: Partial<IssueBlock>) {
        setForm((current) => ({
            ...current,
            blocks: current.blocks.map((block, blockIndex) => blockIndex === index ? { ...block, ...patch } : block),
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

    function changeBlockType(index: number, type: IssueBlockType) {
        updateBlock(index, {
            type,
            content: defaultIssueContentByType(type),
        })
    }

    function removeBlock(index: number) {
        setForm((current) => {
            if (current.blocks.length <= 1) {
                toast.error("В вопросе должен остаться хотя бы один блок")
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
        const key = getBlockKey(form.blocks[index])
        setDraggedBlockKey(key)
        event.dataTransfer.effectAllowed = "move"
        event.dataTransfer.setData("text/plain", String(index))
    }

    function handleBlockDrop(targetIndex: number, event: React.DragEvent<HTMLElement>) {
        event.preventDefault()

        const sourceIndex = Number(event.dataTransfer.getData("text/plain"))
        if (Number.isNaN(sourceIndex)) {
            setDraggedBlockKey(null)
            return
        }

        reorderBlock(sourceIndex, targetIndex)
        setDraggedBlockKey(null)
    }

    async function submit(nextStatus: IssueQuestionStatus) {
        if (!payload.title) {
            toast.error("Укажи заголовок вопроса")
            return
        }

        setPendingAction(nextStatus === "published" ? "publish" : "draft")

        try {
            const nextPayload = { ...payload, status: nextStatus }
            const saved = isEditing && initialQuestion
                ? await updateIssueQuestion(initialQuestion.id, nextPayload)
                : await createIssueQuestion(nextPayload)

            toast.success(nextStatus === "published" ? "Вопрос опубликован" : "Черновик сохранён")
            router.push(nextStatus === "published" ? `/questions/${saved.slug}` : `/questions/editor/${saved.id}`)
            router.refresh()
        } catch (error) {
            console.log("[SAVE_ISSUE_ERROR]", error)
            toast.error("Не удалось сохранить вопрос")
        } finally {
            setPendingAction(null)
        }
    }

    async function destroy() {
        if (!initialQuestion?.id) return
        if (!confirm("Удалить этот вопрос?")) return

        setPendingAction("delete")

        try {
            await deleteIssueQuestion(initialQuestion.id)
            toast.success("Вопрос удалён")
            router.push("/questions/my")
            router.refresh()
        } catch (error) {
            console.log("[DELETE_ISSUE_ERROR]", error)
            toast.error("Не удалось удалить вопрос")
        } finally {
            setPendingAction(null)
        }
    }

    async function runAssistant() {
        setAssistantPending(true)

        try {
            const result = await assistQuestion(payload)
            setAssistantResult(result)
            toast.success("Вопрос проанализирован")
        } catch (error) {
            console.log("[QUESTION_ASSIST_ERROR]", error)
            toast.error("Не удалось выполнить анализ вопроса")
        } finally {
            setAssistantPending(false)
        }
    }

    async function generateDraftAnswer() {
        if (!payload.title && !payload.excerpt && payload.blocks.length === 0) {
            toast.error("Сначала опиши вопрос")
            return
        }

        setDraftAnswerPending(true)

        try {
            const result = await draftAnswerFromQuestion(payload)
            setDraftAnswer(result)
            toast.success("AI подготовил предварительный ответ")
        } catch (error) {
            console.log("[QUESTION_DRAFT_ANSWER_ERROR]", error)
            toast.error("Не удалось подготовить AI-ответ")
        } finally {
            setDraftAnswerPending(false)
        }
    }

    function applyAssistantPatch(patch: Partial<Pick<IssueQuestionFormState, "title" | "excerpt" | "tags">>) {
        setForm((current) => ({
            ...current,
            ...patch,
        }))
    }

    return (
        <div className="space-y-6">
            <IssueBreadcrumbs
                items={[
                    { label: "Вопросы", href: "/questions" },
                    { label: isEditing ? "Редактирование" : "Новый вопрос" },
                ]}
            />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-6">
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle>{isEditing ? "Редактирование вопроса" : "Новый вопрос"}</CardTitle>
                            <CardDescription>
                                Опиши проблему блоками: текст, Markdown, код, изображение или предупреждение.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="title">Заголовок</Label>
                                <Input
                                    id="title"
                                    value={form.title}
                                    onChange={(event) => updateField("title", event.target.value)}
                                    placeholder="Например: Почему Laravel возвращает 419 при отправке формы?"
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="status">Статус</Label>
                                    <select
                                        id="status"
                                        value={form.status}
                                        onChange={(event) => updateField("status", event.target.value as IssueQuestionStatus)}
                                        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                    >
                                        {Object.entries(issueStatusLabels).map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="tags">Теги</Label>
                                    <Input
                                        id="tags"
                                        value={form.tags}
                                        onChange={(event) => updateField("tags", event.target.value)}
                                        placeholder="php, laravel, postgres"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="excerpt">Краткая суть</Label>
                                <Textarea
                                    id="excerpt"
                                    value={form.excerpt}
                                    onChange={(event) => updateField("excerpt", event.target.value)}
                                    placeholder="Коротко опиши проблему. Если оставить пустым, сервер возьмёт текст из первого блока."
                                    rows={3}
                                />
                            </div>

                            <ContentAttachmentsField
                                value={form.attachmentIds}
                                onChange={(attachmentIds) => updateField("attachmentIds", attachmentIds)}
                                initialAttachments={initialQuestion?.attachments || []}
                                description="Прикрепи логи, скриншоты, архив с кодом или конфигурационные файлы к вопросу."
                            />
                        </CardContent>
                    </Card>

                    <Tabs defaultValue="constructor" className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="constructor">Конструктор</TabsTrigger>
                            <TabsTrigger value="preview">
                                <Eye className="size-4" />
                                Предпросмотр
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="constructor" className="space-y-4">
                            <Card className="shadow-sm">
                                <CardHeader>
                                    <CardTitle>Блоки вопроса</CardTitle>
                                    <CardDescription>
                                        Блоки можно перетаскивать мышкой за иконку слева.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex flex-wrap gap-2">
                                        {blockTypes.map((type) => (
                                            <Button key={type} type="button" variant="outline" size="sm" onClick={() => addBlock(type)}>
                                                <Plus className="size-3.5" />
                                                {issueBlockTypeLabels[type]}
                                            </Button>
                                        ))}
                                    </div>

                                    <Separator />

                                    <div className="space-y-4">
                                        {form.blocks.map((block, index) => {
                                            const key = getBlockKey(block)
                                            const isDragging = draggedBlockKey === key

                                            return (
                                                <Card
                                                    key={key}
                                                    draggable
                                                    onDragStart={(event) => handleBlockDragStart(index, event)}
                                                    onDragOver={(event) => event.preventDefault()}
                                                    onDrop={(event) => handleBlockDrop(index, event)}
                                                    onDragEnd={() => setDraggedBlockKey(null)}
                                                    className={cn("border-dashed bg-background/60", isDragging && "opacity-50")}
                                                >
                                                    <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
                                                        <div className="flex items-center gap-2">
                                                            <GripVertical className="size-5 cursor-grab text-muted-foreground" />
                                                            <select
                                                                value={block.type}
                                                                onChange={(event) => changeBlockType(index, event.target.value as IssueBlockType)}
                                                                className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                                                            >
                                                                {blockTypes.map((type) => (
                                                                    <option key={type} value={type}>{issueBlockTypeLabels[type]}</option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div className="flex items-center gap-1">
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => moveBlock(index, -1)} disabled={index === 0}>
                                                                <ArrowUp className="size-4" />
                                                            </Button>
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => moveBlock(index, 1)} disabled={index === form.blocks.length - 1}>
                                                                <ArrowDown className="size-4" />
                                                            </Button>
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeBlock(index)}>
                                                                <Trash2 className="size-4" />
                                                            </Button>
                                                        </div>
                                                    </CardHeader>

                                                    <CardContent className="space-y-3">
                                                        <BlockFields
                                                            block={block}
                                                            index={index}
                                                            onChange={updateBlockContent}
                                                            codeSnippets={codeSnippets}
                                                        />
                                                    </CardContent>
                                                </Card>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="preview">
                            <Card className="shadow-sm">
                                <CardContent className="space-y-6 p-6 md:p-8">
                                    <div className="space-y-3">
                                        <h1 className="text-4xl font-semibold tracking-tight">{form.title || "Заголовок вопроса"}</h1>
                                        {form.excerpt && <p className="text-muted-foreground">{form.excerpt}</p>}
                                    </div>

                                    <div className="space-y-6">
                                        {form.blocks.map((block) => (
                                            <IssueBlockRenderer key={getBlockKey(block)} block={block} />
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
                    <QuestionAssistantCard
                        pending={assistantPending}
                        result={assistantResult}
                        draftPending={draftAnswerPending}
                        draftAnswer={draftAnswer}
                        onRun={runAssistant}
                        onGenerateDraftAnswer={generateDraftAnswer}
                        onApply={applyAssistantPatch}
                    />

                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle>Сводка</CardTitle>
                            <CardDescription>Проверь вопрос перед публикацией.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="rounded-3xl border bg-muted/30 p-4">
                                <div className="text-muted-foreground">Заголовок</div>
                                <div className="mt-1 font-medium">{form.title || "Не указан"}</div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-3xl border bg-muted/30 p-4">
                                    <div className="text-muted-foreground">Блоков</div>
                                    <div className="mt-1 text-xl font-semibold">{form.blocks.length}</div>
                                </div>
                                <div className="rounded-3xl border bg-muted/30 p-4">
                                    <div className="text-muted-foreground">Тегов</div>
                                    <div className="mt-1 text-xl font-semibold">{parseTags(form.tags).length}</div>
                                </div>
                                <div className="rounded-3xl border bg-muted/30 p-4">
                                    <div className="text-muted-foreground">Вложений</div>
                                    <div className="mt-1 text-xl font-semibold">{form.attachmentIds.length}</div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Button disabled={pendingAction !== null} onClick={() => submit("published")}>
                                    {pendingAction === "publish" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                                    Опубликовать
                                </Button>
                                <Button variant="outline" disabled={pendingAction !== null} onClick={() => submit("draft")}>
                                    {pendingAction === "draft" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                                    Сохранить черновик
                                </Button>
                                {isEditing && (
                                    <Button variant="destructive" disabled={pendingAction !== null} onClick={destroy}>
                                        {pendingAction === "delete" ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                                        Удалить вопрос
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </aside>
            </div>
        </div>
    )
}

function QuestionAssistantCard({
    pending,
    result,
    draftPending,
    draftAnswer,
    onRun,
    onGenerateDraftAnswer,
    onApply,
}: {
    pending: boolean
    result: QuestionAssistResponse | null
    draftPending: boolean
    draftAnswer: QuestionDraftAnswerResponse | null
    onRun: () => void
    onGenerateDraftAnswer: () => void
    onApply: (patch: Partial<Pick<IssueQuestionFormState, "title" | "excerpt" | "tags">>) => void
}) {
    return (
        <Card className="border-primary/20 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="size-5 text-primary" />
                    Анализ вопроса
                </CardTitle>
                <CardDescription>
                    Инструмент проверяет структуру, подбирает теги и ищет похожие вопросы.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-2">
                    <Button type="button" variant="secondary" className="w-full" onClick={onRun} disabled={pending || draftPending}>
                        {pending ? <Loader2 className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
                        Проанализировать
                    </Button>
                    <Button type="button" variant="outline" className="w-full" onClick={onGenerateDraftAnswer} disabled={pending || draftPending}>
                        {draftPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                        Подготовить AI-ответ
                    </Button>
                </div>

                {result ? (
                    <div className="space-y-4 text-sm">
                        <div className="space-y-2 rounded-2xl border bg-muted/30 p-3">
                            <p className="font-medium">Рекомендации</p>
                            <div className="grid gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => onApply({ title: result.suggested_title })}>Применить заголовок</Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => onApply({ excerpt: result.suggested_excerpt })}>Применить описание</Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => onApply({ tags: result.suggested_tags.join(", ") })}>Применить теги</Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="font-medium">Качество вопроса</p>
                            <div className="grid gap-2">
                                {result.quality_checklist.map((item) => (
                                    <div key={item.label} className="flex items-start gap-2 rounded-2xl border bg-background/50 p-2 text-xs">
                                        {item.passed ? <CheckCircle2 className="mt-0.5 size-3.5 text-primary" /> : <XCircle className="mt-0.5 size-3.5 text-muted-foreground" />}
                                        <span>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {result.missing_details.length > 0 ? (
                            <div className="space-y-2">
                                <p className="font-medium">Что добавить</p>
                                <ul className="list-disc space-y-1 pl-4 text-xs leading-5 text-muted-foreground">
                                    {result.missing_details.map((detail) => <li key={detail}>{detail}</li>)}
                                </ul>
                            </div>
                        ) : null}

                        <DuplicateRiskBlock risk={result.duplicate_risk} sources={result.duplicate_questions || []} />
                        <RagSourcesBlock title="Материалы из базы знаний" sources={result.rag_sources || []} />
                    </div>
                ) : null}

                {draftAnswer ? (
                    <div className="space-y-3 rounded-2xl border bg-muted/30 p-3 text-sm">
                        <div className="space-y-1">
                            <p className="font-medium">{draftAnswer.label}</p>
                            <p className="text-xs leading-5 text-muted-foreground">{draftAnswer.disclaimer}</p>
                        </div>
                        <div className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border bg-background p-3 text-xs leading-5">
                            {draftAnswer.answer}
                        </div>
                        <RagSourcesBlock title="Источники ответа" sources={draftAnswer.sources || []} />
                    </div>
                ) : null}
            </CardContent>
        </Card>
    )
}

function DuplicateRiskBlock({ risk, sources }: { risk?: "low" | "medium" | "high"; sources: RagSource[] }) {
    if (!sources.length) return null

    const label = risk === "high" ? "Высокий риск дубля" : risk === "medium" ? "Возможный дубль" : "Похожие вопросы"

    return (
        <div className="space-y-2 rounded-2xl border bg-background/60 p-3">
            <p className="flex items-center gap-2 font-medium">
                <AlertTriangle className="size-4 text-primary" />
                {label}
            </p>
            <RagSourcesList sources={sources.slice(0, 4)} />
        </div>
    )
}

function RagSourcesBlock({ title, sources }: { title: string; sources: RagSource[] }) {
    if (!sources.length) return null

    return (
        <div className="space-y-2">
            <p className="font-medium">{title}</p>
            <RagSourcesList sources={sources.slice(0, 5)} />
        </div>
    )
}

function RagSourcesList({ sources }: { sources: RagSource[] }) {
    return (
        <div className="grid gap-2">
            {sources.map((source) => (
                <a
                    key={`${source.type}-${source.id}`}
                    href={source.href || "#"}
                    className="rounded-2xl border bg-background/50 p-2 text-xs transition-colors hover:border-primary/50"
                    target={source.href ? undefined : undefined}
                >
                    <span className="block font-medium line-clamp-2">{source.title}</span>
                    <span className="mt-1 block line-clamp-2 text-muted-foreground">{source.content}</span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">score {Math.round((source.score || 0) * 100)}</span>
                </a>
            ))}
        </div>
    )
}

type BlockFieldsProps = {
    block: IssueBlock
    index: number
    onChange: (index: number, key: string, value: unknown) => void
    codeSnippets: CodeSnippet[]
}

function BlockFields({ block, index, onChange, codeSnippets }: BlockFieldsProps) {
    const content = block.content || {}

    if (block.type === "heading") {
        return (
            <div className="grid gap-3 md:grid-cols-[1fr_120px]">
                <Input value={getString(content.text)} onChange={(event) => onChange(index, "text", event.target.value)} placeholder="Текст заголовка" />
                <Input type="number" min={1} max={3} value={getNumber(content.level, 2)} onChange={(event) => onChange(index, "level", Number(event.target.value))} />
            </div>
        )
    }

    if (["paragraph", "markdown", "quote", "warning"].includes(block.type)) {
        return (
            <Textarea
                value={getString(content.text)}
                onChange={(event) => onChange(index, "text", event.target.value)}
                rows={block.type === "markdown" ? 8 : 4}
                placeholder="Текст блока"
            />
        )
    }

    if (block.type === "code") {
        return (
            <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                    <Input value={getString(content.language)} onChange={(event) => onChange(index, "language", event.target.value)} placeholder="Язык: php, ts, sql" />
                    <Input value={getString(content.filename)} onChange={(event) => onChange(index, "filename", event.target.value)} placeholder="Имя файла" />
                </div>
                <Textarea value={getString(content.code)} onChange={(event) => onChange(index, "code", event.target.value)} rows={10} className="font-mono text-sm" />
            </div>
        )
    }

    if (block.type === "code_snippet") {
        return <CodeSnippetPickerFields content={content} snippets={codeSnippets} onChange={(key, value) => onChange(index, key, value)} />
    }

    if (block.type === "terminal") {
        return (
            <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                    <Input value={getString(content.shell)} onChange={(event) => onChange(index, "shell", event.target.value)} placeholder="Shell: bash, zsh" />
                    <Input value={getString(content.cwd)} onChange={(event) => onChange(index, "cwd", event.target.value)} placeholder="~/project" />
                </div>
                <Input value={getString(content.command)} onChange={(event) => onChange(index, "command", event.target.value)} placeholder="Команда" />
                <Textarea value={getString(content.output)} onChange={(event) => onChange(index, "output", event.target.value)} rows={6} className="font-mono text-sm" placeholder="Вывод команды" />
            </div>
        )
    }

    if (block.type === "diff") {
        return (
            <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                    <Input value={getString(content.filename)} onChange={(event) => onChange(index, "filename", event.target.value)} placeholder="Файл" />
                    <Input value={getString(content.language, "diff")} onChange={(event) => onChange(index, "language", event.target.value)} placeholder="diff" />
                </div>
                <Textarea value={getString(content.code)} onChange={(event) => onChange(index, "code", event.target.value)} rows={8} className="font-mono text-sm" />
            </div>
        )
    }

    if (block.type === "file_tree") {
        return (
            <div className="space-y-3">
                <Input value={getString(content.title)} onChange={(event) => onChange(index, "title", event.target.value)} placeholder="Название дерева" />
                <Textarea value={getString(content.tree)} onChange={(event) => onChange(index, "tree", event.target.value)} rows={8} className="font-mono text-sm" />
            </div>
        )
    }

    if (block.type === "callout") {
        return (
            <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-[160px_1fr]">
                    <select value={getString(content.variant, "info")} onChange={(event) => onChange(index, "variant", event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                        <option value="info">Информация</option>
                        <option value="tip">Совет</option>
                        <option value="success">Успех</option>
                        <option value="warning">Предупреждение</option>
                    </select>
                    <Input value={getString(content.title)} onChange={(event) => onChange(index, "title", event.target.value)} placeholder="Заголовок" />
                </div>
                <Textarea value={getString(content.text)} onChange={(event) => onChange(index, "text", event.target.value)} rows={4} placeholder="Текст подсказки" />
            </div>
        )
    }

    if (block.type === "image") {
        return (
            <div className="space-y-3">
                <Input value={getString(content.src)} onChange={(event) => onChange(index, "src", event.target.value)} placeholder="URL изображения" />
                <Input value={getString(content.alt)} onChange={(event) => onChange(index, "alt", event.target.value)} placeholder="Alt-текст" />
                <Input value={getString(content.caption)} onChange={(event) => onChange(index, "caption", event.target.value)} placeholder="Подпись" />
            </div>
        )
    }

    return <div className="text-sm text-muted-foreground">Разделитель без настроек.</div>
}
