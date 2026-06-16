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

export type AdminTagReadability = {
    ratio: number
    status: "good" | "acceptable" | "poor"
    label: string
}

export type AdminTag = {
    id: number
    name: string
    slug: string
    description?: string | null
    color?: string | null
    status: string
    is_active: boolean
    posts_count: number
    publications_count: number
    questions_count: number
    total_usage_count: number
    usage_percent: number
    readability_light: AdminTagReadability
    readability_dark: AdminTagReadability
    created_at?: string | null
    updated_at?: string | null
}

export type AdminTagStats = {
    totals: {
        tags: number
        active_tags: number
        inactive_tags: number
        used_tags: number
        unused_tags: number
        poor_light_tags: number
        poor_dark_tags: number
        avg_publications_per_tag: number
        avg_questions_per_tag: number
        avg_light_contrast: number
        avg_dark_contrast: number
        materials_total: number
        tagged_materials_total: number
        tagged_materials_percent: number
    }
    top_publications: AdminTag[]
    top_questions: AdminTag[]
    top_activity: AdminTag[]
    active_distribution: Array<{ name: string; value: number; percent: number }>
    readability_distribution: Array<{ name: string; value: number; percent: number }>
    usage_distribution: Array<{ name: string; value: number; percent: number }>
    popular_tag?: AdminTag | null
    problem_tag?: AdminTag | null
    needs_color_work: number
}

export type AdminTagsResponse = Paginated<AdminTag> & {
    stats: AdminTagStats
}

export type AdminAiModelConfig = {
    id: string
    database_id: number
    label: string
    name: string
    provider: string
    description?: string | null
    category?: string | null
    enabled: boolean
    use_for_chat: boolean
    use_for_embeddings: boolean
    use_for_rerank: boolean
    default_for_chat: boolean
    default_for_embeddings: boolean
    default_for_rerank: boolean
    context_length?: number | null
    modality?: string | null
    input_modalities?: string[]
    output_modalities?: string[]
    supported_parameters?: string[]
    pricing?: Record<string, string | number | null>
    system_prompt?: string | null
    temperature?: number | null
    max_tokens?: number | null
    dimensions?: number | null
    sort_order?: number
    is_available?: boolean
    last_seen_at?: string | null
    updated_at?: string | null
}

export type AdminAiDashboard = {
    stats: {
        models_total: number
        models_enabled: number
        chat_models: number
        embedding_models: number
        sessions: number
        messages: number
        documents: number
        chunks: number
    }
    defaults: {
        chat_model: string
        embedding: { provider: string; model: string; dimensions: number }
        provider: string
        configured: boolean
    }
    daily: Array<{ date: string; messages: number; sessions: number }>
    models: Array<{ model: string; count: number }>
    updated_at?: string
}

export type AdminAiPrompts = Record<"chat" | "rag" | "files" | "code" | "project" | "question_auto_answer", string>
