import { browserApi } from "@/lib/http/browser"
import type { AiAttachment, AiChatPayload, AiChatResponse, AiChatSession, AiModel, AiStreamEvent, AiChatMessage } from "@/features/ai-chat/types"

const STREAM_TIMEOUT_MS = 120_000

export class AiChatApiError extends Error {
    constructor(message: string, public status?: number, public code?: string) {
        super(message)
        this.name = "AiChatApiError"
    }
}

export class AiStreamUnavailableError extends AiChatApiError {
    constructor(message: string, public retryable = false, status?: number, code?: string) {
        super(message, status, code)
        this.name = "AiStreamUnavailableError"
    }
}

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
    const controller = new AbortController()
    let receivedEvent = false
    const timeout = window.setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS)

    try {
        const response = await fetch("/api/laravel/ai/chat/stream", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                Accept: "text/event-stream",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        })

        if (!response.ok || !response.body) {
            const error = await response.json().catch(() => ({ message: "AI streaming недоступен" }))
            throw new AiStreamUnavailableError(
                aiErrorMessage(error.message, response.status, error.code),
                true,
                response.status,
                error.code
            )
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
                receivedEvent = dispatchSseEvent(rawEvent, handlers) || receivedEvent
                separatorIndex = buffer.indexOf("\n\n")
            }
        }

        if (buffer.trim()) {
            receivedEvent = dispatchSseEvent(buffer, handlers) || receivedEvent
        }
    } catch (error) {
        if (error instanceof AiStreamUnavailableError) {
            throw error
        }

        const aborted = error instanceof DOMException && error.name === "AbortError"
        throw new AiStreamUnavailableError(
            aborted
                ? "AI-помощник не ответил вовремя. Попробуйте ещё раз."
                : "Потоковый режим AI временно недоступен.",
            !receivedEvent,
            aborted ? 408 : undefined,
            aborted ? "TIMEOUT" : "STREAM_UNAVAILABLE"
        )
    } finally {
        window.clearTimeout(timeout)
    }
}

function dispatchSseEvent(raw: string, handlers: { onEvent?: (event: AiStreamEvent) => void; onStatus?: (data: { step: string; text: string }) => void; onToken?: (text: string) => void }) {
    const lines = raw.split("\n")
    const event = lines.find((line) => line.startsWith("event:"))?.replace(/^event:\s*/, "").trim()
    const dataText = lines
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.replace(/^data:\s?/, ""))
        .join("\n") || "{}"

    if (!event) return false

    let parsed: unknown
    try {
        parsed = JSON.parse(dataText)
    } catch {
        parsed = { message: "AI вернул некорректное потоковое событие" }
    }

    const payload = { event, data: parsed } as AiStreamEvent
    handlers.onEvent?.(payload)

    if (payload.event === "status") handlers.onStatus?.(payload.data)
    if (payload.event === "token") handlers.onToken?.(payload.data.text)
    if (payload.event === "error") {
        throw new AiStreamUnavailableError(aiErrorMessage(payload.data.message), false)
    }

    return true
}

export function aiErrorMessage(message?: string, status?: number, code?: string) {
    const normalized = `${message ?? ""} ${code ?? ""}`.toLowerCase()

    if (status === 401) return "Войдите в аккаунт, чтобы пользоваться AI-помощником."
    if (status === 403) return "У вас нет доступа к этому AI-чату."
    if (status === 422) return message || "Проверьте текст запроса и выбранную модель."
    if (status === 429 || normalized.includes("rate")) return "Достигнут лимит AI-провайдера. Попробуйте позже."
    if (status === 408 || normalized.includes("timeout")) return "AI-провайдер не ответил вовремя. Попробуйте позже."
    if (normalized.includes("missing_api_key")) return "AI-провайдер не настроен: отсутствует API key."
    if (normalized.includes("invalid_model") || normalized.includes("model")) return "Выбранная модель AI недоступна. Выберите другую модель."
    if (normalized.includes("invalid_credentials")) return "AI-провайдер отклонил ключ доступа. Проверьте настройки сервера."
    if (normalized.includes("network")) return "AI-провайдер временно недоступен по сети."

    return message || "AI-помощник временно недоступен."
}
