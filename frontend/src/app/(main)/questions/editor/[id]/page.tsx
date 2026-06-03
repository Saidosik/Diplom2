import { notFound } from "next/navigation"

import { getAccessTokenCookie } from "@/lib/auth/cookies"
import createLaravelApi from "@/lib/http/laravel"
import { IssueQuestionEditor } from "@/features/issues/components/issue-question-editor"
import type { IssueQuestionSingleResponse } from "@/features/issues/types"

type EditQuestionPageProps = {
    params: Promise<{
        id: string
    }>
}

export default async function EditQuestionPage({ params }: EditQuestionPageProps) {
    const { id } = await params
    const token = await getAccessTokenCookie()
    const laravel = createLaravelApi(token)

    try {
        const response = await laravel.get<IssueQuestionSingleResponse>(`/me/issues/${id}`)
        return <IssueQuestionEditor initialQuestion={response.data.data} />
    } catch (error) {
        console.log("[EDIT_QUESTION_ERROR]", error)
        notFound()
    }
}
