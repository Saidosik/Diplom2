import Link from "next/link"
import { Hash, Search, Tags } from "lucide-react"

import createLaravelApi from "@/lib/http/laravel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { TagBadge } from "@/features/tags/components/tag-badge"
import type { CommunityTag } from "@/features/tags/types"

type TagsPageProps = {
    searchParams: Promise<{
        search?: string
    }>
}

type TagsResponse = {
    data: CommunityTag[]
}

export default async function TagsPage({ searchParams }: TagsPageProps) {
    const params = await searchParams
    const laravel = createLaravelApi()
    let tags: CommunityTag[] = []

    try {
        const response = await laravel.get<TagsResponse>("/tags", {
            params: {
                search: params.search || undefined,
            },
        })

        tags = response.data.data || []
    } catch (error) {
        console.log("[TAGS_PAGE_ERROR]", error)
    }

    return (
        <div className="space-y-6">
            <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
                <Card className="border-primary/20 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_34%)] shadow-sm">
                    <CardHeader className="space-y-4 p-6 md:p-8">
                        <div className="inline-flex w-fit items-center gap-2 border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                            <Tags className="size-3.5 text-primary" />
                            Темы сообщества
                        </div>
                        <div className="space-y-3">
                            <CardTitle className="text-4xl tracking-tight md:text-6xl">Теги</CardTitle>
                            <CardDescription className="max-w-3xl text-base leading-7">
                                Страницы тем объединяют публикации, вопросы и обсуждения по одному направлению.
                            </CardDescription>
                        </div>
                    </CardHeader>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Search className="size-5 text-primary" />
                            Поиск тега
                        </CardTitle>
                        <CardDescription>Найди тему по названию или описанию.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-3">
                            <Input name="search" defaultValue={params.search || ""} placeholder="Например: Laravel, React, PHP" />
                            <div className="flex gap-2">
                                <Button type="submit" className="flex-1">Найти</Button>
                                {params.search ? (
                                    <Button variant="outline" asChild>
                                        <Link href="/tags">Сбросить</Link>
                                    </Button>
                                ) : null}
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </section>

            {tags.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {tags.map((tag) => (
                        <article
                            key={tag.id || tag.slug}
                            className="group border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                        >
                            <TagBadge tag={tag} />
                            <h2 className="mt-4 line-clamp-1 text-xl font-semibold tracking-tight">
                                <Link href={`/tags/${tag.slug}`} className="transition-colors group-hover:text-primary">
                                    {tag.name}
                                </Link>
                            </h2>
                            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                                {tag.description || "Описание тега пока не заполнено."}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <span className="border bg-muted/25 px-2 py-1">публикаций: {tag.publications_count || 0}</span>
                                <span className="border bg-muted/25 px-2 py-1">вопросов: {tag.questions_count || 0}</span>
                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                <Empty className="min-h-80 border border-dashed">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Hash className="size-6" />
                        </EmptyMedia>
                        <EmptyTitle>Теги не найдены</EmptyTitle>
                        <EmptyDescription>
                            После создания публикаций и вопросов теги появятся здесь.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            )}
        </div>
    )
}
