import { redirect } from "next/navigation"

import { AuthRequiredMessage } from "@/features/auth/components/auth-required-message"
import { getCurrentUser } from "@/features/auth/server"
import { getUserProfileHrefOrFallback } from "@/features/users/lib/user-links"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function ProfilePage() {
    const user = await getCurrentUser()

    if (!user) {
        return (
            <div className="mx-auto w-full max-w-3xl pt-8">
                <AuthRequiredMessage
                    title="Профиль доступен после входа"
                    description="Авторизуйтесь, чтобы открыть публичный профиль участника."
                />
            </div>
        )
    }

    redirect(getUserProfileHrefOrFallback(user))
}
