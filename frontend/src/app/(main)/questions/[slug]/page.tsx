import axios from "axios"
import { notFound } from "next/navigation"

import { getAccessTokenCookie } from "@/lib/auth/cookies"
import createLaravelApi from "@/lib/http/laravel"
import { IssueQuestionDetailPage } from "@/features/issues/components/issue-question-detail-page"
import type { IssueQuestionSingleResponse } from "@/features/issues/types"

type QuestionPageProps = {
    params: Promise<{
        slug: string
    }>
}

export default async function QuestionPage({ params }: QuestionPageProps) {
    const { slug } = await params
    const token = await getAccessTokenCookie()
    const response = await loadQuestionBySlug(slug, token)

    if (!response) {
        notFound()
    }

    return <IssueQuestionDetailPage question={response.data.data} isAuthenticated={Boolean(token)} />
}

async function loadQuestionBySlug(slug: string, token?: string | null) {
    const privateApi = createLaravelApi(token)
    const publicApi = createLaravelApi(null)

    if (token) {
        try {
            return await privateApi.get<IssueQuestionSingleResponse>(`/me/issues/by-slug/${slug}`)
        } catch (error) {
            if (!shouldFallbackToPublicQuestion(error)) {
                throw error
            }
        }
    }

    try {
        return await publicApi.get<IssueQuestionSingleResponse>(`/issues/${slug}`)
    } catch (error) {
        if (isNotFoundResponse(error)) {
            return null
        }

        throw error
    }
}

function shouldFallbackToPublicQuestion(error: unknown) {
    if (!axios.isAxiosError(error)) {
        return false
    }

    const status = error.response?.status

    return status === 401 || status === 403 || status === 404
}

function isNotFoundResponse(error: unknown) {
    return axios.isAxiosError(error) && error.response?.status === 404
}
