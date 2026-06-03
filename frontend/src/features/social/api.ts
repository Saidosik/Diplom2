import { browserApi } from "@/lib/http/browser"
import type { FriendRequestsResponse, Friendship, FriendRequest, Paginated } from "./types"
import type { User } from "@/features/auth/types"

export async function getFriends(params?: { q?: string; page?: number; per_page?: number }) {
    const response = await browserApi.get<Paginated<Friendship>>("/laravel/friends", { params })
    return response.data
}

export async function getFriendRequests() {
    const response = await browserApi.get<FriendRequestsResponse>("/laravel/friends/requests")
    return response.data
}

export async function getFriendSuggestions(params?: { q?: string; limit?: number }) {
    const response = await browserApi.get<{ data: User[] }>("/laravel/friends/suggestions", { params })
    return response.data.data
}

export async function sendFriendRequest(payload: { recipient_id: number; message?: string }) {
    const response = await browserApi.post<{ data: FriendRequest }>("/laravel/friends/requests", payload)
    return response.data.data
}

export async function acceptFriendRequest(id: number) {
    const response = await browserApi.post<{ data: Friendship }>(`/laravel/friends/requests/${id}/accept`)
    return response.data.data
}

export async function declineFriendRequest(id: number) {
    const response = await browserApi.post<{ message: string }>(`/laravel/friends/requests/${id}/decline`)
    return response.data
}

export async function cancelFriendRequest(id: number) {
    const response = await browserApi.delete<{ message: string }>(`/laravel/friends/requests/${id}`)
    return response.data
}

export async function removeFriendship(id: number) {
    const response = await browserApi.delete<{ message: string }>(`/laravel/friends/${id}`)
    return response.data
}
