export type Paginated<T> = {
    data: T[]
    meta: {
        current_page: number
        last_page: number
        per_page: number
        total: number
    }
}

export type AdminUser = {
    id: number
    name: string
    email: string
    role: "user" | "moderator" | "admin" | string
    headline?: string | null
    avatar_url?: string | null
    reputation_score?: number
    presence_status?: string
    is_online?: boolean
    last_seen_at?: string | null
    deleted_at?: string | null
    created_at?: string | null
    counts?: Record<string, number>
}

export type AdminTarget = {
    type: string
    id: number
    title: string
    status?: string | null
    href?: string | null
    deleted_at?: string | null
}

export type AdminReport = {
    id: number
    status: "new" | "reviewed" | "rejected" | string
    reason: string
    details?: string | null
    reportable_type: string
    reportable_id: number
    created_at?: string | null
    updated_at?: string | null
    user?: AdminUser | null
    target?: AdminTarget | null
}

export type AdminDashboard = {
    stats: {
        users: Record<string, number>
        reports: Record<string, number>
        content: {
            publications: Record<string, number>
            questions: Record<string, number>
            answers: Record<string, number>
            comments: Record<string, number>
            tags: number
            snippets: number
        }
        chats: Record<string, number>
    }
    recent_reports: AdminReport[]
    recent_users: AdminUser[]
    popular_tags: Array<{ id: number; name: string; slug: string; color?: string | null; usage_count: number }>
}

export type AdminContentItem = {
    id: number
    type: "publication" | "issue_question" | "issue_answer" | "comment" | string
    title?: string
    slug?: string
    excerpt?: string | null
    content?: string
    status: string
    href?: string | null
    author?: AdminUser | null
    tags?: Array<{ id: number; name: string; slug: string; color?: string | null }>
    target?: AdminTarget | null
    question?: AdminTarget | null
    counts?: Record<string, number>
    is_accepted?: boolean
    is_ai_generated?: boolean
    deleted_at?: string | null
    created_at?: string | null
    updated_at?: string | null
}

export type AdminConversation = {
    id: number
    type: "direct" | "group" | string
    title?: string | null
    description?: string | null
    owner?: AdminUser | null
    participants_count: number
    messages_count: number
    last_message_at?: string | null
    last_message?: AdminChatMessage | null
    participants?: Array<{ id: number; role: string; joined_at?: string | null; left_at?: string | null; user?: AdminUser | null }>
    deleted_at?: string | null
    created_at?: string | null
}

export type AdminChatAttachment = {
    id: number
    kind: string
    original_name: string
    mime_type?: string | null
    size: number
    url: string
}

export type AdminChatMessage = {
    id: number
    conversation_id: number
    type: string
    body?: string | null
    sender?: AdminUser | null
    attachments: AdminChatAttachment[]
    edited_at?: string | null
    deleted_at?: string | null
    created_at?: string | null
}

export type AdminAiIndexStatus = {
    documents: {
        total: number
        indexed: number
        indexing: number
        failed: number
        stale: number
    }
    chunks: { total: number }
    sources: Record<string, number>
    indexed_by_type: Record<string, number>
    missing_by_type: Record<string, number>
    provider: {
        chat_provider?: string | null
        chat_model?: string | null
        embedding_provider?: string | null
        embedding_model?: string | null
        embedding_dimensions?: number | null
        vector_driver?: string | null
        rerank_enabled?: boolean
    }
    updated_at?: string | null
}

export type AdminAiDocument = {
    id: number
    source_type: "publication" | "question" | "answer" | "snippet" | string
    source_id: number
    title: string
    url?: string | null
    href?: string | null
    status: string
    is_stale: boolean
    chunks_count: number
    embedding_provider?: string | null
    embedding_model?: string | null
    embedding_dimensions?: number | null
    last_error?: string | null
    indexed_at?: string | null
    source_updated_at?: string | null
    updated_at?: string | null
}


export type AdminLogEntry = {
    line: number
    level: string
    datetime?: string | null
    message: string
    raw: string
}

export type AdminLogsResponse = {
    data: AdminLogEntry[]
    meta: {
        path: string
        size: number
        updated_at?: string | null
        returned?: number
    }
}
