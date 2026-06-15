export type PublicationType = "article" | "news" | "post" | "guide"
export type PublicationStatus = "draft" | "published" | "hidden" | "archived"

export type PublicationBlockType =
    | "heading"
    | "paragraph"
    | "markdown"
    | "image"
    | "video"
    | "code"
    | "terminal"
    | "diff"
    | "file_tree"
    | "callout"
    | "code_snippet"
    | "important"
    | "quote"
    | "warning"
    | "link"
    | "divider"
    | "table"
    | "diagram"


export type PublicationTag = {
    id: number
    name: string
    slug: string
    description?: string | null
    color?: string | null
    status?: string | null
}

export type PublicationAuthor = {
    id: number
    name: string
    role?: string | null
    reputation_score?: number
    reputation_level?: { label: string; next_label?: string | null; progress: number } | null
    avatar?: string | null
    avatar_url?: string | null
}

export type PublicationAttachment = {
    id: number
    user_file_id: number
    title?: string | null
    original_name: string
    mime_type?: string | null
    size: number
    kind?: string | null
    visibility?: string | null
    download_url?: string | null
}

export type PublicationBlockContent = Record<string, unknown>

export type PublicationBlock = {
    id?: number
    client_id?: string
    type: PublicationBlockType
    type_label?: string
    sort_order: number
    content: PublicationBlockContent
    properties?: PublicationBlockContent
    created_at?: string | null
    updated_at?: string | null
}

export type Publication = {
    id: number
    type: PublicationType
    type_label?: string
    status: PublicationStatus
    status_label?: string
    title: string
    slug: string
    excerpt?: string | null
    cover_image_path?: string | null
    cover_image_url?: string | null
    cover_file_id?: number | null
    cover_alt_text?: string | null
    cover_caption?: string | null
    last_autosaved_at?: string | null
    autosave_version?: number
    editor_state?: Record<string, unknown> | null
    seo_title?: string | null
    seo_description?: string | null
    canonical_url?: string | null
    reading_time_minutes?: number | null
    likes_count?: number
    dislikes_count?: number
    comments_count?: number
    saved_count?: number
    my_reaction?: "like" | "dislike" | null
    is_saved?: boolean
    published_at?: string | null
    created_at?: string | null
    updated_at?: string | null
    is_owner?: boolean
    author?: PublicationAuthor | null
    tags?: PublicationTag[]
    blocks?: PublicationBlock[]
    attachments?: PublicationAttachment[]
}

export type PublicationPayload = {
    type: PublicationType
    status: PublicationStatus
    title: string
    slug?: string | null
    excerpt?: string | null
    cover_image_path?: string | null
    cover_file_id?: number | null
    cover_alt_text?: string | null
    cover_caption?: string | null
    seo_title?: string | null
    seo_description?: string | null
    canonical_url?: string | null
    reading_time_minutes?: number | null
    tags?: string[]
    attachment_ids?: number[]
    blocks: Array<{
        type: PublicationBlockType
        sort_order: number
        content: PublicationBlockContent
    }>
}

export type PublicationPaginationMeta = {
    current_page?: number
    last_page?: number
    per_page?: number
    total?: number
}

export type PublicationCollectionResponse = {
    data: Publication[]
    meta?: PublicationPaginationMeta
}

export type PublicationSingleResponse = {
    data: Publication
}

export type PopularPublicationPeriod = "day" | "week" | "month" | "all"

export type PopularPublicationsResponse = {
    data: Publication[]
    meta: {
        period: PopularPublicationPeriod
        limit: number
        current_page: number
        next_page: number | null
        has_more: boolean
        total: number
    }
}

export type PublicationQualityReport = { score: number; blockers: string[]; errors?: string[]; warnings: string[]; suggestions: string[] }
export type PublicationVersion = { id: number; version_number: number; title: string; excerpt?: string | null; editor_state?: Record<string, unknown> | null; change_summary?: string | null; created_at?: string | null }
export type PublicationTemplate = { id: number; title: string; slug: string; description?: string | null; category: string; blocks_schema: PublicationPayload["blocks"]; tags?: string[]; is_system: boolean }
