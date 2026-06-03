import { notFound } from "next/navigation"

import { getAccessTokenCookie } from "@/lib/auth/cookies"
import createLaravelApi from "@/lib/http/laravel"
import { PublicationEditor } from "@/features/publications/components/publication-editor"
import type { PublicationSingleResponse } from "@/features/publications/types"

type EditPublicationPageProps = {
    params: Promise<{
        id: string
    }>
}

export default async function EditPublicationPage({ params }: EditPublicationPageProps) {
    const { id } = await params
    const token = await getAccessTokenCookie()
    const laravel = createLaravelApi(token)

    try {
        const response = await laravel.get<PublicationSingleResponse>(`/me/publications/${id}`)
        return <PublicationEditor initialPublication={response.data.data} />
    } catch (error) {
        console.log("[PUBLICATION_EDIT_ERROR]", error)
        notFound()
    }
}
