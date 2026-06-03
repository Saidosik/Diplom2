import { browserApi } from "@/lib/http/browser"
import type {
    PublicProfileAnswersResponse,
    PublicProfileCommentsResponse,
    PublicProfilePublicationsResponse,
    PublicProfileQuestionsResponse,
    PublicProfileResponse,
} from "@/features/users/types"

type PaginationParams = {
    page?: number
    per_page?: number
}

export async function getPublicProfile(userId: number | string) {
    const response = await browserApi.get<PublicProfileResponse>(`/laravel/users/${userId}/profile`)
    return response.data
}

export async function getPublicProfilePublications(userId: number | string, params?: PaginationParams) {
    const response = await browserApi.get<PublicProfilePublicationsResponse>(`/laravel/users/${userId}/publications`, { params })
    return response.data
}

export async function getPublicProfileQuestions(userId: number | string, params?: PaginationParams) {
    const response = await browserApi.get<PublicProfileQuestionsResponse>(`/laravel/users/${userId}/issues`, { params })
    return response.data
}

export async function getPublicProfileAnswers(userId: number | string, params?: PaginationParams) {
    const response = await browserApi.get<PublicProfileAnswersResponse>(`/laravel/users/${userId}/answers`, { params })
    return response.data
}

export async function getPublicProfileComments(userId: number | string, params?: PaginationParams) {
    const response = await browserApi.get<PublicProfileCommentsResponse>(`/laravel/users/${userId}/comments`, { params })
    return response.data
}
