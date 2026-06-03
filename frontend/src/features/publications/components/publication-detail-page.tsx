import Link from "next/link"
import { CalendarDays, Clock3, Edit3, MessageSquare, PenLine } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PublicationBlockRenderer } from "@/features/publications/components/publication-block-renderer"
import { ContentAttachmentList } from "@/features/files/components/content-attachment-list"
import { PublicationBreadcrumbs } from "@/features/publications/components/publication-breadcrumbs"
import { CommentsSection } from "@/features/interactions/components/comments-section"
import { ReactionButtons } from "@/features/interactions/components/reaction-buttons"
import { ReportDialog } from "@/features/interactions/components/report-dialog"
import { SaveButton } from "@/features/interactions/components/save-button"
import { SubscribeButton } from "@/features/community/components/subscribe-button"
import { TagBadge } from "@/features/tags/components/tag-badge"
import { formatPublicationDate, getPublicationTypeLabel } from "@/features/publications/lib/publication-labels"
import type { Publication } from "@/features/publications/types"

type PublicationDetailPageProps = {
    publication: Publication
    isAuthenticated?: boolean
}

export function PublicationDetailPage({ publication, isAuthenticated = false }: PublicationDetailPageProps) {
    return (
        <article className="mx-auto w-full max-w-5xl space-y-6">
            <PublicationBreadcrumbs
                items={[
                    { label: "Публикации", href: "/publications" },
                    { label: publication.title },
                ]}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
                <Button variant="outline" asChild>
                    <Link href="/publications">← К публикациям</Link>
                </Button>

                {publication.is_owner && (
                    <Button asChild>
                        <Link href={`/publications/editor/${publication.id}`}>
                            <Edit3 className="size-4" />
                            Редактировать
                        </Link>
                    </Button>
                )}
            </div>

            <Card className="overflow-hidden shadow-sm">
                {publication.cover_image_url && (
                    <div className="border-b bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={publication.cover_image_url}
                            alt={publication.title}
                            className="max-h-[460px] w-full object-cover"
                        />
                    </div>
                )}

                <CardContent className="space-y-6 p-6 md:p-10">
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">
                                {getPublicationTypeLabel(publication.type, publication.type_label)}
                            </Badge>
                            {(publication.tags || []).map((tag) => (
                                <TagBadge key={tag.id || tag.slug} tag={tag} />
                            ))}
                        </div>

                        <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
                            {publication.title}
                        </h1>

                        {publication.excerpt && (
                            <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
                                {publication.excerpt}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-3 border-y py-4 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                            <PenLine className="size-4" />
                            {publication.author?.id ? (
                                <Link href={`/users/${publication.author.id}`} className="hover:text-primary hover:underline">
                                    {publication.author.name || "Автор"}
                                </Link>
                            ) : (
                                publication.author?.name || "Автор"
                            )}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="size-4" />
                            {formatPublicationDate(publication.published_at || publication.created_at)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Clock3 className="size-4" />
                            {publication.reading_time_minutes || 1} мин. чтения
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <MessageSquare className="size-4" />
                            {publication.comments_count || 0} комментариев
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border bg-muted/20 p-4">
                        <ReactionButtons
                            targetType="publication"
                            targetId={publication.id}
                            initialLikes={publication.likes_count}
                            initialDislikes={publication.dislikes_count}
                            initialReaction={publication.my_reaction}
                            isAuthenticated={isAuthenticated}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                            <SubscribeButton
                                type="user"
                                id={publication.author?.id}
                                label="Подписаться на автора"
                                activeLabel="Автор в подписках"
                                disabled={!isAuthenticated || publication.is_owner}
                            />
                            <SubscribeButton
                                type="publication"
                                id={publication.id}
                                label="Следить за обсуждением"
                                activeLabel="Обсуждение в подписках"
                                disabled={!isAuthenticated || publication.is_owner}
                            />
                            <SaveButton targetType="publication" targetId={publication.id} initialSaved={publication.is_saved} />
                            <ReportDialog targetType="publication" targetId={publication.id} isAuthenticated={isAuthenticated} />
                        </div>
                    </div>

                    <div className="space-y-7">
                        {(publication.blocks || []).map((block) => (
                            <PublicationBlockRenderer key={block.id || `${block.type}-${block.sort_order}`} block={block} />
                        ))}
                    </div>

                    <ContentAttachmentList attachments={publication.attachments} />
                </CardContent>
            </Card>

            <CommentsSection
                targetType="publication"
                targetId={publication.id}
                title="Комментарии к публикации"
                description="Обсуждение материала, уточнения и полезные дополнения от читателей."
                isAuthenticated={isAuthenticated}
            />
        </article>
    )
}
