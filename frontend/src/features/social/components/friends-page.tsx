"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, MessageCircle, Search, UserPlus, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserPresenceDot } from "@/features/presence/components/user-presence-dot"
import { acceptFriendRequest, cancelFriendRequest, declineFriendRequest, getFriendRequests, getFriends, getFriendSuggestions, removeFriendship, sendFriendRequest } from "@/features/social/api"
import { openDirectChat } from "@/features/chat/api"
import type { User } from "@/features/auth/types"

function initials(name?: string | null) {
    return (name ?? "U").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()
}

function UserLine({ user, right }: { user: User; right?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-xl border bg-card/60 p-3">
            <div className="flex min-w-0 items-center gap-3">
                <div className="relative">
                    <Avatar className="size-10">
                        <AvatarImage src={user.avatar_url ?? undefined} alt={user.name} />
                        <AvatarFallback>{initials(user.name)}</AvatarFallback>
                    </Avatar>
                    <UserPresenceDot user={user} className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background p-0.5" />
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="truncate font-medium">{user.name}</div>
                        <UserPresenceDot user={user} showLabel />
                    </div>
                    <div className="truncate text-sm text-muted-foreground">{user.headline ?? user.email}</div>
                </div>
            </div>
            {right}
        </div>
    )
}

export function FriendsPage() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const [q, setQ] = useState("")

    const friendsQuery = useQuery({
        queryKey: ["friends"],
        queryFn: () => getFriends({ per_page: 30 }),
    })

    const requestsQuery = useQuery({
        queryKey: ["friends", "requests"],
        queryFn: getFriendRequests,
    })

    const suggestionsQuery = useQuery({
        queryKey: ["friends", "suggestions", q],
        queryFn: () => getFriendSuggestions({ q, limit: 12 }),
    })

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["friends"] })
        queryClient.invalidateQueries({ queryKey: ["chats"] })
    }

    const requestMutation = useMutation({
        mutationFn: sendFriendRequest,
        onSuccess: () => {
            toast.success("Заявка отправлена")
            invalidate()
        },
        onError: (error: Error) => toast.error(error.message),
    })

    const acceptMutation = useMutation({
        mutationFn: acceptFriendRequest,
        onSuccess: () => {
            toast.success("Заявка принята")
            invalidate()
        },
        onError: (error: Error) => toast.error(error.message),
    })

    const declineMutation = useMutation({
        mutationFn: declineFriendRequest,
        onSuccess: invalidate,
        onError: (error: Error) => toast.error(error.message),
    })

    const cancelMutation = useMutation({
        mutationFn: cancelFriendRequest,
        onSuccess: invalidate,
        onError: (error: Error) => toast.error(error.message),
    })

    const removeMutation = useMutation({
        mutationFn: removeFriendship,
        onSuccess: () => {
            toast.success("Пользователь удалён из друзей")
            invalidate()
        },
        onError: (error: Error) => toast.error(error.message),
    })

    const directMutation = useMutation({
        mutationFn: openDirectChat,
        onSuccess: (conversation) => router.push(`/chats/${conversation.id}`),
        onError: (error: Error) => toast.error(error.message),
    })

    const incoming = requestsQuery.data?.incoming ?? []
    const outgoing = requestsQuery.data?.outgoing ?? []
    const friends = friendsQuery.data?.data ?? []
    const suggestions = suggestionsQuery.data ?? []

    const outgoingIds = useMemo(() => new Set(outgoing.map((request) => request.recipient.id)), [outgoing])

    return (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="space-y-4">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Друзья</h1>
                    <p className="mt-1 text-muted-foreground">Личные связи внутри сообщества, быстрый переход в диалоги и заявки.</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Мои друзья</CardTitle>
                        <CardDescription>{friends.length} участников в списке</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {friends.length === 0 ? (
                            <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">Пока нет друзей. Найдите участников справа и отправьте заявку.</p>
                        ) : friends.map((friendship) => friendship.friend && (
                            <UserLine
                                key={friendship.id}
                                user={friendship.friend}
                                right={
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="secondary" onClick={() => directMutation.mutate(friendship.friend!.id)}>
                                            <MessageCircle className="mr-2 size-4" /> Чат
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => removeMutation.mutate(friendship.id)}>Удалить</Button>
                                    </div>
                                }
                            />
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Заявки</CardTitle>
                        <CardDescription>Входящие и исходящие запросы на добавление в друзья.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="text-sm font-medium">Входящие</div>
                            {incoming.length === 0 ? <p className="text-sm text-muted-foreground">Нет входящих заявок.</p> : incoming.map((request) => (
                                <UserLine
                                    key={request.id}
                                    user={request.sender}
                                    right={
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={() => acceptMutation.mutate(request.id)}><Check className="mr-2 size-4" /> Принять</Button>
                                            <Button size="sm" variant="outline" onClick={() => declineMutation.mutate(request.id)}><X className="mr-2 size-4" /> Отклонить</Button>
                                        </div>
                                    }
                                />
                            ))}
                        </div>

                        <div className="space-y-2">
                            <div className="text-sm font-medium">Исходящие</div>
                            {outgoing.length === 0 ? <p className="text-sm text-muted-foreground">Нет ожидающих исходящих заявок.</p> : outgoing.map((request) => (
                                <UserLine
                                    key={request.id}
                                    user={request.recipient}
                                    right={<Button size="sm" variant="outline" onClick={() => cancelMutation.mutate(request.id)}>Отменить</Button>}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </section>

            <aside className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Найти участников</CardTitle>
                        <CardDescription>Поиск исключает текущих друзей и ожидающие заявки.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Имя, email, направление" className="pl-9" />
                        </div>

                        <div className="space-y-2">
                            {suggestions.map((user) => (
                                <UserLine
                                    key={user.id}
                                    user={user}
                                    right={outgoingIds.has(user.id) ? <Badge variant="secondary">Ожидает</Badge> : (
                                        <Button size="sm" onClick={() => requestMutation.mutate({ recipient_id: user.id })}>
                                            <UserPlus className="mr-2 size-4" /> Добавить
                                        </Button>
                                    )}
                                />
                            ))}
                            {suggestions.length === 0 && <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">Подходящих участников не найдено.</p>}
                        </div>
                    </CardContent>
                </Card>
            </aside>
        </div>
    )
}
