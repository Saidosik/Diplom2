"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Settings } from "lucide-react"

import type { User } from "@/features/auth/types"
import { ProfileOverviewTab } from "@/features/profile/components/profile-overview-tab"
import { ProfileSavedTab } from "@/features/profile/components/profile-saved-tab"
import { ProfileActivityPanel } from "@/features/profile/components/profile-activity-panel"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type ProfileTabsSectionProps = {
    user: User
}

const allowedProfileTabs = ["overview", "activity", "saved"] as const

type ProfileTab = (typeof allowedProfileTabs)[number]

function isProfileTab(value: string | null): value is ProfileTab {
    return allowedProfileTabs.includes(value as ProfileTab)
}

export function ProfileTabsSection({ user }: ProfileTabsSectionProps) {
    const searchParams = useSearchParams()
    const tabFromUrl = searchParams.get("tab")
    const [activeTab, setActiveTab] = React.useState<ProfileTab>(
        isProfileTab(tabFromUrl) ? tabFromUrl : "overview"
    )

    React.useEffect(() => {
        if (isProfileTab(tabFromUrl)) {
            setActiveTab(tabFromUrl)
        }
    }, [tabFromUrl])

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <p className="text-sm font-medium">Настройки вынесены отдельно</p>
                    <p className="text-xs text-muted-foreground">
                        Данные профиля, тема интерфейса и inbox теперь находятся в отдельном разделе настроек пользователя.
                    </p>
                </div>
                <Button asChild variant="outline" size="sm">
                    <Link href="/settings">
                        <Settings className="size-4" />
                        Открыть настройки
                    </Link>
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ProfileTab)} className="space-y-6">
                <TabsList variant="line">
                    <TabsTrigger value="overview">Обзор</TabsTrigger>
                    <TabsTrigger value="activity">Активность</TabsTrigger>
                    <TabsTrigger value="saved">Сохранённое</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    <ProfileOverviewTab user={user} />
                </TabsContent>

                <TabsContent value="activity">
                    <ProfileActivityPanel />
                </TabsContent>

                <TabsContent value="saved">
                    <ProfileSavedTab />
                </TabsContent>
            </Tabs>
        </div>
    )
}
