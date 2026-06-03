import { browserApi } from "@/lib/http/browser"
import type {
    CommentCollectionResponse,
    CommentItem,
    CommentSingleResponse,
    CommentTargetType,
    ReactionSummary,
    ReactionSummaryResponse,
    ReactionTargetType,
    ReactionType,
    ReportPayload,
    SavedItemsResponse,
    SavedTargetType,
} from "@/features/interactions/types"

function unwrapComment(payload: CommentSingleResponse | CommentItem): CommentItem {
    return "data" in payload ? payload.data : payload
}

function unwrapReaction(payload: ReactionSummaryResponse | ReactionSummary): ReactionSummary {
    return "data" in payload ? payload.data : payload
}

export async function getComments(
    commentableType: CommentTargetType,
    commentableId: number,
    params?: { page?: number; per_page?: number }
) {
    const queryParams = {
        commentable_type: commentableType,
        commentable_id: commentableId,
        page: params?.page,
        per_page: params?.per_page,
    }

    const response = await browserApi.get<CommentCollectionResponse>("/laravel/comments", { params: queryParams })
    return response.data
}

export async function createComment(payload: {
    commentable_type: CommentTargetType
    commentable_id: number
    content: string
    parent_id?: number | null
}) {
    const response = await browserApi.post<CommentSingleResponse>("/laravel/comments", payload)
    return unwrapComment(response.data)
}

export async function updateComment(commentId: number, content: string) {
    const response = await browserApi.patch<CommentSingleResponse>(`/laravel/comments/${commentId}`, { content })
    return unwrapComment(response.data)
}

export async function deleteComment(commentId: number) {
    const response = await browserApi.delete<{ message: string }>(`/laravel/comments/${commentId}`)
    return response.data
}

export async function setReaction(payload: {
    reactable_type: ReactionTargetType
    reactable_id: number
    type: ReactionType
}) {
    const response = await browserApi.post<ReactionSummaryResponse>("/laravel/reactions", payload)
    return unwrapReaction(response.data)
}

export async function removeReaction(payload: {
    reactable_type: ReactionTargetType
    reactable_id: number
}) {
    const response = await browserApi.delete<ReactionSummaryResponse>("/laravel/reactions", { data: payload })
    return unwrapReaction(response.data)
}

export async function createReport(payload: ReportPayload) {
    const response = await browserApi.post("/laravel/reports", payload)
    return response.data
}


export async function getSavedItems(params?: { page?: number; per_page?: number; type?: SavedTargetType }) {
    const response = await browserApi.get<SavedItemsResponse>("/laravel/me/saved", { params })
    return response.data
}

export async function saveItem(payload: {
    saveable_type: SavedTargetType
    saveable_id: number
}) {
    const response = await browserApi.post("/laravel/saved-items", payload)
    return response.data
}

export async function removeSavedItem(payload: {
    saveable_type: SavedTargetType
    saveable_id: number
}) {
    const response = await browserApi.delete<{ message: string }>("/laravel/saved-items", { data: payload })
    return response.data
}
