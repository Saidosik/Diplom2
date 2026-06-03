import { notFound, redirect } from "next/navigation"

import { getCurrentUser } from "@/features/auth/server"
import { PublicProfilePageContent } from "@/features/users/components/public-profile-page-content"
import type { PublicProfileResponse } from "@/features/users/types"
import createLaravelApi from "@/lib/http/laravel"

type UserProfilePageProps = {
    params: Promise<{
        userId: string
    }>
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
    const { userId } = await params
    const currentUser = await getCurrentUser()

    if (currentUser && String(currentUser.id) === String(userId)) {
        redirect("/profile")
    }

    const laravel = createLaravelApi()

    try {
        const response = await laravel.get<PublicProfileResponse>(`/users/${userId}/profile`)
        return <PublicProfilePageContent profile={response.data.data} isAuthenticated={Boolean(currentUser)} />
    } catch (error) {
        console.log("[PUBLIC_PROFILE_PAGE_ERROR]", error)
        notFound()
    }
}
