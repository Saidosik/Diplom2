import axios from "axios"
import { notFound } from "next/navigation"

import { getAccessTokenCookie } from "@/lib/auth/cookies"
import createLaravelApi from "@/lib/http/laravel"
import { PublicationDetailPage } from "@/features/publications/components/publication-detail-page"
import type { PublicationSingleResponse } from "@/features/publications/types"

type PublicationPageProps = {
    params: Promise<{
        slug: string
    }>
}

export default async function PublicationPage({ params }: PublicationPageProps) {
    const { slug } = await params
    const token = await getAccessTokenCookie()
    const response = await loadPublicationBySlug(slug, token)

    if (!response) {
        notFound()
    }

    return <PublicationDetailPage publication={response.data.data} isAuthenticated={Boolean(token)} />
}

async function loadPublicationBySlug(slug: string, token?: string | null) {
    const privateApi = createLaravelApi(token)
    const publicApi = createLaravelApi(null)

    if (token) {
        try {
            return await privateApi.get<PublicationSingleResponse>(`/me/publications/by-slug/${slug}`)
        } catch (error) {
            if (!shouldFallbackToPublicPublication(error)) {
                throw error
            }
        }
    }

    try {
        return await publicApi.get<PublicationSingleResponse>(`/publications/${slug}`)
    } catch (error) {
        if (isNotFoundResponse(error)) {
            return null
        }

        throw error
    }
}

function shouldFallbackToPublicPublication(error: unknown) {
    if (!axios.isAxiosError(error)) {
        return false
    }

    const status = error.response?.status

    return status === 401 || status === 403 || status === 404
}

function isNotFoundResponse(error: unknown) {
    return axios.isAxiosError(error) && error.response?.status === 404
}
