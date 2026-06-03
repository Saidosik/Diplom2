"use client"

import type { ElementType } from "react"
import Link from "next/link"
import { Bell, Inbox, MonitorCog, Settings, UserRound } from "lucide-react"

import type { User } from "@/features/auth/types"
import { ProfileSettingsCard } from "@/features/profile/components/profile-settings-card"
import { SettingsAppearanceCard } from "@/features/settings/components/settings-appearance-card"
import { SettingsNotificationCard } from "@/features/settings/components/settings-notification-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function SettingsPageContent({ user }: { user: User }) {
    return (
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6">
            <section className="border bg-card p-6 shadow-sm md:p-8">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div className="space-y-4">
                        <div className="inline-flex w-fit items-center gap-2 border bg-muted/40 px-3 py-1 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                            <Settings className="size-4 text-primary" />
                            настройки пользователя
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                                Настройки аккаунта и уведомлений
                            </h1>
                            <p className="max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
                                Отдельный раздел настроек: здесь пользователь редактирует информацию о себе, выбирает тему интерфейса, редактирует профиль и управляет событиями, которые попадают в inbox.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline">
                            <Link href="/profile">
                                <UserRound className="size-4" />
                                Открыть профиль
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href="/inbox">
                                <Inbox className="size-4" />
                                Перейти в inbox
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
                <SettingsSummaryCard
                    icon={UserRound}
                    title="Профиль"
                    description="Имя, описание, город, ссылки и аватар пользователя."
                    badge="публичные данные"
                />
                <SettingsSummaryCard
                    icon={MonitorCog}
                    title="Оформление"
                    description="Тёмная, светлая или системная тема интерфейса."
                    badge="тема сайта"
                />
                <SettingsSummaryCard
                    icon={Bell}
                    title="Inbox"
                    description="Какие события создавать и показывать в центре уведомлений."
                    badge="уведомления"
                />
            </section>

            <Tabs defaultValue="profile" className="space-y-6">
                <TabsList variant="line" className="w-full justify-start overflow-x-auto">
                    <TabsTrigger value="profile">Профиль</TabsTrigger>
                    <TabsTrigger value="appearance">Тема</TabsTrigger>
                    <TabsTrigger value="inbox">Inbox</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-6">
                    <ProfileSettingsCard user={user} />
                </TabsContent>

                <TabsContent value="appearance" className="space-y-6">
                    <SettingsAppearanceCard />
                </TabsContent>

                <TabsContent value="inbox" className="space-y-6">
                    <SettingsNotificationCard />
                </TabsContent>
            </Tabs>
        </main>
    )
}

function SettingsSummaryCard({
    icon: Icon,
    title,
    description,
    badge,
}: {
    icon: ElementType
    title: string
    description: string
    badge: string
}) {
    return (
        <Card className="shadow-sm">
            <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex size-10 items-center justify-center border bg-primary/10 text-primary">
                        <Icon className="size-5" />
                    </div>
                    <Badge variant="secondary">{badge}</Badge>
                </div>
                <div className="space-y-1.5">
                    <h2 className="font-medium">{title}</h2>
                    <p className="text-sm leading-6 text-muted-foreground">{description}</p>
                </div>
            </CardContent>
        </Card>
    )
}
