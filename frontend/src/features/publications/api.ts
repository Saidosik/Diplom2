import { browserApi } from "@/lib/http/browser"
import type {
    Publication,
    PublicationCollectionResponse,
    PublicationPayload,
    PublicationSingleResponse,
    PopularPublicationPeriod,
    PopularPublicationsResponse,
} from "@/features/publications/types"

function unwrapPublication(payload: PublicationSingleResponse | Publication): Publication {
    return "data" in payload ? payload.data : payload
}

export async function createPublication(payload: PublicationPayload) {
    const response = await browserApi.post<PublicationSingleResponse>("/laravel/publications", payload)
    return unwrapPublication(response.data)
}

export async function updatePublication(id: number, payload: PublicationPayload) {
    const response = await browserApi.put<PublicationSingleResponse>(`/laravel/publications/${id}`, payload)
    return unwrapPublication(response.data)
}

export async function deletePublication(id: number) {
    const response = await browserApi.delete<{ message: string }>(`/laravel/publications/${id}`)
    return response.data
}

export async function getMyPublications(params?: Record<string, string | number | undefined>) {
    const response = await browserApi.get<PublicationCollectionResponse>("/laravel/me/publications", { params })
    return response.data
}


export async function getPopularPublications(params?: { period?: PopularPublicationPeriod; limit?: number; page?: number; sort?: string; type?: string }) {
    const response = await browserApi.get<PopularPublicationsResponse>("/publications/popular", { params })
    return response.data
}
