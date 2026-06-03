import Link from "next/link"
import { CircleHelp, Plus } from "lucide-react"

import { AuthRequiredMessage } from "@/features/auth/components/auth-required-message"
import { getAccessTokenCookie } from "@/lib/auth/cookies"
import createLaravelApi from "@/lib/http/laravel"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { IssueBreadcrumbs } from "@/features/issues/components/issue-breadcrumbs"
import { IssueQuestionCard } from "@/features/issues/components/issue-question-card"
import { PagePagination } from "@/components/shared/page-pagination"
import type { IssueQuestion, IssueQuestionCollectionResponse } from "@/features/issues/types"

type MyQuestionsPageProps = {
    searchParams: Promise<{ page?: string }>
}

export default async function MyQuestionsPage({ searchParams }: MyQuestionsPageProps) {
    const params = await searchParams
    const token = await getAccessTokenCookie()

    if (!token) {
        return (
            <div className="mx-auto w-full max-w-3xl pt-8">
                <AuthRequiredMessage
                    title="Мои вопросы доступны после входа"
                    description="Войдите, чтобы видеть свои вопросы, черновики и ответы сообщества по вашим темам."
                />
            </div>
        )
    }

    const laravel = createLaravelApi(token)

    let questions: IssueQuestion[] = []
    let meta: IssueQuestionCollectionResponse["meta"] = undefined

    try {
        const response = await laravel.get<IssueQuestionCollectionResponse>("/me/issues", {
            params: { page: params.page || undefined, per_page: 12 },
        })

        questions = response.data.data || []
        meta = response.data.meta
    } catch (error) {
        console.log("[MY_QUESTIONS_ERROR]", error)
    }

    return (
        <div className="space-y-6">
            <IssueBreadcrumbs
                items={[
                    { label: "Вопросы", href: "/questions" },
                    { label: "Мои вопросы" },
                ]}
            />

            <section className="flex flex-col gap-4 rounded-4xl border bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                    <p className="text-sm font-medium text-primary">Личный кабинет автора</p>
                    <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Мои вопросы</h1>
                    <p className="text-sm text-muted-foreground">
                        Черновики, опубликованные вопросы и закрытые обсуждения текущего пользователя.
                    </p>
                </div>

                <Button asChild>
                    <Link href="/questions/create">
                        <Plus className="size-4" />
                        Задать вопрос
                    </Link>
                </Button>
            </section>

            {questions.length > 0 ? (
                <div className="grid gap-5 xl:grid-cols-2">
                    {questions.map((question) => (
                        <IssueQuestionCard key={question.id} question={question} manage />
                    ))}
                </div>
            ) : (
                <Empty className="min-h-96 border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <CircleHelp className="size-6" />
                        </EmptyMedia>
                        <EmptyTitle>Вопросов пока нет</EmptyTitle>
                        <EmptyDescription>
                            Создай первый вопрос через конструктор IssueQuestion.
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button asChild>
                            <Link href="/questions/create">Задать вопрос</Link>
                        </Button>
                    </EmptyContent>
                </Empty>
            )}

            <PagePagination meta={meta} basePath="/questions/my" />
        </div>
    )
}
