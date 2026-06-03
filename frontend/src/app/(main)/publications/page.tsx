import createLaravelApi from "@/lib/http/laravel"
import { PublicationListPage } from "@/features/publications/components/publication-list-page"
import type { PublicationCollectionResponse } from "@/features/publications/types"

type PublicationsPageProps = {
    searchParams: Promise<{
        search?: string
        type?: string
        tag?: string
        sort?: string
        page?: string
    }>
}

export default async function PublicationsPage({ searchParams }: PublicationsPageProps) {
    const params = await searchParams
    const laravel = createLaravelApi()

    let publications: PublicationCollectionResponse["data"] = []
    let meta: PublicationCollectionResponse["meta"] = undefined

    try {
        const response = await laravel.get<PublicationCollectionResponse>("/publications", {
            params: {
                search: params.search || undefined,
                type: params.type || undefined,
                tag: params.tag || undefined,
                sort: params.sort || undefined,
                page: params.page || undefined,
                per_page: 12,
            },
        })

        publications = response.data.data || []
        meta = response.data.meta
    } catch (error) {
        console.log("[PUBLICATIONS_PAGE_ERROR]", error)
    }

    return <PublicationListPage publications={publications} filters={params} meta={meta} />
}
