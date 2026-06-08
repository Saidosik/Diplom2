"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { Bot, FileText, Loader2, MessageSquarePlus, Paperclip, Search, Send, Sparkles, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MarkdownBlock } from "@/components/ui/MarkdownBlock"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { RagSourceCard } from "@/features/ai-rag/components/rag-source-card"
import { getMyFiles } from "@/features/files/api"
import type { UserFile } from "@/features/files/types"
import type { RagSource, RagSourceType } from "@/features/ai-rag/types"
import { cn } from "@/lib/utils"
import {
    createAiChatSession,
    deleteAiChatSession,
    getAiChatMessages,
    getAiChatSessions,
    getAiModels,
    sendAiChatMessage,
    streamAiChatMessage,
    uploadAiAttachment,
    AiStreamUnavailableError,
    aiErrorMessage,
} from "@/features/ai-chat/api"
import type { AiAttachment, AiChatMessage, AiChatMode, AiChatSession, AiContextScope, AiModel, AiStreamEvent } from "@/features/ai-chat/types"

const examples = [
    "Объясни, почему Redis queue не обрабатывает jobs",
    "Помоги составить план Laravel API для диплома",
    "Найди в материалах платформы всё про Reverb",
    "Проверь этот лог и предложи план исправления",
]

const aiModes: Array<{ value: AiChatMode; label: string; description: string }> = [
    { value: "chat", label: "Обычный чат", description: "Без обязательного поиска по базе знаний" },
    { value: "rag", label: "RAG-поиск", description: "Ответ с источниками платформы" },
    { value: "files", label: "Анализ файлов", description: "Контекст из вложений и личных файлов" },
    { value: "code", label: "Помощь с кодом", description: "Ошибки, рефакторинг, объяснение кода" },
    { value: "project", label: "Помощь по проекту", description: "Архитектура и дипломный backend/frontend" },
]

type ProcessingStep = {
    step: string
    text: string
    done?: boolean
}

export function AiChatPage() {
    const searchParams = useSearchParams()
    const initialQuery = searchParams.get("q") ?? ""
    const [sessions, setSessions] = React.useState<AiChatSession[]>([])
    const [activeSession, setActiveSession] = React.useState<AiChatSession | null>(null)
    const [messages, setMessages] = React.useState<AiChatMessage[]>([])
    const [models, setModels] = React.useState<AiModel[]>([])
    const [model, setModel] = React.useState<string>("")
    const [mode, setMode] = React.useState<AiChatMode>(initialQuery ? "rag" : "chat")
    const [type, setType] = React.useState<"all" | RagSourceType>("all")
    const [contextScope, setContextScope] = React.useState<AiContextScope>(initialQuery ? "all" : "none")
    const [input, setInput] = React.useState(initialQuery)
    const [attachments, setAttachments] = React.useState<AiAttachment[]>([])
    const [userFiles, setUserFiles] = React.useState<UserFile[]>([])
    const [selectedUserFileIds, setSelectedUserFileIds] = React.useState<number[]>([])
    const [sessionSearch, setSessionSearch] = React.useState("")
    const [steps, setSteps] = React.useState<ProcessingStep[]>([])
    const [isSending, setIsSending] = React.useState(false)
    const [isUploading, setIsUploading] = React.useState(false)
    const fileInputRef = React.useRef<HTMLInputElement | null>(null)
    const bottomRef = React.useRef<HTMLDivElement | null>(null)

    React.useEffect(() => {
        getAiModels()
            .then((items) => {
                setModels(items)
                setModel((current) => current || items[0]?.id || "")
            })
            .catch(() => toast.error("Не удалось загрузить список моделей"))

        getAiChatSessions()
            .then((items) => {
                setSessions(items)
                if (items[0]) {
                    void openSession(items[0])
                }
            })
            .catch(() => null)

        getMyFiles({ per_page: 40 })
            .then((payload) => setUserFiles(payload.data ?? []))
            .catch(() => null)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    React.useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    }, [messages, steps, isSending])

    const filteredSessions = React.useMemo(() => {
        const q = sessionSearch.trim().toLowerCase()
        if (!q) return sessions
        return sessions.filter((session) => session.title.toLowerCase().includes(q))
    }, [sessions, sessionSearch])

    async function openSession(session: AiChatSession) {
        setActiveSession(session)
        setModel(session.model || model)
        setMode((session.mode as AiChatMode) || "chat")
        setType(session.type || "all")
        setContextScope(session.context_scope || (session.mode === "rag" ? (session.type || "all") : "none"))
        setSteps([])
        setAttachments([])
        setSelectedUserFileIds([])
        try {
            const payload = await getAiChatMessages(session.id)
            setActiveSession(payload.session)
            setMessages(payload.data)
        } catch {
            toast.error("Не удалось загрузить сообщения")
        }
    }

    async function startNewChat() {
        setActiveSession(null)
        setMessages([])
        setSteps([])
        setAttachments([])
        setSelectedUserFileIds([])
        setMode("chat")
        setContextScope("none")
        setType("all")
        setInput("")
    }

    async function createEmptyChat() {
        try {
            const session = await createAiChatSession({ model, mode, context_scope: contextScope, type: contextScope === "none" ? "all" : contextScope })
            setSessions((items) => [session, ...items])
            await openSession(session)
        } catch {
            toast.error("Не удалось создать чат")
        }
    }

    async function removeSession(session: AiChatSession) {
        try {
            await deleteAiChatSession(session.id)
            setSessions((items) => items.filter((item) => item.id !== session.id))
            if (activeSession?.id === session.id) {
                void startNewChat()
            }
        } catch {
            toast.error("Не удалось удалить чат")
        }
    }

    async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(event.target.files ?? [])
        if (!files.length) return
        setIsUploading(true)
        try {
            const uploaded: AiAttachment[] = []
            for (const file of files.slice(0, 5)) {
                uploaded.push(await uploadAiAttachment(file, activeSession?.id))
            }
            setAttachments((items) => [...items, ...uploaded].slice(0, 8))
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Не удалось прикрепить файл")
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    async function handleSubmit(event?: React.FormEvent<HTMLFormElement>) {
        event?.preventDefault()
        const value = input.trim()
        if (value.length < 2 || isSending) return

        const pendingUserId = `user-${Date.now()}`
        const pendingAssistantId = `assistant-${Date.now()}`
        const selectedModel = model || models[0]?.id || null
        const selectedAttachments = attachments
        const selectedUserFiles = userFiles.filter((file) => selectedUserFileIds.includes(file.id))
        const pendingAttachments: AiAttachment[] = [
            ...selectedAttachments,
            ...selectedUserFiles.map((file) => ({
                id: -file.id,
                original_name: file.original_name,
                mime_type: file.mime_type,
                extension: undefined,
                size: file.size,
                preview: null,
            })),
        ]

        setIsSending(true)
        setSteps([])
        setInput("")
        setAttachments([])
        setSelectedUserFileIds([])
        setMessages((items) => [
            ...items,
            {
                id: pendingUserId,
                role: "user",
                content: value,
                attachments: pendingAttachments,
                sources: [],
                metadata: { model: selectedModel ?? undefined, mode, context_scope: contextScope },
            },
            {
                id: pendingAssistantId,
                role: "assistant",
                content: "",
                sources: [],
                metadata: { model: selectedModel ?? undefined, mode, context_scope: contextScope, thinking_steps: [] },
            },
        ])

        const payload = {
            message: value,
            session_id: activeSession?.id ?? null,
            mode,
            context_scope: contextScope,
            type: contextScope === "none" ? "all" : contextScope,
            model: selectedModel,
            attachment_ids: selectedAttachments.map((attachment) => attachment.id),
            user_file_ids: selectedUserFiles.map((file) => file.id),
        }

        try {
            await streamAiChatMessage(
                payload,
                {
                    onStatus(data) {
                        setSteps((items) => {
                            const withoutSame = items.filter((item) => item.step !== data.step)
                            return [...withoutSame.map((item) => ({ ...item, done: true })), data]
                        })
                    },
                    onToken(text) {
                        setMessages((items) => items.map((item) => item.id === pendingAssistantId ? { ...item, content: `${item.content}${text}` } : item))
                    },
                    onEvent(eventData) {
                        handleStreamEvent(eventData, pendingUserId, pendingAssistantId)
                    },
                }
            )
        } catch (error) {
            const canFallback = error instanceof AiStreamUnavailableError && error.retryable

            if (canFallback) {
                try {
                    toast.warning("Потоковый режим недоступен, ответ получен обычным запросом")
                    const response = await sendAiChatMessage(payload)
                    replacePendingMessages(pendingUserId, pendingAssistantId, response)
                    return
                } catch (fallbackError) {
                    setMessages((items) => items.filter((item) => item.id !== pendingAssistantId))
                    toast.error(aiErrorMessage(fallbackError instanceof Error ? fallbackError.message : undefined))
                    return
                }
            }

            setMessages((items) => items.filter((item) => item.id !== pendingAssistantId))
            toast.error(error instanceof Error ? error.message : "AI-помощник недоступен")
        } finally {
            setIsSending(false)
            setSteps((items) => items.map((item) => ({ ...item, done: true })))
        }
    }


    function replacePendingMessages(pendingUserId: string, pendingAssistantId: string, response: Awaited<ReturnType<typeof sendAiChatMessage>>) {
        const [savedUser, savedAssistant] = response.messages
        setActiveSession(response.session)
        setSessions((items) => [response.session, ...items.filter((item) => item.id !== response.session.id)])
        setMessages((items) => items.map((item) => {
            if (item.id === pendingUserId) return savedUser ?? item
            if (item.id === pendingAssistantId) return savedAssistant ?? item
            return item
        }))
    }

    const selectedUserFilesForComposer = React.useMemo(() => userFiles.filter((file) => selectedUserFileIds.includes(file.id)), [selectedUserFileIds, userFiles])

    function handleStreamEvent(eventData: AiStreamEvent, pendingUserId: string, pendingAssistantId: string) {
        if (eventData.event === "source") {
            setMessages((items) => items.map((item) => {
                if (item.id !== pendingAssistantId) return item
                const existing = item.sources ?? []
                if (existing.some((source) => source.id === eventData.data.id)) return item
                return { ...item, sources: [...existing, eventData.data as RagSource] }
            }))
        }

        if (eventData.event === "done") {
            const [savedUser, savedAssistant] = eventData.data.messages
            setActiveSession(eventData.data.session)
            setSessions((items) => [eventData.data.session, ...items.filter((item) => item.id !== eventData.data.session.id)])
            setMessages((items) => items.map((item) => {
                if (item.id === pendingUserId) return savedUser ?? item
                if (item.id === pendingAssistantId) return savedAssistant ?? item
                return item
            }))
        }

        if (eventData.event === "error") {
            toast.error(eventData.data.message)
        }
    }

    return (
        <div className="grid min-h-[calc(100vh-8rem)] gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="flex min-h-[calc(100vh-8rem)] flex-col rounded-2xl border bg-card">
                <div className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <div className="flex items-center gap-2 font-semibold">
                                <Bot className="size-4 text-primary" />
                                AI-чаты
                            </div>
                            <p className="text-xs text-muted-foreground">История диалогов с AI-помощником</p>
                        </div>
                        <Button size="icon" variant="outline" onClick={startNewChat} title="Новый чат">
                            <MessageSquarePlus className="size-4" />
                        </Button>
                    </div>
                    <Input value={sessionSearch} onChange={(event) => setSessionSearch(event.target.value)} placeholder="Найти чат" />
                    <Button className="w-full justify-start gap-2" variant="secondary" onClick={createEmptyChat}>
                        <Sparkles className="size-4" />
                        Создать пустой чат
                    </Button>
                </div>
                <Separator />
                <ScrollArea className="min-h-0 flex-1">
                    <div className="space-y-1 p-2">
                        {filteredSessions.length ? filteredSessions.map((session) => (
                            <div key={session.id} className={cn("group flex items-start gap-2 rounded-xl px-2 py-2 transition-colors hover:bg-muted", activeSession?.id === session.id && "bg-muted")}>
                                <button type="button" onClick={() => void openSession(session)} className="min-w-0 flex-1 text-left">
                                    <div className="line-clamp-1 text-sm font-medium">{session.title}</div>
                                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>{session.messages_count} сообщений</span>
                                        {session.model ? <span className="line-clamp-1">{modelLabel(models, session.model)}</span> : null}
                                    </div>
                                </button>
                                <Button size="icon" variant="ghost" className="size-7 opacity-0 group-hover:opacity-100" onClick={() => void removeSession(session)} title="Удалить чат">
                                    <Trash2 className="size-3.5" />
                                </Button>
                            </div>
                        )) : (
                            <p className="p-3 text-sm text-muted-foreground">Диалоги появятся после первого сообщения.</p>
                        )}
                    </div>
                </ScrollArea>
            </aside>

            <section className="flex min-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border bg-card">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="gap-1.5"><Bot className="size-3.5" /> AI Assistant</Badge>
                            <Badge variant="outline">{modeLabel(mode)}</Badge>
                            {contextScope !== "none" ? <Badge variant="outline">RAG: {scopeLabel(contextScope)}</Badge> : null}
                            <Badge variant="outline">streaming</Badge>
                            {attachments.length ? <Badge variant="outline">файлов: {attachments.length}</Badge> : null}
                        </div>
                        <h1 className="mt-2 text-xl font-semibold tracking-tight">{activeSession?.title ?? "Новый AI-чат"}</h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={mode} onValueChange={(value) => {
                            const nextMode = value as AiChatMode
                            setMode(nextMode)
                            if (nextMode === "rag" && contextScope === "none") {
                                setContextScope("all")
                                setType("all")
                            }
                            if (nextMode === "chat") {
                                setContextScope("none")
                                setType("all")
                            }
                        }}>
                            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {aiModes.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={contextScope} onValueChange={(value) => {
                            const scope = value as AiContextScope
                            setContextScope(scope)
                            setType(scope === "none" ? "all" : scope)
                            if (scope !== "none" && mode === "chat") setMode("rag")
                        }}>
                            <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Без базы знаний</SelectItem>
                                <SelectItem value="all">Все материалы</SelectItem>
                                <SelectItem value="publication">Публикации</SelectItem>
                                <SelectItem value="question">Вопросы</SelectItem>
                                <SelectItem value="answer">Ответы</SelectItem>
                                <SelectItem value="snippet">Сниппеты</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={model} onValueChange={setModel}>
                            <SelectTrigger className="w-[210px]"><SelectValue placeholder="Модель" /></SelectTrigger>
                            <SelectContent>
                                {models.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </header>

                <ScrollArea className="min-h-0 flex-1 bg-muted/20">
                    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 md:p-6">
                        {messages.length === 0 ? (
                            <EmptyChat onPick={setInput} />
                        ) : messages.map((message, index) => (
                            <ChatBubble key={`${message.id}-${index}`} message={message} models={models} isStreaming={isSending && index === messages.length - 1 && message.role === "assistant"} />
                        ))}

                        {isSending || steps.length ? <ThinkingSteps steps={steps} isSending={isSending} /> : null}
                        <div ref={bottomRef} />
                    </div>
                </ScrollArea>

                <form onSubmit={handleSubmit} className="border-t bg-background p-4">
                    <div className="mx-auto max-w-5xl space-y-3">
                        {(attachments.length || selectedUserFilesForComposer.length) ? (
                            <div className="flex flex-wrap gap-2">
                                {attachments.map((attachment) => (
                                    <span key={attachment.id} className="inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-xs">
                                        <FileText className="size-3.5" />
                                        <span className="max-w-48 truncate">{attachment.original_name}</span>
                                        <button type="button" onClick={() => setAttachments((items) => items.filter((item) => item.id !== attachment.id))}>
                                            <X className="size-3.5" />
                                        </button>
                                    </span>
                                ))}
                                {selectedUserFilesForComposer.map((file) => (
                                    <span key={`user-file-${file.id}`} className="inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-xs">
                                        <FileText className="size-3.5" />
                                        <span className="max-w-48 truncate">{file.original_name}</span>
                                        <button type="button" onClick={() => setSelectedUserFileIds((items) => items.filter((id) => id !== file.id))}>
                                            <X className="size-3.5" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        ) : null}
                        <div className="rounded-2xl border bg-card p-3 shadow-sm">
                            <Textarea
                                value={input}
                                onChange={(event) => setInput(event.target.value)}
                                placeholder={mode === "rag" ? "Спроси по материалам платформы..." : "Напиши сообщение, вставь код или приложи файл..."}
                                disabled={isSending}
                                className="min-h-24 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                                onKeyDown={(event) => {
                                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                                        void handleSubmit()
                                    }
                                }}
                            />
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
                                    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={isSending || isUploading}>
                                        {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
                                        Файл
                                    </Button>
                                    <Select
                                        value=""
                                        onValueChange={(value) => {
                                            const id = Number(value)
                                            if (!Number.isNaN(id)) {
                                                setSelectedUserFileIds((items) => items.includes(id) ? items : [...items, id].slice(0, 8))
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="h-9 w-[210px]">
                                            <SelectValue placeholder="Из моих файлов" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {userFiles.length ? userFiles.map((file) => (
                                                <SelectItem key={file.id} value={String(file.id)} disabled={selectedUserFileIds.includes(file.id)}>
                                                    {file.original_name}
                                                </SelectItem>
                                            )) : (
                                                <SelectItem value="empty" disabled>Файлов пока нет</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <span className="text-xs text-muted-foreground">Поддерживаются код, логи, .md, .json, .sql</span>
                                </div>
                                <Button type="submit" disabled={isSending || input.trim().length < 2} className="gap-2">
                                    {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                                    Отправить
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>
            </section>
        </div>
    )
}

function EmptyChat({ onPick }: { onPick: (value: string) => void }) {
    return (
        <Card className="border-dashed bg-background p-6">
            <div className="mx-auto max-w-3xl text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Bot className="size-6" />
                </div>
                <h2 className="mt-4 text-2xl font-semibold">AI-чат и поиск по платформе</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Пиши как в обычный чат, выбирай модель и режим. RAG-поиск по материалам платформы можно включить отдельно, а файлы использовать как контекст.
                </p>
                <div className="mt-6 grid gap-2 md:grid-cols-2">
                    {examples.map((example) => (
                        <Button key={example} variant="outline" className="h-auto justify-start whitespace-normal py-3 text-left" onClick={() => onPick(example)}>
                            <Search className="size-4" />
                            {example}
                        </Button>
                    ))}
                </div>
            </div>
        </Card>
    )
}

function ChatBubble({ message, models, isStreaming }: { message: AiChatMessage; models: AiModel[]; isStreaming?: boolean }) {
    const isUser = message.role === "user"
    const model = typeof message.metadata?.model === "string" ? message.metadata.model : null

    return (
        <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[88%] space-y-3", isUser ? "items-end" : "items-start")}>
                <div className={cn("rounded-2xl px-4 py-3 text-sm leading-6", isUser ? "bg-primary text-primary-foreground" : "border bg-background")}> 
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs opacity-80">
                        <span className="font-medium">{isUser ? "Ты" : "AI"}</span>
                        {model ? <span>{modelLabel(models, model)}</span> : null}
                        {isStreaming ? <span className="inline-flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> печатает</span> : null}
                    </div>
                    {message.content ? <MarkdownBlock content={message.content} /> : <TypingPlaceholder />}
                    {!isUser ? (
                        <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                            Сгенерировано AI и может содержать ошибки. Проверь источники, команды и версии библиотек перед применением.
                        </p>
                    ) : null}
                </div>

                {message.attachments?.length ? (
                    <div className="flex flex-wrap gap-2">
                        {message.attachments.map((attachment) => (
                            <span key={attachment.id} className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                                <FileText className="size-3.5" />
                                {attachment.original_name}
                            </span>
                        ))}
                    </div>
                ) : null}

                {!isUser && message.sources?.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                        {message.sources.slice(0, 4).map((source) => (
                            <RagSourceCard key={source.id} source={source} />
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    )
}

function TypingPlaceholder() {
    return (
        <div className="flex items-center gap-1 py-1">
            <span className="size-2 animate-pulse rounded-full bg-muted-foreground" />
            <span className="size-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:120ms]" />
            <span className="size-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:240ms]" />
        </div>
    )
}

function ThinkingSteps({ steps, isSending }: { steps: ProcessingStep[]; isSending: boolean }) {
    if (!steps.length && !isSending) return null

    return (
        <div className="mr-auto max-w-xl rounded-2xl border bg-background px-4 py-3 text-sm">
            <div className="mb-2 flex items-center gap-2 font-medium">
                {isSending ? <Loader2 className="size-4 animate-spin text-primary" /> : <Sparkles className="size-4 text-primary" />}
                Ход обработки
            </div>
            <div className="space-y-1 text-muted-foreground">
                {steps.map((item) => (
                    <div key={item.step} className="flex items-center gap-2">
                        <span className={cn("size-1.5 rounded-full", item.done ? "bg-primary" : "animate-pulse bg-muted-foreground")} />
                        {item.text}
                    </div>
                ))}
            </div>
        </div>
    )
}

function modeLabel(mode: AiChatMode) {
    return aiModes.find((item) => item.value === mode)?.label ?? "AI-чат"
}

function scopeLabel(scope: AiContextScope) {
    const labels: Record<AiContextScope, string> = {
        none: "выкл.",
        all: "всё",
        publication: "публикации",
        question: "вопросы",
        answer: "ответы",
        snippet: "сниппеты",
    }
    return labels[scope]
}

function modelLabel(models: AiModel[], id: string) {
    return models.find((model) => model.id === id)?.label ?? id
}
