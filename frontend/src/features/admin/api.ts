import { browserApi } from "@/lib/http/browser"
import type { AdminAiDocument, AdminAiIndexStatus, AdminChatMessage, AdminContentItem, AdminConversation, AdminDashboard, AdminReport, AdminUser, AdminLogsResponse, Paginated } from "./types"

export type AdminListParams = {
    q?: string
    status?: string
    type?: string
    role?: string
    reason?: string
    page?: number
    per_page?: number
}

export async function getAdminDashboard() {
    const response = await browserApi.get<AdminDashboard>("/laravel/admin/dashboard")
    return response.data
}

export async function getAdminReports(params?: AdminListParams) {
    const response = await browserApi.get<Paginated<AdminReport>>("/laravel/admin/reports", { params })
    return response.data
}

export async function updateAdminReport(id: number, payload: { status: string; action?: string }) {
    const response = await browserApi.patch<{ data: AdminReport }>(`/laravel/admin/reports/${id}`, payload)
    return response.data.data
}

export async function getAdminUsers(params?: AdminListParams) {
    const response = await browserApi.get<Paginated<AdminUser>>("/laravel/admin/users", { params })
    return response.data
}

export async function updateAdminUser(id: number, payload: { role: string }) {
    const response = await browserApi.patch<{ data: AdminUser }>(`/laravel/admin/users/${id}`, payload)
    return response.data.data
}

export async function deleteAdminUser(id: number) {
    const response = await browserApi.delete<{ data: AdminUser }>(`/laravel/admin/users/${id}`)
    return response.data.data
}

export async function restoreAdminUser(id: number) {
    const response = await browserApi.post<{ data: AdminUser }>(`/laravel/admin/users/${id}/restore`)
    return response.data.data
}

export async function getAdminContent(kind: "publications" | "questions" | "answers" | "comments", params?: AdminListParams) {
    const response = await browserApi.get<Paginated<AdminContentItem>>(`/laravel/admin/${kind}`, { params })
    return response.data
}

export async function updateAdminContentStatus(kind: "publications" | "questions" | "answers" | "comments", id: number, status: string) {
    const response = await browserApi.patch<{ data: AdminContentItem }>(`/laravel/admin/${kind}/${id}`, { status })
    return response.data.data
}

export async function deleteAdminContent(kind: "publications" | "questions" | "comments", id: number) {
    const response = await browserApi.delete<{ data: AdminContentItem }>(`/laravel/admin/${kind}/${id}`)
    return response.data.data
}

export async function restoreAdminContent(kind: "publications" | "questions" | "comments", id: number) {
    const response = await browserApi.post<{ data: AdminContentItem }>(`/laravel/admin/${kind}/${id}/restore`)
    return response.data.data
}

export async function getAdminChats(params?: AdminListParams) {
    const response = await browserApi.get<Paginated<AdminConversation>>("/laravel/admin/chats", { params })
    return response.data
}

export async function getAdminChatMessages(conversationId: number, params?: AdminListParams) {
    const response = await browserApi.get<Paginated<AdminChatMessage>>(`/laravel/admin/chats/${conversationId}/messages`, { params })
    return response.data
}

export async function deleteAdminConversation(id: number) {
    const response = await browserApi.delete<{ data: AdminConversation }>(`/laravel/admin/chats/${id}`)
    return response.data.data
}

export async function restoreAdminConversation(id: number) {
    const response = await browserApi.post<{ data: AdminConversation }>(`/laravel/admin/chats/${id}/restore`)
    return response.data.data
}

export async function deleteAdminChatMessage(conversationId: number, messageId: number) {
    const response = await browserApi.delete<{ data: AdminChatMessage }>(`/laravel/admin/chats/${conversationId}/messages/${messageId}`)
    return response.data.data
}

export async function restoreAdminChatMessage(conversationId: number, messageId: number) {
    const response = await browserApi.post<{ data: AdminChatMessage }>(`/laravel/admin/chats/${conversationId}/messages/${messageId}/restore`)
    return response.data.data
}

export async function getAdminAiIndexStatus() {
    const response = await browserApi.get<{ data: AdminAiIndexStatus }>("/laravel/admin/ai/index/status")
    return response.data.data
}

export async function getAdminAiDocuments(params?: AdminListParams) {
    const response = await browserApi.get<Paginated<AdminAiDocument>>("/laravel/admin/ai/index/documents", { params })
    return response.data
}

export async function rebuildAdminAiIndex(payload: { mode?: "queued" | "sync"; force?: boolean } = {}) {
    const response = await browserApi.post<{ message: string; data: unknown }>("/laravel/admin/ai/index/rebuild", payload)
    return response.data
}

export async function reindexAdminAiStale(payload: { force?: boolean } = {}) {
    const response = await browserApi.post<{ message: string; data: { queued: number } }>("/laravel/admin/ai/index/reindex-stale", payload)
    return response.data
}

export async function reindexAdminAiSource(payload: { source_type: string; source_id: number; mode?: "queued" | "sync"; force?: boolean }) {
    const response = await browserApi.post<{ message: string; data: unknown }>("/laravel/admin/ai/index/reindex-source", payload)
    return response.data
}

export async function deleteAdminAiDocument(id: number) {
    const response = await browserApi.delete<{ message: string }>(`/laravel/admin/ai/index/documents/${id}`)
    return response.data
}


export async function getAdminLogs(params?: { q?: string; level?: string; lines?: number }) {
    const response = await browserApi.get<AdminLogsResponse>("/laravel/admin/logs", { params })
    return response.data
}

export type AdminTagPayload = {
    name: string
    slug?: string
    description?: string | null
    color: string
    is_active?: boolean
}

export async function getAdminTags(params?: AdminListParams & { readability?: string; usage?: string; sort?: string; direction?: string }) {
    const response = await browserApi.get<import("./types").AdminTagsResponse>("/laravel/admin/tags", { params })
    return response.data
}

export async function createAdminTag(payload: AdminTagPayload) {
    const response = await browserApi.post<{ data: import("./types").AdminTag }>("/laravel/admin/tags", payload)
    return response.data.data
}

export async function updateAdminTag(id: number, payload: AdminTagPayload) {
    const response = await browserApi.patch<{ data: import("./types").AdminTag }>(`/laravel/admin/tags/${id}`, payload)
    return response.data.data
}

export async function deleteAdminTag(id: number) {
    const response = await browserApi.delete<{ message: string }>(`/laravel/admin/tags/${id}`)
    return response.data
}

export async function getAdminAiDashboard() {
    const response = await browserApi.get<{ data: import("./types").AdminAiDashboard }>("/laravel/admin/ai/dashboard")
    return response.data.data
}

export async function getAdminAiModels(params?: { q?: string; usage?: string; enabled?: string }) {
    const response = await browserApi.get<{ data: import("./types").AdminAiModelConfig[]; meta: import("./types").AdminAiDashboard }>("/laravel/admin/ai/models", { params })
    return response.data
}

export async function syncAdminAiModels(payload: { limit?: number } = {}) {
    const response = await browserApi.post<{ message: string; data: { synced: number; total_remote?: number; error?: string; message?: string } }>("/laravel/admin/ai/models/sync", payload)
    return response.data
}

export async function updateAdminAiModel(databaseId: number, payload: Partial<import("./types").AdminAiModelConfig>) {
    const response = await browserApi.patch<{ message: string; data: import("./types").AdminAiModelConfig }>(`/laravel/admin/ai/models/${databaseId}`, payload)
    return response.data.data
}

export async function getAdminAiPrompts() {
    const response = await browserApi.get<{ data: import("./types").AdminAiPrompts; defaults: import("./types").AdminAiPrompts }>("/laravel/admin/ai/prompts")
    return response.data
}

export async function updateAdminAiPrompts(payload: Partial<import("./types").AdminAiPrompts>) {
    const response = await browserApi.patch<{ message: string; data: import("./types").AdminAiPrompts }>("/laravel/admin/ai/prompts", payload)
    return response.data.data
}
