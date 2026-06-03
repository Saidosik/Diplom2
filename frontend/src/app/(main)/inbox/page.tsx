import { AuthRequiredMessage } from "@/features/auth/components/auth-required-message"
import { getCurrentUser } from "@/features/auth/server"
import { InboxPage } from "@/features/community/components/inbox-page"

export const dynamic = "force-dynamic"

export default async function Page() {
    const user = await getCurrentUser()

    if (!user) {
        return (
            <AuthRequiredMessage
                title="Войдите, чтобы открыть Inbox"
                description="Уведомления и подписки доступны только авторизованным участникам сообщества."
            />
        )
    }

    return <InboxPage />
}
