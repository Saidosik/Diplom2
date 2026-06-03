export type ReactionType = "like" | "dislike"

export type CommentTargetType = "publication" | "issue_question" | "issue_answer"
export type ReactionTargetType = "publication" | "issue_question"
export type ReportTargetType = "publication" | "issue_question" | "issue_answer" | "comment"

export type PaginationMeta = {
    current_page?: number
    last_page?: number
    per_page?: number
    total?: number
}

export type InteractionUser = {
    id: number
    name: string
    role?: string | null
    avatar?: string | null
    avatar_url?: string | null
}

export type CommentTargetSummary = {
    type: CommentTargetType | string
    id: number
    title: string
    href?: string | null
}

export type CommentItem = {
    id: number
    commentable_type: string
    commentable_id: number
    parent_id?: number | null
    content: string
    status: string
    is_owner?: boolean
    can_manage?: boolean
    reports_count?: number
    user?: InteractionUser | null
    target?: CommentTargetSummary | null
    replies?: CommentItem[]
    created_at?: string | null
    updated_at?: string | null
}

export type CommentCollectionResponse = {
    data: CommentItem[]
    meta?: PaginationMeta
}

export type CommentSingleResponse = {
    data: CommentItem
}

export type ReactionSummary = {
    likes_count: number
    dislikes_count: number
    my_reaction?: ReactionType | null
}

export type ReactionSummaryResponse = {
    data: ReactionSummary
}

export type ReportReason = "spam" | "offensive" | "misinformation" | "abuse" | "other"

export type ReportPayload = {
    reportable_type: ReportTargetType
    reportable_id: number
    reason: ReportReason
    details?: string | null
}

export type SavedTargetType = "publication" | "issue_question" | "issue_answer"

export type SavedItem = {
    id: number
    saveable_type: SavedTargetType
    saveable_id: number
    item: Record<string, unknown> | null
    created_at?: string | null
    updated_at?: string | null
}

export type SavedItemCollectionResponse = {
    data: SavedItem[]
    meta?: PaginationMeta
}

export type SavedItemsResponse = SavedItemCollectionResponse
