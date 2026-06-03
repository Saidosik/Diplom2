import { browserApi } from "@/lib/http/browser"
import type {
    IssueAnswerPayload,
    IssueAnswerSingleResponse,
    IssueQuestion,
    IssueQuestionCollectionResponse,
    IssueQuestionPayload,
    IssueQuestionSingleResponse,
} from "@/features/issues/types"

function unwrapQuestion(payload: IssueQuestionSingleResponse | IssueQuestion): IssueQuestion {
    return "data" in payload ? payload.data : payload
}

export async function createIssueQuestion(payload: IssueQuestionPayload) {
    const response = await browserApi.post<IssueQuestionSingleResponse>("/laravel/issues", payload)
    return unwrapQuestion(response.data)
}

export async function updateIssueQuestion(id: number, payload: IssueQuestionPayload) {
    const response = await browserApi.put<IssueQuestionSingleResponse>(`/laravel/issues/${id}`, payload)
    return unwrapQuestion(response.data)
}

export async function deleteIssueQuestion(id: number) {
    const response = await browserApi.delete<{ message: string }>(`/laravel/issues/${id}`)
    return response.data
}

export async function getMyIssueQuestions(params?: Record<string, string | number | undefined>) {
    const response = await browserApi.get<IssueQuestionCollectionResponse>("/laravel/me/issues", { params })
    return response.data
}

export async function createIssueAnswer(questionId: number, payload: IssueAnswerPayload) {
    const response = await browserApi.post<IssueAnswerSingleResponse>(`/laravel/issues/${questionId}/answers`, payload)
    return response.data.data
}

export async function updateIssueAnswer(answerId: number, payload: IssueAnswerPayload) {
    const response = await browserApi.put<IssueAnswerSingleResponse>(`/laravel/issue-answers/${answerId}`, payload)
    return response.data.data
}

export async function deleteIssueAnswer(answerId: number) {
    const response = await browserApi.delete<{ message: string }>(`/laravel/issue-answers/${answerId}`)
    return response.data
}

export async function acceptIssueAnswer(questionId: number, answerId: number) {
    const response = await browserApi.post<IssueQuestionSingleResponse>(`/laravel/issues/${questionId}/answers/${answerId}/accept`)
    return unwrapQuestion(response.data)
}
