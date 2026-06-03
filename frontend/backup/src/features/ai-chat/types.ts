import type { RagSource, RagSourceType } from "@/features/ai-rag/types"

export type AiModel = {
    id: string
    label: string
    provider: string
    description?: string | null
    category?: string | null
    default?: boolean
    supports_files?: boolean
    supports_code?: boolean
    supports_rag?: boolean
}

export type AiAttachment = {
    id: number
    original_name: string
    mime_type?: string | null
    extension?: string | null
    size: number
    preview?: string | null
    created_at?: string | null
}

export type AiChatSession = {
    id: number
    title: string
    mode: string
    model?: string | null
    type?: "all" | RagSourceType
    context_scope?: "none" | "all" | RagSourceType
    messages_count: number
    created_at?: string | null
    updated_at?: string | null
}

export type AiChatMessage = {
    id: number | string
    role: "user" | "assistant" | string
    content: string
    sources?: RagSource[]
    attachments?: AiAttachment[]
    metadata?: {
        provider?: string
        model?: string
        used_external_provider?: boolean
        thinking_steps?: string[]
        [key: string]: unknown
    }
    created_at?: string | null
}

export type AiChatResponse = {
    session: AiChatSession
    messages: AiChatMessage[]
    answer: string
    sources: RagSource[]
    meta: {
        provider: string
        model?: string
        used_external_provider: boolean
        rag?: unknown
    }
}

export type AiStreamEvent =
    | { event: "status"; data: { step: string; text: string } }
    | { event: "source"; data: RagSource }
    | { event: "token"; data: { text: string } }
    | { event: "done"; data: AiChatResponse }
    | { event: "error"; data: { message: string } }

export type AiChatMode = "chat" | "rag" | "files" | "code" | "project"
export type AiContextScope = "none" | "all" | RagSourceType

export type AiChatPayload = {
    message: string
    session_id?: number | null
    mode?: AiChatMode
    context_scope?: AiContextScope
    type?: "all" | RagSourceType
    model?: string | null
    attachment_ids?: number[]
    user_file_ids?: number[]
}
