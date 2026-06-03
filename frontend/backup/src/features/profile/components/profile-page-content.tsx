import type { User } from "@/features/auth/types"
import { ProfileBreadcrumbs } from "@/features/profile/components/profile-breadcrumbs"
import { ProfileHero } from "@/features/profile/components/profile-hero"
import { ProfileSecurityCard } from "@/features/profile/components/profile-security-card"
import { ProfileTabsSection } from "./profile-tabs-section"

type ProfilePageContentProps = {
    user: User
}

export function ProfilePageContent({ user }: ProfilePageContentProps) {
    return (
        <div className="w-full max-w-6xl space-y-6 mx-auto">
            <ProfileBreadcrumbs />

            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">
                    Профиль
                </h1>

                <p className="text-sm text-muted-foreground">
                    Личный кабинет, активность сообщества, сохранённые материалы и репутация участника.
                </p>
            </div>

            <ProfileHero user={user} />

            <ProfileTabsSection user={user} />
        </div>
    )
}