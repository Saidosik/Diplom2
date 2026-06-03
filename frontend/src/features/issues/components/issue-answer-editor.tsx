"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Send, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { AuthRequiredMessage } from "@/features/auth/components/auth-required-message"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createIssueAnswer } from "@/features/issues/api"
import { getMySnippets } from "@/features/playground/api"
import { CodeSnippetPickerFields } from "@/features/playground/components/code-snippet-picker-fields"
import type { CodeSnippet } from "@/features/playground/types"
import { issueBlockTypeLabels } from "@/features/issues/lib/issue-labels"
import type { IssueAnswerPayload, IssueBlock, IssueBlockType } from "@/features/issues/types"
import { defaultIssueContentByType } from "@/features/issues/components/issue-question-editor"

type IssueAnswerEditorProps = {
    questionId: number
    isAuthenticated?: boolean
}

const answerBlockTypes: IssueBlockType[] = ["paragraph", "markdown", "code", "code_snippet", "terminal", "diff", "file_tree", "callout", "image", "quote", "warning", "divider"]

function createClientId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID()
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function makeBlock(type: IssueBlockType, sortOrder: number): IssueBlock {
    return {
        client_id: createClientId(),
        type,
        sort_order: sortOrder,
        content: defaultIssueContentByType(type),
    }
}

function getString(value: unknown, fallback = "") {
    return typeof value === "string" ? value : fallback
}

export function IssueAnswerEditor({ questionId, isAuthenticated = false }: IssueAnswerEditorProps) {
    const router = useRouter()
    const [blocks, setBlocks] = React.useState<IssueBlock[]>(() => [makeBlock("paragraph", 0), makeBlock("code", 1)])
    const [pending, setPending] = React.useState(false)
    const [codeSnippets, setCodeSnippets] = React.useState<CodeSnippet[]>([])

    React.useEffect(() => {
        if (!isAuthenticated) return

        getMySnippets()
            .then(setCodeSnippets)
            .catch(() => null)
    }, [isAuthenticated])

    const payload = React.useMemo<IssueAnswerPayload>(() => ({
        status: "published",
        blocks: blocks.map((block, index) => ({
            type: block.type,
            sort_order: index,
            content: block.content || {},
        })),
    }), [blocks])

    function addBlock(type: IssueBlockType) {
        setBlocks((current) => [...current, makeBlock(type, current.length)])
    }

    function updateBlockType(index: number, type: IssueBlockType) {
        setBlocks((current) => current.map((block, blockIndex) => {
            if (blockIndex !== index) return block
            return { ...block, type, content: defaultIssueContentByType(type) }
        }))
    }

    function updateBlockContent(index: number, key: string, value: unknown) {
        setBlocks((current) => current.map((block, blockIndex) => {
            if (blockIndex !== index) return block
            return {
                ...block,
                content: {
                    ...block.content,
                    [key]: value,
                },
            }
        }))
    }

    function removeBlock(index: number) {
        setBlocks((current) => {
            if (current.length <= 1) {
                toast.error("Ответ не может быть пустым")
                return current
            }

            return current.filter((_, blockIndex) => blockIndex !== index)
        })
    }

    async function submit() {
        setPending(true)

        try {
            await createIssueAnswer(questionId, payload)
            toast.success("Ответ опубликован")
            setBlocks([makeBlock("paragraph", 0), makeBlock("code", 1)])
            router.refresh()
        } catch (error) {
            console.log("[CREATE_ISSUE_ANSWER_ERROR]", error)
            toast.error("Не удалось отправить ответ")
        } finally {
            setPending(false)
        }
    }

    if (!isAuthenticated) {
        return (
            <AuthRequiredMessage
                title="Хотите оставить ответ?"
                description="Ответить на вопрос можно после входа в аккаунт. Так автор вопроса увидит, кто помог, а вы сможете редактировать свои ответы."
            />
        )
    }

    return (
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle>Ваш ответ</CardTitle>
                <CardDescription>
                    Можно добавить текст, код, терминал, diff, дерево файлов, изображение или предупреждение.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    {answerBlockTypes.map((type) => (
                        <Button key={type} type="button" variant="outline" size="sm" onClick={() => addBlock(type)}>
                            <Plus className="size-3.5" />
                            {issueBlockTypeLabels[type]}
                        </Button>
                    ))}
                </div>

                <div className="space-y-4">
                    {blocks.map((block, index) => (
                        <Card key={block.client_id || `${block.type}-${index}`} className="border-dashed bg-background/60">
                            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
                                <select
                                    value={block.type}
                                    onChange={(event) => updateBlockType(index, event.target.value as IssueBlockType)}
                                    className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                                >
                                    {answerBlockTypes.map((type) => (
                                        <option key={type} value={type}>{issueBlockTypeLabels[type]}</option>
                                    ))}
                                </select>

                                <Button type="button" variant="ghost" size="icon" onClick={() => removeBlock(index)}>
                                    <Trash2 className="size-4" />
                                </Button>
                            </CardHeader>

                            <CardContent>
                                <AnswerBlockFields block={block} index={index} onChange={updateBlockContent} codeSnippets={codeSnippets} />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Button onClick={submit} disabled={pending}>
                    {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    Опубликовать ответ
                </Button>
            </CardContent>
        </Card>
    )
}

type AnswerBlockFieldsProps = {
    block: IssueBlock
    index: number
    onChange: (index: number, key: string, value: unknown) => void
    codeSnippets: CodeSnippet[]
}

function AnswerBlockFields({ block, index, onChange, codeSnippets }: AnswerBlockFieldsProps) {
    const content = block.content || {}

    if (["paragraph", "markdown", "quote", "warning"].includes(block.type)) {
        return (
            <Textarea
                value={getString(content.text)}
                onChange={(event) => onChange(index, "text", event.target.value)}
                rows={block.type === "markdown" ? 8 : 4}
                placeholder="Текст ответа"
            />
        )
    }

    if (block.type === "code") {
        return (
            <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                    <Input value={getString(content.language)} onChange={(event) => onChange(index, "language", event.target.value)} placeholder="Язык" />
                    <Input value={getString(content.filename)} onChange={(event) => onChange(index, "filename", event.target.value)} placeholder="Файл" />
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
                    <Input value={getString(content.shell)} onChange={(event) => onChange(index, "shell", event.target.value)} placeholder="Shell" />
                    <Input value={getString(content.cwd)} onChange={(event) => onChange(index, "cwd", event.target.value)} placeholder="~/project" />
                </div>
                <Input value={getString(content.command)} onChange={(event) => onChange(index, "command", event.target.value)} placeholder="Команда" />
                <Textarea value={getString(content.output)} onChange={(event) => onChange(index, "output", event.target.value)} rows={6} className="font-mono text-sm" placeholder="Вывод" />
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
                <Input value={getString(content.title)} onChange={(event) => onChange(index, "title", event.target.value)} placeholder="Название" />
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
                <Textarea value={getString(content.text)} onChange={(event) => onChange(index, "text", event.target.value)} rows={4} placeholder="Текст" />
            </div>
        )
    }

    if (block.type === "image") {
        return (
            <div className="space-y-3">
                <Input value={getString(content.src)} onChange={(event) => onChange(index, "src", event.target.value)} placeholder="URL изображения" />
                <Input value={getString(content.alt)} onChange={(event) => onChange(index, "alt", event.target.value)} placeholder="Alt" />
                <Input value={getString(content.caption)} onChange={(event) => onChange(index, "caption", event.target.value)} placeholder="Подпись" />
            </div>
        )
    }

    return <div className="text-sm text-muted-foreground">Разделитель без настроек.</div>
}
