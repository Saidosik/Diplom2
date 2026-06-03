import type { User } from "@/features/auth/types"
import type { PublicationCollectionResponse } from "@/features/publications/types"
import type { IssueAnswerCollectionResponse, IssueQuestionCollectionResponse } from "@/features/issues/types"
import type { CommentCollectionResponse } from "@/features/interactions/types"

export type PublicProfileStats = {
    publications_count: number
    questions_count: number
    answers_count: number
    accepted_answers_count: number
    comments_count: number
}

export type PublicProfile = Omit<User, "email" | "registered_via" | "auth_providers" | "social_accounts" | "meta"> & {
    email?: string
    can_view_full_profile?: boolean
    profile_visibility?: "public" | "private" | string
    is_profile_private?: boolean
    stats: PublicProfileStats
}

export type PublicProfileResponse = {
    data: PublicProfile
}

export type PublicProfilePublicationsResponse = PublicationCollectionResponse
export type PublicProfileQuestionsResponse = IssueQuestionCollectionResponse
export type PublicProfileAnswersResponse = IssueAnswerCollectionResponse
export type PublicProfileCommentsResponse = CommentCollectionResponse
