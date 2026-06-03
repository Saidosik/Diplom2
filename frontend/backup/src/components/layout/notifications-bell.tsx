"use client"

import Link from "next/link"
import { Bell, Inbox } from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverDescription,
    PopoverHeader,
    PopoverTitle,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    getNotifications,
    getUnreadNotificationsCount,
    markNotificationAsRead,
} from "@/features/community/api"
import type { CommunityNotification } from "@/features/community/types"
import { formatDateTime } from "@/lib/utils/date"

export function NotificationsBell() {
    const queryClient = useQueryClient()

    const { data: unreadCount = 0 } = useQuery({
        queryKey: ["notifications", "unread-count"],
        queryFn: getUnreadNotificationsCount,
        refetchInterval: 30_000,
        retry: false,
    })

    const notificationsQuery = useQuery({
        queryKey: ["notifications", "header-list"],
        queryFn: () => getNotifications({ per_page: 6 }),
        refetchInterval: 30_000,
        retry: false,
    })

    const markOneMutation = useMutation({
        mutationFn: markNotificationAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] })
        },
    })

    const notifications = notificationsQuery.data?.data ?? []

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Inbox"
                    className="relative"
                >
                    <Bell className="size-4" />
                    {unreadCount > 0 ? (
                        <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center border bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    ) : null}
                </Button>
            </PopoverTrigger>

            <PopoverContent align="end" className="w-[390px] max-w-[calc(100vw-1rem)] p-0">
                <PopoverHeader className="border-b p-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                            <PopoverTitle className="flex items-center gap-2">
                                <Inbox className="size-4 text-primary" />
                                Inbox
                            </PopoverTitle>
                            <PopoverDescription>
                                Последние сообщения и события сообщества.
                            </PopoverDescription>
                        </div>
                        <Badge variant={unreadCount > 0 ? "default" : "secondary"}>
                            {unreadCount} новых
                        </Badge>
                    </div>
                </PopoverHeader>

                <div className="max-h-[380px] overflow-y-auto">
                    {notificationsQuery.isLoading ? (
                        <div className="space-y-2 p-3">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div key={index} className="h-16 animate-pulse border bg-muted/50" />
                            ))}
                        </div>
                    ) : notifications.length > 0 ? (
                        <div className="divide-y">
                            {notifications.map((notification) => (
                                <HeaderNotificationItem
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
                        <div className="p-6 text-center text-sm leading-6 text-muted-foreground">
                            Уведомлений пока нет. Они появятся после ответов, комментариев, подписок и изменения репутации.
                        </div>
                    )}
                </div>

                <div className="border-t p-3">
                    <Button asChild variant="outline" size="sm" className="w-full justify-center">
                        <Link href="/inbox">
                            <Inbox className="size-4" />
                            Открыть Inbox
                        </Link>
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}

function HeaderNotificationItem({
    notification,
    onOpen,
}: {
    notification: CommunityNotification
    onOpen: () => void
}) {
    const href = notification.link || "/inbox"

    return (
        <Link
            href={href}
            onClick={onOpen}
            className={[
                "block p-4 transition-colors hover:bg-muted/50",
                notification.is_read ? "opacity-55" : "bg-primary/5",
            ].join(" ")}
        >
            <div className="flex items-start gap-3">
                <span
                    className={notification.is_read ? "mt-1.5 size-2 shrink-0" : "mt-1.5 size-2 shrink-0 bg-primary"}
                    aria-hidden="true"
                />
                <div className="min-w-0 space-y-1">
                    <p className={notification.is_read ? "line-clamp-1 text-sm font-medium text-muted-foreground" : "line-clamp-1 text-sm font-semibold"}>
                        {notification.title}
                    </p>
                    {notification.message ? (
                        <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {notification.message}
                        </p>
                    ) : null}
                    {notification.created_at ? (
                        <p className="text-[11px] text-muted-foreground">
                            {formatDateTime(notification.created_at)}
                        </p>
                    ) : null}
                </div>
            </div>
        </Link>
    )
}
