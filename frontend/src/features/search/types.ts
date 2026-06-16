export type SearchResultType = "publication" | "question" | "answer" | "tag" | "user" | "snippet"
export type SearchFilterType = "all" | "publications" | "questions" | "answers" | "tags" | "users" | "snippets"
export type SearchSort = "relevance" | "newest" | "popular"

export type SearchResult = {
    type: SearchResultType
    id: number
    title: string
    description?: string | null
    href: string
    score: number
    matched_fields: string[]
    author?: {
        id: number
        name: string
        username?: string | null
        reputation_score?: number | null
    } | null
    tags?: Array<{
        id: number
        name: string
        slug: string
        color?: string | null
    }>
    meta?: Record<string, unknown>
    published_at?: string | null
    created_at?: string | null
}

export type SearchGroup = {
    label: string
    count: number
    top: SearchResult[]
}

export type SearchSuggestion = {
    id: number
    name: string
    slug: string
    color?: string | null
    href: string
    score: number
}

export type SearchResponse = {
    data: SearchResult[]
    groups: Record<string, SearchGroup>
    suggestions: SearchSuggestion[]
    meta: {
        q: string
        type: SearchFilterType
        sort: SearchSort
        page: number
        per_page: number
        total: number
        last_page: number
        driver: string
        engine: string
    }
}
