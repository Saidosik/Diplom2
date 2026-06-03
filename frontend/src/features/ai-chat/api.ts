import { browserApi } from "@/lib/http/browser"
import type { AiAttachment, AiChatPayload, AiChatResponse, AiChatSession, AiModel, AiStreamEvent, AiChatMessage } from "@/features/ai-chat/types"

export async function getAiModels() {
    const response = await browserApi.get<{ data: AiModel[] }>("/laravel/ai/chat/models")
    return response.data.data
}

export async function getAiChatSessions() {
    const response = await browserApi.get<{ data: AiChatSession[] }>("/laravel/ai/chat/sessions")
    return response.data.data
}

export async function createAiChatSession(payload: { title?: string; model?: string | null; type?: string; mode?: string; context_scope?: string }) {
    const response = await browserApi.post<{ data: AiChatSession }>("/laravel/ai/chat/sessions", payload)
    return response.data.data
}

export async function deleteAiChatSession(sessionId: number) {
    await browserApi.delete(`/laravel/ai/chat/sessions/${sessionId}`)
}

export async function getAiChatMessages(sessionId: number) {
    const response = await browserApi.get<{ session: AiChatSession; data: AiChatMessage[] }>(`/laravel/ai/chat/sessions/${sessionId}/messages`)
    return response.data
}

export async function uploadAiAttachment(file: File, sessionId?: number | null) {
    const formData = new FormData()
    formData.append("file", file)
    if (sessionId) formData.append("session_id", String(sessionId))

    const response = await browserApi.post<{ data: AiAttachment }>("/laravel/ai/chat/attachments", formData)
    return response.data.data
}

export async function sendAiChatMessage(payload: AiChatPayload) {
    const response = await browserApi.post<AiChatResponse>("/laravel/ai/chat", payload)
    return response.data
}

export async function streamAiChatMessage(payload: AiChatPayload, handlers: {
    onStatus?: (data: { step: string; text: string }) => void
    onToken?: (text: string) => void
    onEvent?: (event: AiStreamEvent) => void
}) {
    const response = await fetch("/api/laravel/ai/chat/stream", {
        method: "POST",
        headers: {
            Accept: "text/event-stream",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    })

    if (!response.ok || !response.body) {
        const error = await response.json().catch(() => ({ message: "AI streaming недоступен" }))
        throw new Error(error.message ?? "AI streaming недоступен")
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let separatorIndex = buffer.indexOf("\n\n")
        while (separatorIndex !== -1) {
            const rawEvent = buffer.slice(0, separatorIndex)
            buffer = buffer.slice(separatorIndex + 2)
            dispatchSseEvent(rawEvent, handlers)
            separatorIndex = buffer.indexOf("\n\n")
        }
    }

    if (buffer.trim()) {
        dispatchSseEvent(buffer, handlers)
    }
}

function dispatchSseEvent(raw: string, handlers: { onEvent?: (event: AiStreamEvent) => void; onStatus?: (data: { step: string; text: string }) => void; onToken?: (text: string) => void }) {
    const eventLine = raw.split("\n").find((line) => line.startsWith("event:"))
    const dataLine = raw.split("\n").find((line) => line.startsWith("data:"))
    const event = eventLine?.replace(/^event:\s*/, "").trim()
    const dataText = dataLine?.replace(/^data:\s*/, "") ?? "{}"

    if (!event) return

    const parsed = JSON.parse(dataText)
    const payload = { event, data: parsed } as AiStreamEvent
    handlers.onEvent?.(payload)

    if (payload.event === "status") handlers.onStatus?.(payload.data)
    if (payload.event === "token") handlers.onToken?.(payload.data.text)
}
