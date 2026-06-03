import { browserApi } from "@/lib/http/browser"
import type { UserFile, UserFileCollection } from "./types"

export async function getMyFiles(params?: { q?: string; visibility?: string; kind?: string; page?: number; per_page?: number }) {
    const response = await browserApi.get<UserFileCollection>("/laravel/me/files", { params })
    return response.data
}

export async function uploadMyFile(payload: { file: File; title?: string; visibility?: "private" | "public" }) {
    const formData = new FormData()
    formData.append("file", payload.file)
    if (payload.title) formData.append("title", payload.title)
    if (payload.visibility) formData.append("visibility", payload.visibility)

    const response = await browserApi.post<{ data: UserFile }>("/laravel/me/files", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    })
    return response.data.data
}

export async function updateMyFile(id: number, payload: { title?: string | null; visibility?: "private" | "public" }) {
    const response = await browserApi.patch<{ data: UserFile }>(`/laravel/me/files/${id}`, payload)
    return response.data.data
}

export async function deleteMyFile(id: number) {
    const response = await browserApi.delete<{ message: string }>(`/laravel/me/files/${id}`)
    return response.data
}
