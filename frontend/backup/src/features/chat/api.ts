import { browserApi } from "@/lib/http/browser"
import type { ChatConversation, ChatMessage, Paginated } from "./types"

export async function getConversations(params?: { page?: number; per_page?: number }) {
    const response = await browserApi.get<Paginated<ChatConversation>>("/laravel/chats", { params })
    return response.data
}

export async function getConversation(id: number | string) {
    const response = await browserApi.get<{ data: ChatConversation }>(`/laravel/chats/${id}`)
    return response.data.data
}

export async function getMessages(id: number | string, params?: { page?: number; per_page?: number }) {
    const response = await browserApi.get<Paginated<ChatMessage>>(`/laravel/chats/${id}/messages`, { params })
    return response.data
}

export async function openDirectChat(userId: number) {
    const response = await browserApi.post<{ data: ChatConversation }>("/laravel/chats/direct", { user_id: userId })
    return response.data.data
}

export async function createGroupChat(payload: { title: string; description?: string; participant_ids?: number[] }) {
    const response = await browserApi.post<{ data: ChatConversation }>("/laravel/chats/groups", payload)
    return response.data.data
}

export async function sendChatMessage(conversationId: number | string, payload: { body?: string; attachments?: File[] }) {
    const formData = new FormData()
    if (payload.body) formData.append("body", payload.body)
    for (const file of payload.attachments ?? []) {
        formData.append("attachments[]", file)
    }

    const response = await browserApi.post<{ data: ChatMessage }>(`/laravel/chats/${conversationId}/messages`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    })
    return response.data.data
}

export async function markConversationRead(conversationId: number | string) {
    const response = await browserApi.post<{ message: string }>(`/laravel/chats/${conversationId}/read`)
    return response.data
}

export async function addChatParticipants(conversationId: number | string, participantIds: number[]) {
    const response = await browserApi.post<{ data: ChatConversation }>(`/laravel/chats/${conversationId}/participants`, { participant_ids: participantIds })
    return response.data.data
}


export async function sendTypingStatus(conversationId: number | string, isTyping: boolean) {
    const response = await browserApi.post<{ message: string; is_typing: boolean; typing_expires_at?: string | null }>(`/laravel/chats/${conversationId}/typing`, { is_typing: isTyping })
    return response.data
}
