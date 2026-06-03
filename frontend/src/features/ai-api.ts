import { browserApi } from "@/lib/http/browser"
import type { IssueQuestion, IssueQuestionPayload } from "@/features/issues/types"
import type { Publication, PublicationPayload } from "@/features/publications/types"
import type { RagSource } from "@/features/ai-rag/types"

export type AssistantChecklistItem = {
    label: string
    passed: boolean
}

export type DuplicateRisk = "low" | "medium" | "high"

export type SourceSuggestion = {
    title: string
    href?: string | null
    type: string
    excerpt: string
    score: number
}

export type QuestionAssistResponse = {
    suggested_title: string
    suggested_excerpt: string
    suggested_tags: string[]
    quality_checklist: AssistantChecklistItem[]
    missing_details: string[]
    similar_questions?: { data: IssueQuestion[] } | IssueQuestion[]
    rag_sources?: RagSource[]
    duplicate_questions?: RagSource[]
    duplicate_risk?: DuplicateRisk
    rag_meta?: Record<string, unknown>
}

export type PublicationAssistResponse = {
    suggested_title: string
    suggested_excerpt: string
    suggested_tags: string[]
    outline: string[]
    editor_hints: string[]
    similar_publications?: { data: Publication[] } | Publication[]
    rag_sources?: RagSource[]
    source_suggestions?: SourceSuggestion[]
    similar_publication_sources?: RagSource[]
    rag_meta?: Record<string, unknown>
}

export type QuestionDraftAnswerResponse = {
    is_ai_generated: boolean
    label: string
    disclaimer: string
    answer: string
    blocks: IssueQuestionPayload["blocks"]
    sources: RagSource[]
    meta: Record<string, unknown>
}

export type ContentSourcesResponse = {
    data: RagSource[]
    suggestions: SourceSuggestion[]
    markdown: string
    blocks: PublicationPayload["blocks"]
    meta: Record<string, unknown>
}

export async function assistQuestion(payload: IssueQuestionPayload) {
    const response = await browserApi.post<QuestionAssistResponse>("/laravel/ai/question/assist", payload)
    return response.data
}

export async function findQuestionDuplicates(payload: IssueQuestionPayload) {
    const response = await browserApi.post<{ data: RagSource[]; duplicate_risk: DuplicateRisk; meta: Record<string, unknown> }>("/laravel/ai/question/duplicates", payload)
    return response.data
}

export async function draftAnswerFromQuestion(payload: IssueQuestionPayload) {
    const response = await browserApi.post<QuestionDraftAnswerResponse>("/laravel/ai/question/draft-answer", payload)
    return response.data
}

export async function assistPublication(payload: PublicationPayload) {
    const response = await browserApi.post<PublicationAssistResponse>("/laravel/ai/publication/assist", payload)
    return response.data
}

export async function findContentSources(payload: PublicationPayload | IssueQuestionPayload, type: "all" | "publication" | "question" | "answer" | "snippet" = "all") {
    const response = await browserApi.post<ContentSourcesResponse>("/laravel/ai/content/sources", { ...payload, type })
    return response.data
}
