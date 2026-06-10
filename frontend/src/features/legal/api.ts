import { browserApi } from "@/lib/http/browser"

export type LegalPage = {
    slug: string
    title: string
    content: string
    is_published?: boolean
    updated_at?: string | null
}

export type LegalPagePayload = {
    title: string
    content: string
    is_published: boolean
}

export async function getPrivacyPolicy(): Promise<LegalPage> {
    const response = await browserApi.get<LegalPage>("/laravel/legal/privacy-policy")
    return response.data
}

export async function getAdminLegalPage(slug: string): Promise<LegalPage> {
    const response = await browserApi.get<{ data: LegalPage }>(`/laravel/admin/legal-pages/${slug}`)
    return response.data.data
}

export async function updateAdminLegalPage(slug: string, payload: LegalPagePayload): Promise<LegalPage> {
    const response = await browserApi.put<{ message: string; data: LegalPage }>(`/laravel/admin/legal-pages/${slug}`, payload)
    return response.data.data
}
