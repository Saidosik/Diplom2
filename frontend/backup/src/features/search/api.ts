import { browserApi } from "@/lib/http/browser"
import type { SearchFilterType, SearchResponse, SearchSort } from "@/features/search/types"

export type SearchParams = {
    q?: string
    type?: SearchFilterType
    sort?: SearchSort
    page?: number
    per_page?: number
}

export async function searchPlatform(params: SearchParams) {
    const response = await browserApi.get<SearchResponse>("/laravel/search", { params })
    return response.data
}
