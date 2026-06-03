import { browserApi } from "@/lib/http/browser"
import type { User } from "@/features/auth/types"

export async function sendPresenceHeartbeat() {
    const response = await browserApi.post<{ data?: User; user?: User }>("/laravel/presence/heartbeat")
    return response.data
}

export async function sendPresenceOffline() {
    const response = await browserApi.post<{ message: string; user?: User }>("/laravel/presence/offline")
    return response.data
}

export async function getFriendsPresence() {
    const response = await browserApi.get<{ data: User[] }>("/laravel/presence/friends")
    return response.data.data
}
