import type { IssueQuestion, IssuePaginationMeta } from "@/features/issues/types"
import type { Publication, PublicationPaginationMeta } from "@/features/publications/types"

export type CommunityTag = {
    id: number
    name: string
    slug: string
    description?: string | null
    color?: string | null
    status?: string | null
    publications_count?: number
    questions_count?: number
}

export type TagDetailResponse = {
    data: CommunityTag
    publications?: {
        data: Publication[]
        meta?: PublicationPaginationMeta
    }
    questions?: {
        data: IssueQuestion[]
        meta?: IssuePaginationMeta
    }
    popular_publications?: Publication[]
    popular_questions?: IssueQuestion[]
}
