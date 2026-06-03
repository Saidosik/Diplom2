"use client"

import type { ElementType } from "react"
import { Bell, CheckCheck, Inbox, Mail, MessageSquareReply, Newspaper, ShieldCheck, Trophy, UserPlus } from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { getNotificationSettings, updateNotificationSettings } from "@/features/community/api"
import type { NotificationSettings } from "@/features/community/types"

const settingsItems: Array<{
    key: keyof NotificationSettings
    title: string
    description: string
    icon: ElementType
}> = [
    {
        key: "inbox_enabled",
        title: "Уведомления внутри сайта",
        description: "Показывать события в Inbox и счётчик новых уведомлений в header.",
        icon: Inbox,
    },
    {
        key: "email_enabled",
        title: "Email-уведомления",
        description: "Получать важные уведомления на электронную почту.",
        icon: Mail,
    },
    {
        key: "notify_answers",
        title: "Ответы на мои вопросы",
        description: "Сообщать, когда другой участник добавил ответ к вопросу.",
        icon: MessageSquareReply,
    },
    {
        key: "notify_comments",
        title: "Комментарии к моим материалам",
        description: "Сообщать о новых комментариях к публикациям, вопросам и ответам.",
        icon: Bell,
    },
    {
        key: "notify_comment_replies",
        title: "Ответы в ветках комментариев",
        description: "Сообщать, когда участник отвечает в обсуждении комментариев.",
        icon: CheckCheck,
    },
    {
        key: "notify_author_posts",
        title: "Новые публикации авторов",
        description: "Сообщать, когда автор из подписок выпускает новый материал.",
        icon: Newspaper,
    },
    {
        key: "notify_subscriptions",
        title: "Подписки",
        description: "Сообщать о новых подписках на пользователя или его материалы.",
        icon: UserPlus,
    },
    {
        key: "notify_reputation",
        title: "Изменение репутации",
        description: "Показывать начисление баллов и изменение уровня участника.",
        icon: Trophy,
    },
    {
        key: "notify_moderation",
        title: "Модерация материалов",
        description: "Сообщать о результатах рассмотрения жалоб и скрытии материалов.",
        icon: ShieldCheck,
    },
]

export function SettingsNotificationCard() {
    const queryClient = useQueryClient()

    const settingsQuery = useQuery({
        queryKey: ["notifications", "settings"],
        queryFn: getNotificationSettings,
        retry: false,
    })

    const settingsMutation = useMutation({
        mutationFn: updateNotificationSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications", "settings"] })
            queryClient.invalidateQueries({ queryKey: ["notifications"] })
            toast.success("Настройки Inbox сохранены")
        },
    })

    const settings = settingsQuery.data

    return (
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Inbox className="size-5 text-primary" />
                    Настройки Inbox
                </CardTitle>
                <CardDescription>
                    Выберите, какие уведомления получать внутри сайта и по email.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
                {settingsQuery.isLoading || !settings ? (
                    Array.from({ length: 8 }).map((_, index) => (
                        <Skeleton key={index} className="h-28" />
                    ))
                ) : (
                    settingsItems.map((item) => (
                        <NotificationSettingItem
                            key={item.key}
                            item={item}
                            checked={Boolean(settings[item.key])}
                            disabled={settingsMutation.isPending}
                            onCheckedChange={(checked) => {
                                settingsMutation.mutate({ [item.key]: checked } as Partial<NotificationSettings>)
                            }}
                        />
                    ))
                )}
            </CardContent>
        </Card>
    )
}

function NotificationSettingItem({
    item,
    checked,
    disabled,
    onCheckedChange,
}: {
    item: (typeof settingsItems)[number]
    checked: boolean
    disabled: boolean
    onCheckedChange: (checked: boolean) => void
}) {
    const Icon = item.icon

    return (
        <div className="flex items-start justify-between gap-4 border bg-background p-4">
            <div className="flex min-w-0 gap-3">
                <div className="mt-1 flex size-9 shrink-0 items-center justify-center border bg-primary/10 text-primary">
                    <Icon className="size-4" />
                </div>
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{item.title}</p>
                        {checked ? <Badge variant="secondary">включено</Badge> : null}
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">{item.description}</p>
                </div>
            </div>

            <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
        </div>
    )
}
