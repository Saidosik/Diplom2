import type { User } from "@/features/auth/types"
import { ProfileBreadcrumbs } from "@/features/profile/components/profile-breadcrumbs"
import { ProfileTabsSection } from "./profile-tabs-section"

export function ProfilePageContent({ user }: { user: User }) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <ProfileBreadcrumbs />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Профиль участника</h1>
        <p className="text-sm text-muted-foreground">Публичное представление, вклад в сообщество, активность, репутация и сохранённые материалы.</p>
      </div>
      <ProfileTabsSection user={user} />
    </div>
  )
}
