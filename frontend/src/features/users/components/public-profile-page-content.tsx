"use client"

import * as React from "react"
import Link from "next/link"
import { BookOpen, CheckCircle2, FileText, Lock, Loader2, MessageSquare, Newspaper } from "lucide-react"

import type { User } from "@/features/auth/types"
import type { CommentItem } from "@/features/interactions/types"
import type { IssueAnswer, IssueQuestion, IssuePaginationMeta } from "@/features/issues/types"
import { IssueQuestionCard } from "@/features/issues/components/issue-question-card"
import { ProfileHero } from "@/features/profile/components/profile-hero"
import { SubscribeButton } from "@/features/community/components/subscribe-button"
import { PublicationCard } from "@/features/publications/components/publication-card"
import type { Publication, PublicationPaginationMeta } from "@/features/publications/types"
import {
    getPublicProfileAnswers,
    getPublicProfileComments,
    getPublicProfilePublications,
    getPublicProfileQuestions,
} from "@/features/users/api"
import type { PublicProfile } from "@/features/users/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type ProfileTab = "publications" | "questions" | "answers" | "comments"

type Meta = PublicationPaginationMeta | IssuePaginationMeta | { current_page?: number; last_page?: number; total?: number } | undefined

function asHeroUser(profile: PublicProfile): User {
    return {
        ...profile,
        email: profile.email ?? "",
    }
}

function firstBlockText(blocks?: Array<{ content?: Record<string, unknown> }>) {
    const block = blocks?.find((item) => typeof item.content?.text === "string" || typeof item.content?.code === "string")
    const value = block?.content?.text ?? block?.content?.code

    return typeof value === "string" ? value : "Текст ответа отсутствует."
}

function formatDate(value?: string | null) {
    if (!value) return "недавно"

    try {
        return new Intl.DateTimeFormat("ru-RU", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        }).format(new Date(value))
    } catch {
        return value
    }
}

export function PublicProfilePageContent({ profile, isAuthenticated = false }: { profile: PublicProfile; isAuthenticated?: boolean }) {
    const [activeTab, setActiveTab] = React.useState<ProfileTab>("publications")
    const [pages, setPages] = React.useState<Record<ProfileTab, number>>({
        publications: 1,
        questions: 1,
        answers: 1,
        comments: 1,
    })

    const [publications, setPublications] = React.useState<Publication[]>([])
    const [questions, setQuestions] = React.useState<IssueQuestion[]>([])
    const [answers, setAnswers] = React.useState<IssueAnswer[]>([])
    const [comments, setComments] = React.useState<CommentItem[]>([])
    const [meta, setMeta] = React.useState<Record<ProfileTab, Meta>>({
        publications: undefined,
        questions: undefined,
        answers: undefined,
        comments: undefined,
    })
    const [loading, setLoading] = React.useState(false)

    const currentPage = pages[activeTab]

    React.useEffect(() => {
        if (profile.can_view_full_profile === false) {
            return
        }

        let cancelled = false

        async function loadTab() {
            setLoading(true)

            try {
                if (activeTab === "publications") {
                    const response = await getPublicProfilePublications(profile.id, { page: currentPage, per_page: 6 })
                    if (!cancelled) {
                        setPublications(response.data || [])
                        setMeta((current) => ({ ...current, publications: response.meta }))
                    }
                }

                if (activeTab === "questions") {
                    const response = await getPublicProfileQuestions(profile.id, { page: currentPage, per_page: 6 })
                    if (!cancelled) {
                        setQuestions(response.data || [])
                        setMeta((current) => ({ ...current, questions: response.meta }))
                    }
                }

                if (activeTab === "answers") {
                    const response = await getPublicProfileAnswers(profile.id, { page: currentPage, per_page: 6 })
                    if (!cancelled) {
                        setAnswers(response.data || [])
                        setMeta((current) => ({ ...current, answers: response.meta }))
                    }
                }

                if (activeTab === "comments") {
                    const response = await getPublicProfileComments(profile.id, { page: currentPage, per_page: 8 })
                    if (!cancelled) {
                        setComments(response.data || [])
                        setMeta((current) => ({ ...current, comments: response.meta }))
                    }
                }
            } catch (error) {
                console.log("[PUBLIC_PROFILE_ACTIVITY_ERROR]", error)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        void loadTab()

        return () => {
            cancelled = true
        }
    }, [activeTab, currentPage, profile.id, profile.can_view_full_profile])

    function setPage(tab: ProfileTab, page: number) {
        setPages((current) => ({ ...current, [tab]: page }))
    }

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">Профиль пользователя</h1>
                <p className="text-sm text-muted-foreground">
                    Публичная страница участника: материалы, вопросы, ответы и комментарии.
                </p>
            </div>

            <div className="space-y-3">
                <ProfileHero user={asHeroUser(profile)} showEditButton={false} />
                <div className="flex justify-end">
                    <SubscribeButton
                        type="user"
                        id={profile.id}
                        label="Подписаться на автора"
                        activeLabel="Автор в подписках"
                        disabled={!isAuthenticated}
                    />
                </div>
            </div>


            {profile.can_view_full_profile === false ? (
                <Card className="border-amber-500/30 bg-amber-500/5 shadow-sm">
                    <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
                                <Lock className="size-5" />
                            </div>
                            <div>
                                <h2 className="font-semibold">Профиль закрыт</h2>
                                <p className="mt-1 text-sm text-muted-foreground">Пользователь ограничил доступ к активности. Полную страницу видят только друзья и модераторы.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : null}

            <div className="grid gap-4 md:grid-cols-5">
                <Metric icon={Newspaper} label="Публикации" value={profile.stats.publications_count} />
                <Metric icon={MessageSquare} label="Вопросы" value={profile.stats.questions_count} />
                <Metric icon={FileText} label="Ответы" value={profile.stats.answers_count} />
                <Metric icon={CheckCircle2} label="Решения" value={profile.stats.accepted_answers_count} />
                <Metric icon={BookOpen} label="Комментарии" value={profile.stats.comments_count} />
            </div>

            {profile.can_view_full_profile !== false ? (
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ProfileTab)} className="space-y-6">
                <TabsList variant="line">
                    <TabsTrigger value="publications">Публикации</TabsTrigger>
                    <TabsTrigger value="questions">Вопросы</TabsTrigger>
                    <TabsTrigger value="answers">Ответы</TabsTrigger>
                    <TabsTrigger value="comments">Комментарии</TabsTrigger>
                </TabsList>

                <TabsContent value="publications">
                    <ActivityCard title="Публикации пользователя" description="Опубликованные материалы, доступные всем пользователям.">
                        <LoadingOverlay loading={loading} />
                        {publications.length > 0 ? (
                            <div className="grid gap-4 lg:grid-cols-2">
                                {publications.map((publication) => <PublicationCard key={publication.id} publication={publication} />)}
                            </div>
                        ) : <EmptyState title="Публикаций пока нет" />}
                        <Pager meta={meta.publications} onPage={(page) => setPage("publications", page)} />
                    </ActivityCard>
                </TabsContent>

                <TabsContent value="questions">
                    <ActivityCard title="Вопросы пользователя" description="Вопросы, опубликованные в разделе сообщества.">
                        <LoadingOverlay loading={loading} />
                        {questions.length > 0 ? (
                            <div className="grid gap-4 lg:grid-cols-2">
                                {questions.map((question) => <IssueQuestionCard key={question.id} question={question} />)}
                            </div>
                        ) : <EmptyState title="Вопросов пока нет" />}
                        <Pager meta={meta.questions} onPage={(page) => setPage("questions", page)} />
                    </ActivityCard>
                </TabsContent>

                <TabsContent value="answers">
                    <ActivityCard title="Ответы пользователя" description="Ответы на вопросы других участников.">
                        <LoadingOverlay loading={loading} />
                        {answers.length > 0 ? (
                            <div className="grid gap-4 lg:grid-cols-2">
                                {answers.map((answer) => <AnswerCard key={answer.id} answer={answer} />)}
                            </div>
                        ) : <EmptyState title="Ответов пока нет" />}
                        <Pager meta={meta.answers} onPage={(page) => setPage("answers", page)} />
                    </ActivityCard>
                </TabsContent>

                <TabsContent value="comments">
                    <ActivityCard title="Комментарии пользователя" description="Публичные комментарии к материалам, ответам и урокам.">
                        <LoadingOverlay loading={loading} />
                        {comments.length > 0 ? (
                            <div className="grid gap-4 lg:grid-cols-2">
                                {comments.map((comment) => <CommentCard key={comment.id} comment={comment} />)}
                            </div>
                        ) : <EmptyState title="Комментариев пока нет" />}
                        <Pager meta={meta.comments} onPage={(page) => setPage("comments", page)} />
                    </ActivityCard>
                </TabsContent>
            </Tabs>
            ) : null}
        </div>
    )
}

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
    return (
        <Card className="shadow-sm">
            <CardContent className="flex items-center justify-between gap-4 p-5">
                <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-3xl font-semibold tracking-tight">{value}</p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                </div>
            </CardContent>
        </Card>
    )
}

function ActivityCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
    return (
        <Card className="relative shadow-sm">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">{children}</CardContent>
        </Card>
    )
}

function LoadingOverlay({ loading }: { loading: boolean }) {
    if (!loading) return null

    return (
        <div className="flex items-center gap-2 rounded-xl border bg-muted/25 p-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Загрузка данных...
        </div>
    )
}

function EmptyState({ title }: { title: string }) {
    return (
        <Empty className="min-h-64 border">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <MessageSquare className="size-5" />
                </EmptyMedia>
                <EmptyTitle>{title}</EmptyTitle>
                <EmptyDescription>Активность появится после публикации материалов.</EmptyDescription>
            </EmptyHeader>
        </Empty>
    )
}

function Pager({ meta, onPage }: { meta: Meta; onPage: (page: number) => void }) {
    const current = meta?.current_page ?? 1
    const last = meta?.last_page ?? 1

    if (last <= 1) return null

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
            <p className="text-sm text-muted-foreground">
                Страница {current} из {last}
            </p>
            <div className="flex items-center gap-2">
                <Button type="button" variant="outline" disabled={current <= 1} onClick={() => onPage(current - 1)}>
                    Назад
                </Button>
                <Button type="button" variant="outline" disabled={current >= last} onClick={() => onPage(current + 1)}>
                    Вперёд
                </Button>
            </div>
        </div>
    )
}

function AnswerCard({ answer }: { answer: IssueAnswer }) {
    const href = answer.question?.slug ? `/questions/${answer.question.slug}#answer-${answer.id}` : "/questions"

    return (
        <Card className="bg-muted/15 shadow-none transition-colors hover:border-primary/40">
            <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-center gap-2">
                    {answer.is_accepted && <Badge>Принятое решение</Badge>}
                    <Badge variant="outline">Ответ</Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(answer.created_at)}</span>
                </div>
                <h3 className="line-clamp-2 text-lg font-semibold tracking-tight">
                    <Link href={href}>{answer.question?.title || "Ответ на вопрос"}</Link>
                </h3>
                <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{firstBlockText(answer.blocks)}</p>
                <Button variant="link" className="h-auto p-0" asChild>
                    <Link href={href}>Открыть ответ</Link>
                </Button>
            </CardContent>
        </Card>
    )
}

function CommentCard({ comment }: { comment: CommentItem }) {
    const href = comment.target?.href || null

    return (
        <Card className="bg-muted/15 shadow-none">
            <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Комментарий</Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
                </div>
                <p className="line-clamp-4 text-sm leading-6 text-muted-foreground">{comment.content}</p>
                {comment.target && (
                    <div className="rounded-xl border bg-background/60 p-3 text-sm">
                        <div className="text-xs text-muted-foreground">К материалу</div>
                        {href ? (
                            <Link href={href} className="mt-1 block font-medium hover:text-primary">
                                {comment.target.title}
                            </Link>
                        ) : (
                            <div className="mt-1 font-medium">{comment.target.title}</div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
