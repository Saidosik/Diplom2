"use client"

import Link from "next/link"
import { Bell, Inbox, UserPlus } from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
    getNotifications,
    markNotificationAsRead,
} from "@/features/community/api"
import type { CommunityNotification } from "@/features/community/types"
import { formatDateTime } from "@/lib/utils/date"

export function InboxPage() {
    const queryClient = useQueryClient()

    const notificationsQuery = useQuery({
        queryKey: ["notifications", "list"],
        queryFn: () => getNotifications({ per_page: 30 }),
        retry: false,
    })

    const markOneMutation = useMutation({
        mutationFn: markNotificationAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] })
        },
    })

    const notifications = notificationsQuery.data?.data ?? []
    const unreadCount = notificationsQuery.data?.unread_count ?? notifications.filter((item) => !item.is_read).length

    return (
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
            <section className="border bg-card p-6 shadow-sm md:p-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 border bg-muted/40 px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                            <Inbox className="size-4 text-primary" />
                            центр уведомлений
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Inbox</h1>
                            <p className="max-w-2xl text-muted-foreground">
                                Здесь отображаются новые ответы, комментарии, подписки, изменения репутации и другие события сообщества.
                            </p>
                        </div>
                    </div>

                    <Badge variant={unreadCount > 0 ? "default" : "secondary"} className="w-fit">
                        {unreadCount} новых
                    </Badge>
                </div>
            </section>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="size-5 text-primary" />
                        Сообщения
                    </CardTitle>
                    <CardDescription>
                        Непрочитанные сообщения отмечены маркером. Прочитанные становятся менее заметными.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {notificationsQuery.isLoading ? (
                        <div className="space-y-3 p-4">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <Skeleton key={index} className="h-24" />
                            ))}
                        </div>
                    ) : notifications.length > 0 ? (
                        <div className="divide-y">
                            {notifications.map((notification) => (
                                <NotificationCard
                                    key={notification.id}
                                    notification={notification}
                                    onOpen={() => {
                                        if (!notification.is_read) {
                                            markOneMutation.mutate(notification.id)
                                        }
                                    }}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="border-t p-10 text-center text-sm leading-6 text-muted-foreground">
                            Уведомлений пока нет. Они появятся после ответов, комментариев, подписок и изменения репутации.
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    )
}

function NotificationCard({
    notification,
    onOpen,
}: {
    notification: CommunityNotification
    onOpen: () => void
}) {
    const content = (
        <div
            className={[
                "flex flex-col gap-3 p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-start sm:justify-between",
                notification.is_read ? "opacity-55" : "bg-primary/5",
            ].join(" ")}
        >
            <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    {!notification.is_read ? <span className="size-2 bg-primary" aria-hidden="true" /> : null}
                    <h3 className={notification.is_read ? "font-medium text-muted-foreground" : "font-semibold"}>
                        {notification.title}
                    </h3>
                    <Badge variant="outline">{labelByType(notification.type)}</Badge>
                </div>
                {notification.message ? (
                    <p className="text-sm leading-6 text-muted-foreground">{notification.message}</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {notification.actor?.name ? (
                        <span className="inline-flex items-center gap-1">
                            <UserPlus className="size-3" />
                            {notification.actor.name}
                        </span>
                    ) : null}
                    {notification.created_at ? <span>{formatDateTime(notification.created_at)}</span> : null}
                </div>
            </div>

            {notification.link ? (
                <Button asChild type="button" variant="outline" size="sm" className="shrink-0">
                    <Link href={notification.link} onClick={onOpen}>Открыть</Link>
                </Button>
            ) : null}
        </div>
    )

    if (!notification.link) {
        return <button type="button" onClick={onOpen} className="w-full text-left">{content}</button>
    }

    return content
}

function labelByType(type: string) {
    return {
        question_answered: "Ответ",
        answer_accepted: "Решение",
        comment_created: "Комментарий",
        author_publication: "Автор",
        subscription_created: "Подписка",
        reputation_changed: "Репутация",
        moderation_update: "Модерация",
    }[type] ?? "Событие"
}
