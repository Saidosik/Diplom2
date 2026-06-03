import { browserApi } from "@/lib/http/browser"
import type { CodeRun, CodeSnippet, PlaygroundLanguage, RunCodePayload } from "@/features/playground/types"

type Collection<T> = {
    data: T[]
}

type Resource<T> = {
    data: T
}

export async function getPlaygroundLanguages() {
    const response = await browserApi.get<Collection<PlaygroundLanguage>>("/laravel/playground/languages")
    return response.data.data
}

export async function getMySnippets(params?: { q?: string; visibility?: string; status?: string; snippet_type?: string; per_page?: number }) {
    const response = await browserApi.get<Collection<CodeSnippet>>("/laravel/playground/snippets", {
        params: { per_page: 20, ...params },
    })
    return response.data.data
}

export async function runCode(payload: RunCodePayload) {
    const response = await browserApi.post<Resource<CodeRun>>("/laravel/playground/runs", payload)
    return response.data.data
}

export async function getSnippet(id: number) {
    const response = await browserApi.get<Resource<CodeSnippet>>(`/laravel/playground/snippets/${id}`)
    return response.data.data
}

export async function getRun(id: number) {
    const response = await browserApi.get<Resource<CodeRun>>(`/laravel/playground/runs/${id}`)
    return response.data.data
}
