import { AuthRequiredMessage } from "@/features/auth/components/auth-required-message"
import { getCurrentUser } from "@/features/auth/server"
import { SettingsPageContent } from "@/features/settings/components/settings-page-content"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
    const user = await getCurrentUser()

    if (!user) {
        return (
            <div className="mx-auto w-full max-w-3xl pt-8">
                <AuthRequiredMessage
                    title="Настройки доступны после входа"
                    description="Авторизуйтесь, чтобы редактировать профиль, переключать тему и настраивать inbox-уведомления."
                />
            </div>
        )
    }

    return <SettingsPageContent user={user} />
}
