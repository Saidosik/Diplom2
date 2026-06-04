"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Check, CheckCheck, ImagePlus, Paperclip, Send, Users } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getConversation, getMessages, markConversationRead, sendChatMessage, sendTypingStatus } from "@/features/chat/api"
import type { ChatConversation, ChatMessage, ChatParticipant, Paginated } from "@/features/chat/types"
import type { User } from "@/features/auth/types"
import { getMe } from "@/features/auth/api"
import { getEcho } from "@/lib/realtime/echo"
import { UserPresenceDot } from "@/features/presence/components/user-presence-dot"
import { ChatAttachmentView } from "./chat-attachment-view"


const MAX_CHAT_FILES = 5
const MAX_CHAT_FILE_SIZE_BYTES = 10 * 1024 * 1024
const CHAT_ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/zip",
    "application/x-zip-compressed",
    "application/json",
    "text/csv",
    "audio/mpeg",
    "audio/ogg",
    "video/mp4",
    "video/webm",
]

function isAllowedChatFile(file: File) {
    return CHAT_ALLOWED_MIME_TYPES.includes(file.type)
}

function fileSizeLabel(bytes: number) {
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
    return `${Math.max(1, Math.round(bytes / 1024))} КБ`
}

function initials(name?: string | null) {
    return (name ?? "U").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()
}

function timeLabel(value?: string | null) {
    if (!value) return ""
    return new Date(value).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
}

type MessagePayload = {
    conversation_id: number
    message: ChatMessage
}

type TypingPayload = {
    conversation_id: number
    user_id: number
    user: User
    is_typing: boolean
    typing_expires_at?: string | null
}

type ReadPayload = {
    conversation_id: number
    user_id: number
    last_read_at?: string | null
    participant?: ChatParticipant
}

type PresencePayload = {
    user: User
    user_id: number
    is_online: boolean
    last_seen_at?: string | null
    presence_status?: string
}

export function ChatRoomPage({ conversationId }: { conversationId: string }) {
    const queryClient = useQueryClient()
    const bottomRef = useRef<HTMLDivElement | null>(null)
    const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [body, setBody] = useState("")
    const [files, setFiles] = useState<File[]>([])
    const [typingUsers, setTypingUsers] = useState<Record<number, { user: User; expiresAt: number }>>({})

    const meQuery = useQuery({ queryKey: ["auth", "me"], queryFn: getMe, retry: false })
    const conversationQuery = useQuery({
        queryKey: ["chats", "conversation", conversationId],
        queryFn: () => getConversation(conversationId),
    })
    const messagesQuery = useQuery({
        queryKey: ["chats", "messages", conversationId],
        queryFn: () => getMessages(conversationId, { per_page: 80 }),
    })

    const messages = useMemo(() => [...(messagesQuery.data?.data ?? [])].reverse(), [messagesQuery.data?.data])

    const sendMutation = useMutation({
        mutationFn: () => sendChatMessage(conversationId, { body, attachments: files }),
        onMutate: () => {
            toast.loading("Отправляем сообщение", { id: "chat-send" })
        },
        onSuccess: () => {
            toast.success("Сообщение отправлено", { id: "chat-send" })
            setBody("")
            setFiles([])
            sendTypingStatus(conversationId, false).catch(() => null)
            queryClient.invalidateQueries({ queryKey: ["chats", "messages", conversationId] })
            queryClient.invalidateQueries({ queryKey: ["chats", "conversations"] })
        },
        onError: (error: Error) => toast.error(error.message, { id: "chat-send" }),
    })

    useEffect(() => {
        const echo = getEcho()
        if (!echo) return

        const channel = echo.private(`chats.${conversationId}`)

        channel.listen(".chat.message.created", (payload: MessagePayload) => {
            if (String(payload.conversation_id) !== String(conversationId)) return
            queryClient.setQueryData(["chats", "messages", conversationId], (current: Paginated<ChatMessage> | undefined) => {
                if (!current?.data) return current
                const exists = current.data.some((message: ChatMessage) => message.id === payload.message.id)
                if (exists) return current
                return { ...current, data: [payload.message, ...current.data] }
            })
            queryClient.invalidateQueries({ queryKey: ["chats", "conversations"] })
            markConversationRead(conversationId).catch(() => null)
        })

        channel.listen(".chat.typing.updated", (payload: TypingPayload) => {
            if (String(payload.conversation_id) !== String(conversationId)) return
            if (payload.user_id === meQuery.data?.id) return

            setTypingUsers((current) => {
                const next = { ...current }
                if (!payload.is_typing) {
                    delete next[payload.user_id]
                } else {
                    next[payload.user_id] = {
                        user: payload.user,
                        expiresAt: payload.typing_expires_at ? new Date(payload.typing_expires_at).getTime() : Date.now() + 8000,
                    }
                }
                return next
            })
        })

        channel.listen(".chat.read.updated", (payload: ReadPayload) => {
            if (String(payload.conversation_id) !== String(conversationId)) return
            queryClient.invalidateQueries({ queryKey: ["chats", "messages", conversationId] })
            queryClient.setQueryData(["chats", "conversation", conversationId], (current: ChatConversation | undefined) => {
                if (!current?.participants || !payload.participant) return current
                return {
                    ...current,
                    participants: current.participants.map((participant: ChatParticipant) => participant.user.id === payload.user_id ? payload.participant : participant),
                }
            })
        })

        channel.listen(".presence.updated", (payload: PresencePayload) => {
            queryClient.setQueryData(["chats", "conversation", conversationId], (current: ChatConversation | undefined) => {
                if (!current?.participants) return current
                return {
                    ...current,
                    participants: current.participants.map((participant: ChatParticipant) => participant.user.id === payload.user_id
                        ? { ...participant, user: { ...participant.user, ...payload.user } }
                        : participant),
                }
            })
        })

        return () => {
            echo.leave(`private-chats.${conversationId}`)
            echo.leave(`chats.${conversationId}`)
        }
    }, [conversationId, meQuery.data?.id, queryClient])

    useEffect(() => {
        markConversationRead(conversationId).catch(() => null)
    }, [conversationId, messages.length])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    }, [messages.length])

    useEffect(() => {
        const interval = window.setInterval(() => {
            const now = Date.now()
            setTypingUsers((current) => Object.fromEntries(Object.entries(current).filter(([, value]) => value.expiresAt > now)))
        }, 1000)

        return () => window.clearInterval(interval)
    }, [])

    useEffect(() => {
        if (!body.trim()) {
            sendTypingStatus(conversationId, false).catch(() => null)
            return
        }

        sendTypingStatus(conversationId, true).catch(() => null)

        if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
        typingTimerRef.current = setTimeout(() => {
            sendTypingStatus(conversationId, false).catch(() => null)
        }, 2500)

        return () => {
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
        }
    }, [body, conversationId])

    useEffect(() => {
        return () => {
            sendTypingStatus(conversationId, false).catch(() => null)
        }
    }, [conversationId])

    const conversation = conversationQuery.data
    const me = meQuery.data
    const activeTyping = Object.values(typingUsers)
    const lastOwnMessage = [...messages].reverse().find((message) => message.sender?.id === me?.id)

    function handleFileSelection(selectedFiles: File[]) {
        if (selectedFiles.length === 0) return

        setFiles((current) => {
            const availableSlots = Math.max(0, MAX_CHAT_FILES - current.length)
            if (availableSlots === 0) {
                toast.error(`За одно сообщение можно прикрепить не более ${MAX_CHAT_FILES} файлов`)
                return current
            }

            const accepted: File[] = []
            for (const file of selectedFiles) {
                if (accepted.length >= availableSlots) {
                    toast.error(`Лишние файлы не добавлены: максимум ${MAX_CHAT_FILES} за сообщение`)
                    break
                }

                if (!isAllowedChatFile(file)) {
                    toast.error(`Тип файла не поддерживается: ${file.name}`)
                    continue
                }

                if (file.size > MAX_CHAT_FILE_SIZE_BYTES) {
                    toast.error(`${file.name}: максимум ${fileSizeLabel(MAX_CHAT_FILE_SIZE_BYTES)}`)
                    continue
                }

                accepted.push(file)
            }

            return accepted.length > 0 ? [...current, ...accepted] : current
        })
    }

    return (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
                            <Link href="/chats"><ArrowLeft className="mr-2 size-4" /> Все чаты</Link>
                        </Button>
                        <h1 className="text-2xl font-semibold tracking-tight">{conversation?.title ?? "Чат"}</h1>
                        <p className="text-sm text-muted-foreground">{conversation?.type === "group" ? "Групповой чат" : "Личный диалог"}</p>
                    </div>
                    {conversation?.unread_count ? <Badge>{conversation.unread_count} новых</Badge> : null}
                </div>

                <Card className="overflow-hidden">
                    <CardContent className="flex h-[62vh] flex-col p-0">
                        <div className="flex-1 space-y-3 overflow-y-auto p-4">
                            {messages.map((message) => {
                                const isMine = message.sender?.id === me?.id
                                const isLastOwn = lastOwnMessage?.id === message.id
                                return (
                                    <div key={message.id} className={`flex gap-3 ${isMine ? "justify-end" : "justify-start"}`}>
                                        {!isMine && (
                                            <div className="relative h-fit">
                                                <Avatar className="size-8">
                                                    <AvatarImage src={message.sender?.avatar_url ?? undefined} />
                                                    <AvatarFallback>{initials(message.sender?.name)}</AvatarFallback>
                                                </Avatar>
                                                <UserPresenceDot user={message.sender} className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background p-0.5" />
                                            </div>
                                        )}
                                        <div className={`max-w-[78%] rounded-2xl border p-3 ${isMine ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                                            <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
                                                <span>{message.sender?.name ?? "Система"}</span>
                                                <span>{timeLabel(message.created_at)}</span>
                                            </div>
                                            {message.body && <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>}
                                            {message.attachments?.length > 0 && (
                                                <div className="mt-3 space-y-2">
                                                    {message.attachments.map((attachment) => <ChatAttachmentView key={attachment.id} attachment={attachment} />)}
                                                </div>
                                            )}
                                            {isMine && isLastOwn && (
                                                <div className="mt-2 flex justify-end text-[11px] opacity-75">
                                                    {message.read_by_count && message.read_by_count > 0 ? (
                                                        <span className="inline-flex items-center gap-1"><CheckCheck className="size-3" /> прочитано {message.read_by_count}</span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1"><Check className="size-3" /> доставлено</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                            {messages.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Сообщений пока нет. Начните диалог.</p>}
                            <div ref={bottomRef} />
                        </div>

                        <div className="border-t bg-background p-3">
                            {activeTyping.length > 0 && (
                                <div className="mb-2 text-xs text-muted-foreground">
                                    {activeTyping.map((item) => item.user.name).join(", ")} печатает…
                                </div>
                            )}
                            {files.length > 0 && (
                                <div className="mb-2 flex flex-wrap gap-2">
                                    {files.map((file, index) => (
                                        <Badge key={`${file.name}-${index}`} variant="secondary" className="gap-2">
                                            {file.type.startsWith("image/") ? <ImagePlus className="size-3" /> : <Paperclip className="size-3" />}
                                            {file.name}
                                            <button type="button" onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}>×</button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <label className="inline-flex cursor-pointer items-center justify-center rounded-md border px-3 hover:bg-muted">
                                    <Paperclip className="size-4" />
                                    <input
                                        type="file"
                                        multiple
                                        accept={CHAT_ALLOWED_MIME_TYPES.join(",")}
                                        className="hidden"
                                        onChange={(event) => {
                                            handleFileSelection(Array.from(event.target.files ?? []))
                                            event.currentTarget.value = ""
                                        }}
                                    />
                                </label>
                                <Textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Написать сообщение" className="min-h-12 resize-none" />
                                <Button disabled={sendMutation.isPending || (!body.trim() && files.length === 0)} onClick={() => sendMutation.mutate()}>
                                    <Send className="size-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>

            <aside className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users className="size-5" /> Участники</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {conversation?.participants.map((participant) => (
                            <div key={participant.id} className="flex items-center gap-3 rounded-xl border p-3">
                                <div className="relative">
                                    <Avatar className="size-9">
                                        <AvatarImage src={participant.user.avatar_url ?? undefined} />
                                        <AvatarFallback>{initials(participant.user.name)}</AvatarFallback>
                                    </Avatar>
                                    <UserPresenceDot user={participant.user} className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background p-0.5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate font-medium">{participant.user.name}</div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>{participant.role}</span>
                                        <UserPresenceDot user={participant.user} showLabel />
                                    </div>
                                </div>
                                {participant.is_typing ? <Badge variant="secondary">печатает</Badge> : null}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </aside>
        </div>
    )
}
