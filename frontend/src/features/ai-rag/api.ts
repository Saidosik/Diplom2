import { browserApi } from "@/lib/http/browser"
import type { AiChatMessage, AiChatResponse, AiChatSession, CodeExplainResponse, RagSearchResponse, RagSourceType } from "@/features/ai-rag/types"

export async function ragSearch(payload: { query: string; type?: "all" | RagSourceType; limit?: number }) {
    const response = await browserApi.post<RagSearchResponse>("/laravel/ai/rag/search", payload)
    return response.data
}

export async function getAiChatSessions() {
    const response = await browserApi.get<{ data: AiChatSession[] }>("/laravel/ai/chat/sessions")
    return response.data.data
}

export async function getAiChatMessages(sessionId: number) {
    const response = await browserApi.get<{ session: AiChatSession; data: AiChatMessage[] }>(`/laravel/ai/chat/sessions/${sessionId}/messages`)
    return response.data
}

export async function sendAiChatMessage(payload: { message: string; session_id?: number | null; type?: "all" | RagSourceType }) {
    const response = await browserApi.post<AiChatResponse>("/laravel/ai/chat", payload)
    return response.data
}

export async function explainCodeWithAi(payload: {
    run_id?: number
    language?: string
    code?: string
    stdin?: string
    stdout?: string | null
    stderr?: string | null
    query?: string
}) {
    const response = await browserApi.post<CodeExplainResponse>("/laravel/ai/code/explain", payload)
    return response.data
}
