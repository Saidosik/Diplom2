import { AuthRequiredMessage } from "@/features/auth/components/auth-required-message"
import { getCurrentUser } from "@/features/auth/server"
import { ProfilePageContent } from "@/features/profile/components/profile-page-content"

export default async function ProfilePage() {
    const user = await getCurrentUser()

    if (!user) {
        return (
            <div className="mx-auto w-full max-w-3xl pt-8">
                <AuthRequiredMessage
                    title="Профиль доступен после входа"
                    description="Авторизуйтесь, чтобы смотреть профиль, сохранённые материалы, ответы и активность сообщества."
                />
            </div>
        )
    }

    return <ProfilePageContent user={user} />
}
