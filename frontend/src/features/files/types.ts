export type UserFile = {
    id: number
    title?: string | null
    original_name: string
    mime_type?: string | null
    size: number
    kind: "image" | "video" | "audio" | "pdf" | "archive" | "text" | "file" | string
    visibility: "private" | "public"
    is_owner?: boolean
    can_preview?: boolean
    can_download?: boolean
    preview_url?: string | null
    download_url?: string | null
    public_url?: string | null
    share_url?: string | null
    metadata?: Record<string, unknown>
    created_at?: string | null
    updated_at?: string | null
}

export type UserFileStorageMeta = {
    used_bytes: number
    quota_bytes: number
    used_percent: number
    files_count: number
    max_files: number
    public_files_count: number
    max_public_files: number
    max_file_bytes: number
    allowed_types?: string[]
    allowed_kinds?: string[]
}

export type UserFileCollection = {
    data: UserFile[]
    links?: unknown
    meta?: {
        current_page?: number
        last_page?: number
        total?: number
        per_page?: number
        storage?: UserFileStorageMeta
    }
}

export type UserFilePreview = {
    content: string
    truncated: boolean
}
