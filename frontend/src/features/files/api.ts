import { browserApi } from "@/lib/http/browser"
import type { FileFolder, UserFile, UserFileCollection, UserFilePreview } from "./types"

export async function getMyFiles(params?: { q?: string; visibility?: string; kind?: string; sort?: string; folder_id?: number | "none"; pinned?: boolean; page?: number; per_page?: number }) {
    const response = await browserApi.get<UserFileCollection>("/laravel/me/files", { params })
    return response.data
}

export async function getMyFile(id: number) {
    const response = await browserApi.get<{ data: UserFile }>(`/laravel/me/files/${id}`)
    return response.data.data
}

export async function getMyFileTextPreview(id: number) {
    const response = await browserApi.get<UserFilePreview>(`/laravel/me/files/${id}/preview`)
    return response.data
}

export async function uploadMyFile(payload: { file: File; title?: string; visibility?: "private" | "public"; folder_id?: number | null }) {
    const formData = new FormData()
    formData.append("file", payload.file)
    if (payload.title) formData.append("title", payload.title)
    if (payload.visibility) formData.append("visibility", payload.visibility)
    if (payload.folder_id) formData.append("folder_id", String(payload.folder_id))

    const response = await browserApi.post<{ data: UserFile }>("/laravel/me/files", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    })
    return response.data.data
}

export async function updateMyFile(id: number, payload: { title?: string | null; visibility?: "private" | "public"; pinned?: boolean; folder_id?: number | null }) {
    const response = await browserApi.patch<{ data: UserFile }>(`/laravel/me/files/${id}`, payload)
    return response.data.data
}

export async function deleteMyFile(id: number) {
    const response = await browserApi.delete<{ message: string }>(`/laravel/me/files/${id}`)
    return response.data
}

export async function fetchFolders() {
    const response = await browserApi.get<{ data: FileFolder[] }>("/laravel/me/file-folders")
    return response.data.data
}

export async function createFolder(payload: { name: string; color?: string | null; icon?: string | null; sort_order?: number }) {
    const response = await browserApi.post<{ data: FileFolder }>("/laravel/me/file-folders", payload)
    return response.data.data
}

export async function updateFolder(id: number, payload: { name?: string; color?: string | null; icon?: string | null; sort_order?: number }) {
    const response = await browserApi.patch<{ data: FileFolder }>(`/laravel/me/file-folders/${id}`, payload)
    return response.data.data
}

export async function deleteFolder(id: number) {
    const response = await browserApi.delete<{ message: string }>(`/laravel/me/file-folders/${id}`)
    return response.data
}

export async function moveFileToFolder(id: number, folder_id: number | null) {
    return updateMyFile(id, { folder_id })
}

export async function toggleFilePinned(id: number, pinned: boolean) {
    return updateMyFile(id, { pinned })
}
