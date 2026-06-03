"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { getMe } from "@/features/auth/api"
import type { CommunityNotification } from "@/features/community/types"
import type { CodeRun } from "@/features/playground/types"
import type { FriendRequest, Friendship } from "@/features/social/types"
import type { ChatConversation } from "@/features/chat/types"
import type { User } from "@/features/auth/types"
import { sendPresenceHeartbeat, sendPresenceOffline } from "@/features/presence/api"
import { getEcho } from "@/lib/realtime/echo"

type NotificationPayload = {
    notification: CommunityNotification
}

type CodeRunPayload = {
    run: CodeRun
}

type FriendRequestPayload = {
    request: FriendRequest
}

type FriendshipPayload = {
    friendship: Friendship
}

type ChatConversationPayload = {
    conversation: ChatConversation
}

type PresencePayload = {
    user: User
    user_id: number
    is_online: boolean
    last_seen_at?: string | null
    presence_status?: string
}

export function RealtimeBridge() {
    const queryClient = useQueryClient()

    const { data: user } = useQuery({
        queryKey: ["auth", "me"],
        queryFn: getMe,
        retry: false,
        staleTime: 5 * 60 * 1000,
    })

    useEffect(() => {
        if (!user?.id) return

        sendPresenceHeartbeat().catch(() => null)
        const interval = window.setInterval(() => {
            if (document.visibilityState === "visible") {
                sendPresenceHeartbeat().catch(() => null)
            }
        }, 45_000)

        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                sendPresenceHeartbeat().catch(() => null)
            }
        }

        const handleOffline = () => {
            sendPresenceOffline().catch(() => null)
        }

        document.addEventListener("visibilitychange", handleVisibility)
        window.addEventListener("beforeunload", handleOffline)

        return () => {
            window.clearInterval(interval)
            document.removeEventListener("visibilitychange", handleVisibility)
            window.removeEventListener("beforeunload", handleOffline)
            sendPresenceOffline().catch(() => null)
        }
    }, [user?.id])

    useEffect(() => {
        if (!user?.id) return

        const echo = getEcho()
        if (!echo) return

        const channel = echo.private(`users.${user.id}`)

        channel.listen(".notification.created", (payload: NotificationPayload) => {
            const notification = payload.notification

            queryClient.invalidateQueries({ queryKey: ["notifications"] })
            queryClient.invalidateQueries({ queryKey: ["inbox"] })

            toast(notification.title, {
                description: notification.message ?? undefined,
                action: notification.link
                    ? {
                        label: "Открыть",
                        onClick: () => {
                            window.location.href = notification.link!
                        },
                    }
                    : undefined,
            })
        })



        channel.listen(".friend.request.created", (payload: FriendRequestPayload) => {
            queryClient.invalidateQueries({ queryKey: ["friends"] })
            toast("Новая заявка в друзья", {
                description: `${payload.request.sender?.name ?? "Участник"} хочет добавить вас в друзья`,
                action: {
                    label: "Открыть",
                    onClick: () => { window.location.href = "/friends" },
                },
            })
        })

        channel.listen(".friendship.accepted", (_payload: FriendshipPayload) => {
            queryClient.invalidateQueries({ queryKey: ["friends"] })
            toast.success("Заявка в друзья принята", {
                action: {
                    label: "Друзья",
                    onClick: () => { window.location.href = "/friends" },
                },
            })
        })

        channel.listen(".chat.conversation.updated", (payload: ChatConversationPayload) => {
            const conversation = payload.conversation
            queryClient.invalidateQueries({ queryKey: ["chats"] })
            queryClient.invalidateQueries({ queryKey: ["chats", "conversation", String(conversation.id)] })

            if (conversation.last_message?.sender?.id && conversation.last_message.sender.id !== user.id) {
                toast(conversation.title ?? "Новое сообщение", {
                    description: conversation.last_message.body ?? "Получено вложение",
                    action: {
                        label: "Открыть",
                        onClick: () => { window.location.href = `/chats/${conversation.id}` },
                    },
                })
            }
        })

        channel.listen(".presence.updated", (payload: PresencePayload) => {
            queryClient.invalidateQueries({ queryKey: ["friends"] })
            queryClient.invalidateQueries({ queryKey: ["chats"] })
            queryClient.invalidateQueries({ queryKey: ["presence"] })

            if (payload.user_id === user.id) {
                queryClient.invalidateQueries({ queryKey: ["auth", "me"] })
            }
        })

        channel.listen(".playground.run.finished", (payload: CodeRunPayload) => {
            const run = payload.run

            queryClient.invalidateQueries({ queryKey: ["playground", "runs"] })
            queryClient.invalidateQueries({ queryKey: ["playground", "run", run.id] })
            queryClient.invalidateQueries({ queryKey: ["playground", "snippets"] })

            toast(run.status === "finished" ? "Код выполнен" : "Запуск завершился с ошибкой", {
                description: `Язык: ${run.language} · exit: ${run.exit_code ?? "—"}`,
                action: {
                    label: "Открыть запуск",
                    onClick: () => {
                        window.location.href = `/playground/runs/${run.id}`
                    },
                },
            })
        })

        return () => {
            echo.leave(`private-users.${user.id}`)
            echo.leave(`users.${user.id}`)
        }
    }, [queryClient, user?.id])

    return null
}
