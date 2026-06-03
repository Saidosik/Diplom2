export type UserFile = {
    id: number
    title?: string | null
    original_name: string
    mime_type?: string | null
    size: number
    kind: "image" | "video" | "audio" | "pdf" | "archive" | "text" | "file" | string
    visibility: "private" | "public"
    download_url?: string | null
    metadata?: Record<string, unknown>
    created_at?: string | null
    updated_at?: string | null
}

export type UserFileCollection = {
    data: UserFile[]
    links?: unknown
    meta?: {
        current_page?: number
        last_page?: number
        total?: number
        per_page?: number
    }
}
