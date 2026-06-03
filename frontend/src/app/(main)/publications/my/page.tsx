import Link from "next/link"
import { FileText, Plus } from "lucide-react"

import { AuthRequiredMessage } from "@/features/auth/components/auth-required-message"
import { getAccessTokenCookie } from "@/lib/auth/cookies"
import createLaravelApi from "@/lib/http/laravel"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { PublicationCard } from "@/features/publications/components/publication-card"
import { PublicationBreadcrumbs } from "@/features/publications/components/publication-breadcrumbs"
import { PagePagination } from "@/components/shared/page-pagination"
import type { Publication, PublicationCollectionResponse } from "@/features/publications/types"

type MyPublicationsPageProps = {
    searchParams: Promise<{ page?: string }>
}

export default async function MyPublicationsPage({ searchParams }: MyPublicationsPageProps) {
    const params = await searchParams
    const token = await getAccessTokenCookie()

    if (!token) {
        return (
            <div className="mx-auto w-full max-w-3xl pt-8">
                <AuthRequiredMessage
                    title="Мои публикации доступны после входа"
                    description="Войдите, чтобы видеть свои черновики, опубликованные материалы и управлять публикациями."
                />
            </div>
        )
    }

    const laravel = createLaravelApi(token)

    let publications: Publication[] = []
    let meta: PublicationCollectionResponse["meta"] = undefined

    try {
        const response = await laravel.get<PublicationCollectionResponse>("/me/publications", {
            params: { page: params.page || undefined, per_page: 12 },
        })

        publications = response.data.data || []
        meta = response.data.meta
    } catch (error) {
        console.log("[MY_PUBLICATIONS_ERROR]", error)
    }

    return (
        <div className="space-y-6">
            <PublicationBreadcrumbs
                items={[
                    { label: "Публикации", href: "/publications" },
                    { label: "Мои публикации" },
                ]}
            />

            <section className="flex flex-col gap-4 rounded-4xl border bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                    <p className="text-sm font-medium text-primary">Личный кабинет автора</p>
                    <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Мои публикации</h1>
                    <p className="text-sm text-muted-foreground">
                        Черновики, опубликованные материалы и скрытые записи текущего пользователя.
                    </p>
                </div>

                <Button asChild>
                    <Link href="/publications/create">
                        <Plus className="size-4" />
                        Создать публикацию
                    </Link>
                </Button>
            </section>

            {publications.length > 0 ? (
                <div className="grid gap-5 xl:grid-cols-2">
                    {publications.map((publication) => (
                        <PublicationCard key={publication.id} publication={publication} manage />
                    ))}
                </div>
            ) : (
                <Empty className="min-h-96 border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <FileText className="size-6" />
                        </EmptyMedia>
                        <EmptyTitle>Публикаций пока нет</EmptyTitle>
                        <EmptyDescription>
                            Создай первый материал через конструктор публикаций.
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button asChild>
                            <Link href="/publications/create">Создать публикацию</Link>
                        </Button>
                    </EmptyContent>
                </Empty>
            )}

            <PagePagination meta={meta} basePath="/publications/my" />
        </div>
    )
}
