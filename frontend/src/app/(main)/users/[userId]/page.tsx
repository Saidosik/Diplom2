import { redirect } from "next/navigation"

import { getUserProfileHrefOrFallback } from "@/features/users/lib/user-links"

type UserProfilePageProps = {
    params: Promise<{
        userId: string
    }>
}

export default async function LegacyUserProfileRedirect({ params }: UserProfilePageProps) {
    const { userId } = await params
    redirect(getUserProfileHrefOrFallback(userId))
}
