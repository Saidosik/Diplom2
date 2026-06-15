import { browserApi } from "@/lib/http/browser"
import type {
    Publication,
    PublicationCollectionResponse,
    PublicationPayload,
    PublicationSingleResponse,
    PopularPublicationPeriod,
    PopularPublicationsResponse,
    PublicationQualityReport,
    PublicationVersion,
    PublicationTemplate,
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


export async function createDraftIfNotExists() {
    const response = await browserApi.post<PublicationSingleResponse>("/laravel/publications/create-draft-if-not-exists")
    return unwrapPublication(response.data)
}

export async function autosavePublication(id: number, payload: Partial<PublicationPayload> & { autosave_version: number; editor_state: Record<string, unknown> }) {
    const response = await browserApi.post<{ data: { id: number; autosave_version: number; last_autosaved_at: string } }>(`/laravel/publications/${id}/autosave`, payload)
    return response.data.data
}

export async function analyzePublicationQuality(payload: PublicationPayload) {
    const response = await browserApi.post<PublicationQualityReport>("/laravel/publications/analyze-quality", payload)
    return response.data
}

export async function prepublishCheck(id: number) {
    const response = await browserApi.post<{ blockers: string[]; warnings: string[]; suggestions: string[]; summary: Record<string, unknown> }>(`/laravel/publications/${id}/prepublish-check`)
    return response.data
}

export async function getPublicationVersions(id: number) {
    const response = await browserApi.get<{ data: PublicationVersion[] }>(`/laravel/publications/${id}/versions`)
    return response.data.data
}

export async function restorePublicationVersion(id: number, version: number) {
    const response = await browserApi.post<PublicationSingleResponse>(`/laravel/publications/${id}/versions/${version}/restore`)
    return unwrapPublication(response.data)
}

export async function getPublicationTemplates() {
    const response = await browserApi.get<{ data: PublicationTemplate[] }>("/laravel/publication-templates")
    return response.data.data
}

export async function importPublicationMarkdown(markdown: string) {
    const response = await browserApi.post<{ data: { blocks: PublicationPayload["blocks"] } }>("/laravel/publications/import-markdown", { markdown })
    return response.data.data.blocks
}
