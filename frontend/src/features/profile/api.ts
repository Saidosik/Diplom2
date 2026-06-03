import { browserApi } from "@/lib/http/browser"
import type { PublicationCollectionResponse } from "@/features/publications/types"
import type { IssueAnswerCollectionResponse, IssueQuestionCollectionResponse } from "@/features/issues/types"
import type { CommentCollectionResponse, SavedItemCollectionResponse, SavedTargetType } from "@/features/interactions/types"

type PerPageParams = {
    page?: number
    per_page?: number
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

