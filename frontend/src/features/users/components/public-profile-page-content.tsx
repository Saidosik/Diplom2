"use client"

import { Lock } from "lucide-react"

import type { User } from "@/features/auth/types"
import { Card, CardContent } from "@/components/ui/card"
import { ProfileTabsSection } from "@/features/profile/components/profile-tabs-section"
import type { PublicProfile } from "@/features/users/types"

function asDashboardUser(profile: PublicProfile): User {
  return { ...profile, email: "" }
}

export function PublicProfilePageContent({ profile, isAuthenticated = false }: { profile: PublicProfile; isAuthenticated?: boolean }) {
  if (profile.can_view_full_profile === false) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <Card className="border-amber-500/30 bg-amber-500/5 shadow-sm">
          <CardContent className="flex items-start gap-3 p-5 text-sm text-muted-foreground">
            <Lock className="size-5 shrink-0 text-amber-500" />
            Пользователь ограничил доступ к активности. Приватные данные, email, сохранённое, файлы и активность не отображаются.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <ProfileTabsSection
        user={asDashboardUser(profile)}
        dashboardUserId={profile.id}
        isAuthenticated={isAuthenticated}
        isPublicProfile
      />
    </div>
  )
}
