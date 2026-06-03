import { AuthRequiredMessage } from "@/features/auth/components/auth-required-message"
import { getCurrentUser } from "@/features/auth/server"
import { PublicationEditor } from "@/features/publications/components/publication-editor"

export default async function CreatePublicationPage() {
    const user = await getCurrentUser()

    if (!user) {
        return (
            <div className="mx-auto w-full max-w-3xl pt-8">
                <AuthRequiredMessage
                    title="Войдите, чтобы создать публикацию"
                    description="Читать материалы можно без входа, но публикация от имени автора доступна только после авторизации."
                />
            </div>
        )
    }

    return <PublicationEditor />
}
