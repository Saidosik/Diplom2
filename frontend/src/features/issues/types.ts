export type IssueQuestionStatus = "draft" | "published" | "hidden" | "closed"
export type IssueAnswerStatus = "published" | "hidden"

export type IssueBlockType =
    | "heading"
    | "paragraph"
    | "markdown"
    | "code"
    | "terminal"
    | "diff"
    | "file_tree"
    | "callout"
    | "code_snippet"
    | "image"
    | "quote"
    | "warning"
    | "divider"

export type IssueAuthor = {
    id: number
    name: string
    role?: string | null
    reputation_score?: number
    reputation_level?: { label: string; next_label?: string | null; progress: number } | null
    avatar?: string | null
    avatar_url?: string | null
}

export type IssueTag = {
    id: number
    name: string
    slug: string
    description?: string | null
    color?: string | null
    status?: string | null
}

export type IssueAttachment = {
    id: number
    user_file_id: number
    title?: string | null
    original_name: string
    mime_type?: string | null
    size: number
    kind?: string | null
    visibility?: string | null
    download_url?: string | null
}

export type IssueBlockContent = Record<string, unknown>

export type IssueBlock = {
    id?: number
    client_id?: string
    type: IssueBlockType
    type_label?: string
    sort_order: number
    content: IssueBlockContent
    created_at?: string | null
    updated_at?: string | null
}

export type IssueAnswer = {
    id: number
    issue_question_id: number
    status: IssueAnswerStatus
    status_label?: string
    is_accepted: boolean
    is_ai_generated?: boolean
    ai_model?: string | null
    ai_sources?: Array<{ id?: number; title: string; href: string }>
    ai_feedback_score?: number
    comments_count?: number
    is_saved?: boolean
    is_owner?: boolean
    can_manage?: boolean
    author?: IssueAuthor | null
    question?: { id: number; title: string; slug: string } | null
    blocks?: IssueBlock[]
    created_at?: string | null
    updated_at?: string | null
}

export type IssueQuestion = {
    id: number
    title: string
    slug: string
    excerpt?: string | null
    status: IssueQuestionStatus
    status_label?: string
    workflow_status?: "open" | "has_answers" | "solved" | "closed" | "moderation"
    workflow_status_label?: string
    is_solved: boolean
    accepted_answer_id?: number | null
    views_count?: number
    answers_count?: number
    likes_count?: number
    dislikes_count?: number
    my_reaction?: "like" | "dislike" | null
    is_saved?: boolean
    saved_count?: number
    is_owner?: boolean
    can_accept_answer?: boolean
    author?: IssueAuthor | null
    tags?: IssueTag[]
    blocks?: IssueBlock[]
    answers?: IssueAnswer[]
    attachments?: IssueAttachment[]
    published_at?: string | null
    created_at?: string | null
    updated_at?: string | null
}

export type IssueQuestionPayload = {
    title: string
    slug?: string | null
    excerpt?: string | null
    status: IssueQuestionStatus
    tags?: string[]
    attachment_ids?: number[]
    blocks: Array<{
        type: IssueBlockType
        sort_order: number
        content: IssueBlockContent
    }>
}

export type IssueAnswerPayload = {
    status?: IssueAnswerStatus
    blocks: Array<{
        type: IssueBlockType
        sort_order: number
        content: IssueBlockContent
    }>
}

export type IssuePaginationMeta = {
    current_page?: number
    last_page?: number
    per_page?: number
    total?: number
}

export type IssueQuestionCollectionResponse = {
    data: IssueQuestion[]
    meta?: IssuePaginationMeta
}

export type IssueQuestionSingleResponse = {
    data: IssueQuestion
}

export type IssueAnswerSingleResponse = {
    data: IssueAnswer
}

export type IssueAnswerCollectionResponse = {
    data: IssueAnswer[]
    meta?: IssuePaginationMeta
}
