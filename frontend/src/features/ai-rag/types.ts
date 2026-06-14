export type RagSourceType = "publication" | "question" | "answer" | "snippet"

export type RagSource = {
    id: number
    document_id: number
    type: RagSourceType
    source_id: number
    title: string
    content: string
    href?: string | null
    score: number
    semantic_score: number
    lexical_score: number
    chunk_index: number
    tags?: Array<{ id?: number; name: string; slug?: string; color?: string | null }>
    metadata?: Record<string, unknown>
    indexed_at?: string | null
}

export type RagSearchResponse = {
    data: RagSource[]
    meta: {
        query: string
        type: "all" | RagSourceType
        limit: number
        engine: string
        total_candidates: number
    }
}

export type AiChatSession = {
    id: number
    title: string
    mode: string
    messages_count: number
    created_at?: string | null
    updated_at?: string | null
}

export type AiChatMessage = {
    id: number
    role: "user" | "assistant" | string
    content: string
    sources?: RagSource[]
    metadata?: Record<string, unknown>
    created_at?: string | null
}

export type AiChatResponse = {
    session: AiChatSession
    messages: AiChatMessage[]
    answer: string
    sources: RagSource[]
    meta: {
        provider: string
        used_external_provider: boolean
        rag: RagSearchResponse["meta"]
    }
}

export type CodeExplainIntent = "explain_result" | "explain_error" | "find_bug" | "optimize" | "write_tests"

export type CodeExplainResponse = {
    answer: string
    sources: RagSource[]
    meta: RagSearchResponse["meta"]
}
