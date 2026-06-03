"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, Search, Users } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserPresenceDot } from "@/features/presence/components/user-presence-dot"
import { createGroupChat, getConversations, openDirectChat } from "@/features/chat/api"
import { getFriends } from "@/features/social/api"
import { getMe } from "@/features/auth/api"
import { getEcho } from "@/lib/realtime/echo"
import type { ChatConversation } from "@/features/chat/types"

function initials(name?: string | null) {
    return (name ?? "C").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()
}

function messagePreview(body?: string | null) {
    return body?.trim() ? body : "Файл или вложение"
}

type ConversationUpdatedPayload = {
    conversation: ChatConversation
}

export function ChatsPage() {
    const queryClient = useQueryClient()
    const [title, setTitle] = useState("")
    const [selected, setSelected] = useState<number[]>([])
    const [q, setQ] = useState("")

    const conversationsQuery = useQuery({
        queryKey: ["chats", "conversations"],
        queryFn: () => getConversations({ per_page: 50 }),
    })

    const friendsQuery = useQuery({
        queryKey: ["friends", "for-group"],
        queryFn: () => getFriends({ per_page: 50 }),
    })

    const meQuery = useQuery({
        queryKey: ["auth", "me"],
        queryFn: getMe,
        retry: false,
    })

    const directMutation = useMutation({
        mutationFn: openDirectChat,
        onSuccess: (conversation) => {
            queryClient.invalidateQueries({ queryKey: ["chats"] })
            window.location.href = `/chats/${conversation.id}`
        },
        onError: (error: Error) => toast.error(error.message),
    })

    const groupMutation = useMutation({
        mutationFn: createGroupChat,
        onSuccess: (conversation) => {
            toast.success("Групповой чат создан")
            setTitle("")
            setSelected([])
            queryClient.invalidateQueries({ queryKey: ["chats"] })
            window.location.href = `/chats/${conversation.id}`
        },
        onError: (error: Error) => toast.error(error.message),
    })

    useEffect(() => {
        const userId = meQuery.data?.id
        if (!userId) return

        const echo = getEcho()
        if (!echo) return

        const channel = echo.private(`users.${userId}`)
        channel.listen(".chat.conversation.updated", (payload: ConversationUpdatedPayload) => {
            queryClient.setQueryData(["chats", "conversations"], (current: any) => {
                if (!current?.data || !payload.conversation) return current
                const next = [payload.conversation, ...current.data.filter((conversation: ChatConversation) => conversation.id !== payload.conversation.id)]
                return { ...current, data: next }
            })
        })

        return () => {
            echo.leave(`private-users.${userId}`)
            echo.leave(`users.${userId}`)
        }
    }, [meQuery.data?.id, queryClient])

    const conversations = conversationsQuery.data?.data ?? []
    const friends = friendsQuery.data?.data ?? []
    const filteredFriends = friends.filter((friendship) => friendship.friend?.name.toLowerCase().includes(q.toLowerCase()))
    const onlineFriends = friends.filter((friendship) => friendship.friend?.is_online).slice(0, 8)

    return (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="space-y-4">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Чаты</h1>
                    <p className="mt-1 text-muted-foreground">Личные и групповые диалоги с realtime-сообщениями и вложениями.</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Диалоги</CardTitle>
                        <CardDescription>Последние личные и групповые обсуждения.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {conversations.length === 0 ? (
                            <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">Диалогов пока нет. Создай групповой чат или открой личный чат из раздела друзей.</p>
                        ) : conversations.map((conversation) => (
                            <Link key={conversation.id} href={`/chats/${conversation.id}`} className="flex items-center justify-between gap-3 rounded-xl border bg-card/60 p-3 hover:bg-muted/60">
                                <div className="flex min-w-0 items-center gap-3">
                                    <Avatar className="size-11">
                                        <AvatarImage src={conversation.avatar_url ?? undefined} alt={conversation.title ?? "Чат"} />
                                        <AvatarFallback>{conversation.type === "group" ? <Users className="size-5" /> : initials(conversation.title)}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="truncate font-medium">{conversation.title ?? "Диалог"}</span>
                                            {conversation.type === "group" && <Badge variant="secondary">группа</Badge>}
                                        </div>
                                        <div className="truncate text-sm text-muted-foreground">{messagePreview(conversation.last_message?.body)}</div>
                                    </div>
                                </div>
                                {conversation.unread_count > 0 && <Badge>{conversation.unread_count}</Badge>}
                            </Link>
                        ))}
                    </CardContent>
                </Card>
            </section>

            <aside className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Новый групповой чат</CardTitle>
                        <CardDescription>Добавляй друзей, обсуждай проект, прикладывай файлы и изображения.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Название чата" />
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Найти друга" className="pl-9" />
                        </div>
                        <div className="max-h-72 space-y-2 overflow-auto pr-1">
                            {filteredFriends.map((friendship) => friendship.friend && (
                                <label key={friendship.id} className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 hover:bg-muted/60">
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(friendship.friend.id)}
                                        onChange={(event) => {
                                            setSelected((current) => event.target.checked
                                                ? [...current, friendship.friend!.id]
                                                : current.filter((id) => id !== friendship.friend!.id))
                                        }}
                                    />
                                    <span className="min-w-0 flex-1 truncate">{friendship.friend.name}</span>
                                </label>
                            ))}
                        </div>
                        <Button className="w-full" disabled={!title.trim() || groupMutation.isPending} onClick={() => groupMutation.mutate({ title, participant_ids: selected })}>
                            <Plus className="mr-2 size-4" /> Создать чат
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Друзья онлайн</CardTitle>
                        <CardDescription>Быстрый переход к активным собеседникам.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {onlineFriends.length === 0 ? (
                            <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Сейчас никто из друзей не в сети.</p>
                        ) : onlineFriends.map((friendship) => friendship.friend && (
                            <div key={friendship.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <Avatar className="size-8">
                                        <AvatarImage src={friendship.friend.avatar_url ?? undefined} />
                                        <AvatarFallback>{initials(friendship.friend.name)}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-medium">{friendship.friend.name}</div>
                                        <UserPresenceDot user={friendship.friend} showLabel />
                                    </div>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => directMutation.mutate(friendship.friend!.id)}>Чат</Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </aside>
        </div>
    )
}
