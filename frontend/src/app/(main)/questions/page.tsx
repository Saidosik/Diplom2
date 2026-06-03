import createLaravelApi from "@/lib/http/laravel"
import { IssueQuestionListPage } from "@/features/issues/components/issue-question-list-page"
import type { IssueQuestionCollectionResponse } from "@/features/issues/types"

type QuestionsPageProps = {
    searchParams: Promise<{
        search?: string
        filter?: string
        tag?: string
        page?: string
    }>
}

export default async function QuestionsPage({ searchParams }: QuestionsPageProps) {
    const params = await searchParams
    const laravel = createLaravelApi()

    let questions: IssueQuestionCollectionResponse["data"] = []
    let meta: IssueQuestionCollectionResponse["meta"] = undefined

    try {
        const response = await laravel.get<IssueQuestionCollectionResponse>("/issues", {
            params: {
                search: params.search || undefined,
                filter: params.filter || undefined,
                tag: params.tag || undefined,
                page: params.page || undefined,
                per_page: 12,
            },
        })

        questions = response.data.data || []
        meta = response.data.meta
    } catch (error) {
        console.log("[QUESTIONS_PAGE_ERROR]", error)
    }

    return <IssueQuestionListPage questions={questions} filters={params} meta={meta} />
}
