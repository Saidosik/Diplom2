import { browserApi } from "@/lib/http/browser"
import type { PublicationCollectionResponse } from "@/features/publications/types"
import type { IssueAnswerCollectionResponse, IssueQuestionCollectionResponse } from "@/features/issues/types"
import type { CommentCollectionResponse, SavedItemCollectionResponse, SavedTargetType } from "@/features/interactions/types"
import type { User } from "@/features/auth/types"

type PerPageParams = {
    page?: number
    per_page?: number
}

export type ProfileHubKind = "publication" | "issue_question" | "issue_answer" | "code_snippet" | "user_file" | "user" | "achievement" | "reputation_event" | string

export type ProfileHubItem = {
    id: number
    type: ProfileHubKind
    title?: string | null
    name?: string | null
    headline?: string | null
    excerpt?: string | null
    description?: string | null
    url?: string | null
    created_at?: string | null
    updated_at?: string | null
    unlocked_at?: string | null
    pinned_at?: string | null
    saved_at?: string | null
    original_name?: string | null
    mime_type?: string | null
    kind?: string | null
    size?: number | null
    visibility?: string | null
    language?: string | null
    snippet_type?: string | null
    status?: string | null
    last_run_status?: string | null
    runs_count?: number
    score?: number
    points?: number
    progress?: number
    target?: number
    download_url?: string | null
    preview_url?: string | null
    avatar?: string | null
    avatar_url?: string | null
    reputation_score?: number
    category?: string | null
    rarity?: string | null
    folder?: { id: number; name: string; color?: string | null } | null
    tags?: Array<{ name: string; slug?: string | null }>
    meta?: Record<string, unknown>
    metadata?: Record<string, unknown>
}

export type ProfileDashboard = {
    user: User
    stats: Record<string, number | undefined>
    completion: number
    pinned_items: ProfileHubItem[]
    materials: ProfileHubItem[]
    snippets: ProfileHubItem[]
    files: ProfileHubItem[]
    friends: ProfileHubItem[]
    activity: ProfileHubItem[]
    achievements: ProfileHubItem[]
    reputation: {
        score: number
        level?: { label?: string; next_label?: string | null; progress?: number } | null
        events: ProfileHubItem[]
    }
    saved_summary?: number | null
    saved_items?: ProfileHubItem[]
    relationship_to_viewer: {
        is_owner?: boolean
        is_following?: boolean
        is_friend?: boolean
        friend_request_status?: string | null
        can_message?: boolean
        mutual_friends_count?: number
    }
}

export type PinPayload = {
    pinnable_type: "publication" | "issue_question" | "issue_answer" | "code_snippet" | "user_file"
    pinnable_id: number
    position?: number
}

export async function getProfileDashboard() {
    const response = await browserApi.get<ProfileDashboard>("/laravel/me/profile/dashboard")
    return response.data
}

export async function getPublicProfileDashboard(userId: number | string) {
    const response = await browserApi.get<ProfileDashboard>(`/laravel/users/${userId}/profile/dashboard`)
    return response.data
}

export async function pinProfileItem(payload: PinPayload) {
    const response = await browserApi.post<{ data: ProfileHubItem }>("/laravel/me/profile/pins", payload)
    return response.data.data
}

export async function unpinProfileItem(payload: Omit<PinPayload, "position">) {
    const response = await browserApi.delete<{ message: string }>("/laravel/me/profile/pins", { data: payload })
    return response.data
}

export async function startProfileMessage(userId: number | string) {
    const response = await browserApi.post<{ data: { id: number; url: string } }>(`/laravel/users/${userId}/message`)
    return response.data.data
}

export async function getProfilePublications(params?: PerPageParams) {
    const response = await browserApi.get<PublicationCollectionResponse>("/laravel/me/publications", { params })
    return response.data
}

export async function getProfileIssueQuestions(params?: PerPageParams) {
    const response = await browserApi.get<IssueQuestionCollectionResponse>("/laravel/me/issues", { params })
    return response.data
}

export async function getProfileIssueAnswers(params?: PerPageParams) {
    const response = await browserApi.get<IssueAnswerCollectionResponse>("/laravel/me/issue-answers", { params })
    return response.data
}

export async function getProfileComments(params?: PerPageParams) {
    const response = await browserApi.get<CommentCollectionResponse>("/laravel/me/comments", { params })
    return response.data
}

export async function getProfileSaved(params?: PerPageParams & { type?: SavedTargetType }) {
    const response = await browserApi.get<SavedItemCollectionResponse>("/laravel/me/saved", { params })
    return response.data
}
