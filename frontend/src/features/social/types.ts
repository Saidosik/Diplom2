import type { User } from "@/features/auth/types"

export type FriendRequest = {
    id: number
    status: "pending" | "accepted" | "declined" | "cancelled" | string
    message?: string | null
    sender: User
    recipient: User
    responded_at?: string | null
    created_at?: string | null
    updated_at?: string | null
}

export type Friendship = {
    id: number
    friend: User | null
    user_one_id: number
    user_two_id: number
    requested_by_id?: number | null
    friended_at?: string | null
    created_at?: string | null
}

export type FriendRequestsResponse = {
    incoming: FriendRequest[]
    outgoing: FriendRequest[]
}

export type Paginated<T> = {
    data: T[]
    links?: unknown
    meta?: {
        current_page?: number
        last_page?: number
        total?: number
        per_page?: number
    }
}
