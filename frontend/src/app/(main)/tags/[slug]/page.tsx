import { notFound } from "next/navigation"

import createLaravelApi from "@/lib/http/laravel"
import { TagDetailPage } from "@/features/tags/components/tag-detail-page"
import type { TagDetailResponse } from "@/features/tags/types"

type TagPageProps = {
    params: Promise<{
        slug: string
    }>
    searchParams: Promise<{
        search?: string
        page?: string
    }>
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
    const { slug } = await params
    const filters = await searchParams
    const laravel = createLaravelApi()

    try {
        const response = await laravel.get<TagDetailResponse>(`/tags/${slug}`, {
            params: {
                search: filters.search || undefined,
                page: filters.page || undefined,
                per_page: 8,
            },
        })

        return (
            <TagDetailPage
                tag={response.data.data}
                publications={response.data.publications || { data: [] }}
                questions={response.data.questions || { data: [] }}
                popularPublications={response.data.popular_publications || []}
                popularQuestions={response.data.popular_questions || []}
                search={filters.search || ""}
                page={filters.page || ""}
            />
        )
    } catch (error) {
        console.log("[TAG_PAGE_ERROR]", error)
        notFound()
    }
}
