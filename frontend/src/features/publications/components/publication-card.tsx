import type { ComponentType } from "react"
import Link from "next/link"
import { Bookmark, CalendarDays, Clock3, MessageSquare, PenLine, ThumbsDown, ThumbsUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { TagBadge } from "@/features/tags/components/tag-badge"
import { UserAvatar } from "@/features/users/components/user-avatar"
import type { Publication } from "@/features/publications/types"
import { formatPublicationDate, getPublicationTypeLabel } from "@/features/publications/lib/publication-labels"

type PublicationCardProps = {
    publication: Publication
    manage?: boolean
}

export function PublicationCard({ publication, manage = false }: PublicationCardProps) {
    const href = manage ? `/publications/editor/${publication.id}` : `/publications/${publication.slug}`

    return (
        <Card className="group overflow-hidden border-border/80 bg-card/90 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
            {publication.cover_image_url && (
                <Link href={href} className="block overflow-hidden border-b bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={publication.cover_image_url}
                        alt={publication.title}
                        className="aspect-[16/7] w-full object-cover opacity-90 transition-all duration-300 group-hover:scale-[1.02] group-hover:opacity-100"
                    />
                </Link>
            )}

            <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                        {getPublicationTypeLabel(publication.type, publication.type_label)}
                    </Badge>

                    {manage && (
                        <Badge variant={publication.status === "published" ? "default" : "outline"}>
                            {publication.status_label || publication.status}
                        </Badge>
                    )}

                    {(publication.tags || []).slice(0, 4).map((tag) => (
                        <TagBadge key={tag.id || tag.slug} tag={tag} compact />
                    ))}
                </div>

                <CardTitle className="line-clamp-2 text-2xl tracking-tight">
                    <Link href={href} className="transition-colors hover:text-primary">
                        {publication.title}
                    </Link>
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
                {publication.excerpt && (
                    <p className="line-clamp-3 text-sm leading-7 text-muted-foreground">
                        {publication.excerpt}
                    </p>
                )}

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <PublicationMetric icon={ThumbsUp} label="лайков" value={publication.likes_count || 0} />
                    <PublicationMetric icon={MessageSquare} label="комментариев" value={publication.comments_count || 0} />
                    <PublicationMetric icon={Bookmark} label="сохранений" value={publication.saved_count || 0} />
                    <PublicationMetric icon={Clock3} label="мин. чтения" value={publication.reading_time_minutes || 1} />
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                        {publication.author?.id ? (
                            <Link href={`/users/${publication.author.id}`} className="inline-flex items-center gap-1.5 hover:text-primary hover:underline">
                                <UserAvatar user={publication.author} className="size-6" size="sm" />
                                {publication.author.name || "Автор"}
                            </Link>
                        ) : (
                            <><PenLine className="size-3.5" /> {publication.author?.name || "Автор"}</>
                        )}
                    </span>

                    <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-3.5" />
                        {formatPublicationDate(publication.published_at || publication.created_at)}
                    </span>

                    {(publication.dislikes_count || 0) > 0 && (
                        <span className="inline-flex items-center gap-1.5">
                            <ThumbsDown className="size-3.5" />
                            {publication.dislikes_count}
                        </span>
                    )}
                </div>
            </CardContent>

            <CardFooter className="justify-between gap-3">
                <Link href={href} className="text-sm font-medium text-primary transition-colors hover:text-primary/80 hover:underline">
                    {manage ? "Открыть редактор" : "Читать публикацию"}
                </Link>

                {publication.is_saved ? (
                    <span className="inline-flex items-center gap-1.5 border bg-primary/10 px-2 py-1 text-xs text-primary">
                        <Bookmark className="size-3.5" />
                        сохранено
                    </span>
                ) : null}
            </CardFooter>
        </Card>
    )
}

function PublicationMetric({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: number }) {
    return (
        <div className="border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
                <Icon className="size-4 text-primary" />
                {value}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
    )
}
