import { AuthRequiredMessage } from "@/features/auth/components/auth-required-message"
import { getCurrentUser } from "@/features/auth/server"
import { AiChatPage } from "@/features/ai-chat/components/ai-chat-page"

export const dynamic = "force-dynamic"

export default async function AssistantPage() {
    const user = await getCurrentUser()

    if (!user) {
        return (
            <div className="mx-auto w-full max-w-3xl pt-8">
                <AuthRequiredMessage
                    title="AI-помощник доступен после входа"
                    description="Войдите в аккаунт, чтобы открывать приватные AI-чаты, хранить историю диалогов, анализировать файлы и использовать персональный контекст."
                />
            </div>
        )
    }

    return <AiChatPage />
}
