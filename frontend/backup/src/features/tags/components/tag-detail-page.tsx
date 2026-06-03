import type { ComponentType } from "react"
import Link from "next/link"
import { Hash, MessageSquare, Newspaper, Search, Sparkles, TrendingUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { PagePagination } from "@/components/shared/page-pagination"
import { IssueQuestionCard } from "@/features/issues/components/issue-question-card"
import type { IssueQuestion } from "@/features/issues/types"
import { PublicationCard } from "@/features/publications/components/publication-card"
import type { Publication } from "@/features/publications/types"
import { TagBadge } from "@/features/tags/components/tag-badge"
import type { CommunityTag, TagDetailResponse } from "@/features/tags/types"

const POPULAR_PLACEHOLDERS = {
    publications: [
        "Лучшие практики по теме",
        "Разбор частых ошибок",
        "Подборка полезных решений",
    ],
    questions: [
        "Частая проблема участников",
        "Вопрос с активным обсуждением",
        "Практический кейс по теме",
    ],
}

type TagDetailPageProps = {
    tag: CommunityTag
    publications: NonNullable<TagDetailResponse["publications"]>
    questions: NonNullable<TagDetailResponse["questions"]>
    popularPublications: Publication[]
    popularQuestions: IssueQuestion[]
    search?: string
    page?: string
}

export function TagDetailPage({
    tag,
    publications,
    questions,
    popularPublications,
    popularQuestions,
    search = "",
    page = "",
}: TagDetailPageProps) {
    const publicationItems = publications.data ?? []
    const questionItems = questions.data ?? []

    return (
        <div className="space-y-6">
            <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
                <Card className="overflow-hidden border-primary/20 bg-[linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/0.34))] shadow-sm">
                    <CardHeader className="space-y-5 p-6 md:p-8">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="inline-flex size-11 items-center justify-center border bg-background/70">
                                <Hash className="size-5 text-primary" />
                            </span>
                            <TagBadge tag={tag} className="text-sm" />
                        </div>

                        <div className="space-y-3">
                            <CardTitle className="text-4xl tracking-tight md:text-6xl">
                                {tag.name}
                            </CardTitle>
                            <CardDescription className="max-w-3xl text-base leading-7">
                                {tag.description || "Описание для этого тега пока не заполнено. Здесь будут собираться публикации, вопросы и обсуждения по этой теме."}
                            </CardDescription>
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <span className="border bg-background/60 px-3 py-2">
                                публикаций: {tag.publications_count ?? publicationItems.length}
                            </span>
                            <span className="border bg-background/60 px-3 py-2">
                                вопросов: {tag.questions_count ?? questionItems.length}
                            </span>
                        </div>
                    </CardHeader>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Search className="size-5 text-primary" />
                            Поиск по тегу
                        </CardTitle>
                        <CardDescription>
                            Найди публикации и вопросы внутри выбранной темы.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-3">
                            <Input
                                name="search"
                                defaultValue={search}
                                placeholder={`Искать внутри #${tag.name}`}
                            />
                            <div className="flex flex-wrap gap-2">
                                <Button type="submit" className="flex-1">
                                    Найти
                                </Button>
                                {search ? (
                                    <Button variant="outline" asChild>
                                        <Link href={`/tags/${tag.slug}`}>Сбросить</Link>
                                    </Button>
                                ) : null}
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
                <PopularBlock
                    icon={Newspaper}
                    title="Популярные публикации"
                    items={popularPublications.map((publication) => ({
                        title: publication.title,
                        href: `/publications/${publication.slug}`,
                        meta: `${publication.likes_count || 0} реакций · ${publication.comments_count || 0} комментариев`,
                    }))}
                    placeholders={POPULAR_PLACEHOLDERS.publications}
                />
                <PopularBlock
                    icon={MessageSquare}
                    title="Популярные вопросы"
                    items={popularQuestions.map((question) => ({
                        title: question.title,
                        href: `/questions/${question.slug}`,
                        meta: `${question.answers_count || 0} ответов · ${question.views_count || 0} просмотров`,
                    }))}
                    placeholders={POPULAR_PLACEHOLDERS.questions}
                />
            </section>

            <section className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                            <Newspaper className="size-5 text-primary" />
                            Публикации по теме
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Материалы сообщества, связанные с тегом #{tag.name}.
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/publications/create">Написать публикацию</Link>
                    </Button>
                </div>

                {publicationItems.length > 0 ? (
                    <div className="grid gap-5 xl:grid-cols-2">
                        {publicationItems.map((publication) => (
                            <PublicationCard key={publication.id} publication={publication} />
                        ))}
                    </div>
                ) : (
                    <TagEmptyState
                        title="Публикаций по этому тегу пока нет"
                        description="Можно стать первым автором и написать материал по этой теме."
                        actionHref="/publications/create"
                        actionLabel="Написать публикацию"
                    />
                )}

                <PagePagination
                    meta={publications.meta}
                    basePath={`/tags/${tag.slug}`}
                    searchParams={{ search, page }}
                />
            </section>

            <section className="space-y-4">
                <div>
                    <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                        <MessageSquare className="size-5 text-primary" />
                        Вопросы по теме
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Обсуждения и проблемы участников по выбранному тегу.
                    </p>
                </div>

                {questionItems.length > 0 ? (
                    <div className="grid gap-5 xl:grid-cols-2">
                        {questionItems.map((question) => (
                            <IssueQuestionCard key={question.id} question={question} />
                        ))}
                    </div>
                ) : (
                    <TagEmptyState
                        title="Вопросов по этому тегу пока нет"
                        description="Можно задать вопрос и запустить обсуждение по теме."
                        actionHref="/questions/create"
                        actionLabel="Задать вопрос"
                    />
                )}
            </section>
        </div>
    )
}

type PopularBlockProps = {
    icon: ComponentType<{ className?: string }>
    title: string
    items: Array<{ title: string; href: string; meta: string }>
    placeholders: string[]
}

function PopularBlock({ icon: Icon, title, items, placeholders }: PopularBlockProps) {
    return (
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                    <TrendingUp className="size-5 text-primary" />
                    {title}
                </CardTitle>
                <CardDescription>
                    Когда появится активность, здесь будут топовые материалы по этой теме.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {items.length > 0 ? (
                    items.slice(0, 3).map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="group flex items-start gap-3 border bg-muted/20 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/40"
                        >
                            <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                            <span className="min-w-0">
                                <span className="line-clamp-1 text-sm font-medium group-hover:text-primary">
                                    {item.title}
                                </span>
                                <span className="mt-1 block text-xs text-muted-foreground">
                                    {item.meta}
                                </span>
                            </span>
                        </Link>
                    ))
                ) : (
                    placeholders.map((placeholder) => (
                        <div key={placeholder} className="flex items-center gap-3 border border-dashed bg-muted/10 p-3 text-sm text-muted-foreground">
                            <Sparkles className="size-4 text-primary" />
                            {placeholder}
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    )
}

function TagEmptyState({ title, description, actionHref, actionLabel }: { title: string; description: string; actionHref: string; actionLabel: string }) {
    return (
        <Empty className="min-h-72 border border-dashed">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <Hash className="size-6" />
                </EmptyMedia>
                <EmptyTitle>{title}</EmptyTitle>
                <EmptyDescription>{description}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
                <Button asChild>
                    <Link href={actionHref}>{actionLabel}</Link>
                </Button>
            </EmptyContent>
        </Empty>
    )
}
