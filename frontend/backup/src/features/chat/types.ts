import type { User } from "@/features/auth/types"

export type ChatAttachment = {
    id: number
    kind: "image" | "video" | "audio" | "pdf" | "file" | string
    url: string
    path: string
    original_name: string
    mime_type?: string | null
    size: number
    width?: number | null
    height?: number | null
    created_at?: string | null
}

export type ChatMessage = {
    id: number
    conversation_id: number
    sender: User | null
    type: "text" | "file" | "system" | string
    body?: string | null
    metadata?: Record<string, unknown>
    attachments: ChatAttachment[]
    edited_at?: string | null
    created_at?: string | null
    updated_at?: string | null
    read_by?: ChatParticipant[]
    read_by_count?: number
    read_by_user_ids?: number[]
    is_read_by_everyone?: boolean
    active_readers_target?: number
}

export type ChatParticipant = {
    id: number
    role: "owner" | "admin" | "member" | string
    user: User
    last_read_at?: string | null
    muted_until?: string | null
    joined_at?: string | null
    left_at?: string | null
    is_typing?: boolean
    typing_started_at?: string | null
    typing_expires_at?: string | null
}

export type ChatConversation = {
    id: number
    type: "direct" | "group" | string
    title?: string | null
    description?: string | null
    avatar?: string | null
    avatar_url?: string | null
    participants: ChatParticipant[]
    last_message?: ChatMessage | null
    last_message_at?: string | null
    unread_count: number
    my_role?: string | null
    created_at?: string | null
    updated_at?: string | null
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
