import { CalendarDays, Globe2, MapPin, Pencil, Trophy } from "lucide-react"

import type { User } from "@/features/auth/types"
import { UserAvatar } from "@/features/users/components/user-avatar"
import { formatProfileDate, getUserRoleLabel } from "@/features/users/lib/user-display"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type ProfileHeroProps = {
    user: User
    showEditButton?: boolean
}

function normalizeUrl(url?: string | null) {
    if (!url) return null

    if (url.startsWith("http://") || url.startsWith("https://")) {
        return url
    }

    return `https://${url}`
}

function GitHubLogo({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={className}
            fill="currentColor"
        >
            <path d="M12 2C6.477 2 2 6.59 2 12.253c0 4.52 2.865 8.352 6.839 9.705.5.095.682-.22.682-.492 0-.244-.009-.888-.014-1.742-2.782.62-3.369-1.374-3.369-1.374-.455-1.186-1.11-1.502-1.11-1.502-.909-.636.068-.623.068-.623 1.004.072 1.532 1.057 1.532 1.057.892 1.566 2.341 1.114 2.91.852.091-.662.35-1.114.636-1.37-2.221-.26-4.555-1.14-4.555-5.073 0-1.12.39-2.036 1.029-2.753-.103-.26-.446-1.305.098-2.718 0 0 .84-.276 2.75 1.052A9.392 9.392 0 0 1 12 6.931a9.4 9.4 0 0 1 2.504.345c1.91-1.328 2.748-1.052 2.748-1.052.546 1.413.203 2.458.1 2.718.64.717 1.028 1.633 1.028 2.753 0 3.943-2.337 4.81-4.566 5.065.359.318.679.946.679 1.907 0 1.376-.013 2.486-.013 2.824 0 .274.18.592.688.491C19.138 20.6 22 16.771 22 12.253 22 6.59 17.523 2 12 2Z" />
        </svg>
    )
}

export function ProfileHero({ user, showEditButton = true }: ProfileHeroProps) {
    const websiteUrl = normalizeUrl(user.website_url)
    const githubUrl = normalizeUrl(user.github_url)
    const hasLinks = Boolean(user.location || websiteUrl || githubUrl)

    return (
        <Card className="relative overflow-hidden border bg-card shadow-sm">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

            <CardContent className="relative p-6 md:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
                        <UserAvatar user={user} size="xl" className="border border-border shadow-sm" />

                        <div className="min-w-0 space-y-4">
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="truncate text-3xl font-semibold tracking-tight">{user.name}</h2>
                                </div>

                                <p className="truncate text-sm text-muted-foreground">
                                    {user.headline || "Участник сообщества программистов"}
                                </p>

                                {user.bio && (
                                    <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                                        {user.bio}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary">{getUserRoleLabel(user.role)}</Badge>

                                <Badge variant="outline" className="gap-1.5">
                                    <Trophy className="size-3.5" />
                                    {user.reputation_level?.label ?? "Новичок"}: {user.reputation_score ?? 0}
                                </Badge>

                                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <CalendarDays className="size-4" />
                                    Зарегистрирован {formatProfileDate(user.created_at)}
                                </span>
                            </div>

                            {hasLinks && (
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                    {user.location && (
                                        <span className="inline-flex items-center gap-1.5 rounded-md border bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">
                                            <MapPin className="size-3.5" />
                                            {user.location}
                                        </span>
                                    )}

                                    {websiteUrl && (
                                        <a
                                            href={websiteUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 rounded-md border bg-background/70 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                                        >
                                            <Globe2 className="size-3.5" />
                                            Сайт
                                        </a>
                                    )}

                                    {githubUrl && (
                                        <a
                                            href={githubUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 rounded-md border bg-background/70 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                                        >
                                            <GitHubLogo className="size-3.5" />
                                            GitHub
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {showEditButton && (
                        <div className="flex shrink-0 items-start gap-2">
                            <Button variant="outline" asChild>
                                <a href="/settings#profile-settings">
                                    <Pencil className="size-4" />
                                    Редактировать профиль
                                </a>
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
