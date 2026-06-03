import Link from "next/link"
import {
    ArrowRight,
    Bell,
    CheckCircle2,
    Circle,
    Code2,
    FileText,
    Globe2,
    HelpCircle,
    Mail,
    MapPin,
    Pencil,
    ShieldCheck,
    Sparkles,
    UserRound,
} from "lucide-react"

import type { User } from "@/features/auth/types"
import {
    formatProfileDate,
    getRegisteredViaLabel,
    getUserRoleLabel,
} from "@/features/users/lib/user-display"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ProfileReputationCard } from "@/features/profile/components/profile-reputation-card"
import { ProfileReputationTimeline } from "@/features/profile/components/profile-reputation-timeline"

const githubIcon = (
    <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-4"
        fill="currentColor"
    >
        <path d="M12 .5A11.5 11.5 0 0 0 .5 12.3c0 5.2 3.4 9.6 8.1 11.1.6.1.8-.3.8-.6v-2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.8.1-.8.1-.8 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.3 3.6 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.4-1.3-5.4-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.2 11.2 0 0 1 6 0C18 4.9 19 5.2 19 5.2c.6 1.6.2 2.9.1 3.2.8.9 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.4 5.9.4.4.8 1.1.8 2.2v3.1c0 .3.2.7.8.6a11.6 11.6 0 0 0 8-11.1A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
)

type ProfileOverviewTabProps = {
    user: User
}

function normalizeUrl(url?: string | null) {
    if (!url) return null

    if (url.startsWith("http://") || url.startsWith("https://")) {
        return url
    }

    return `https://${url}`
}

function getProfileCompletion(user: User) {
    const checks = [
        Boolean(user.name),
        Boolean(user.email),
        Boolean(user.avatar_url || user.avatar),
        Boolean(user.headline),
        Boolean(user.bio),
        Boolean(user.location),
        Boolean(user.website_url || user.github_url),
        Boolean(user.is_email_verified || user.email_verified_at),
    ]

    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

export function ProfileOverviewTab({ user }: ProfileOverviewTabProps) {
    const websiteUrl = normalizeUrl(user.website_url)
    const githubUrl = normalizeUrl(user.github_url)
    const completion = getProfileCompletion(user)
    const isVerified = Boolean(user.is_email_verified || user.email_verified_at)

    const recommendations = [
        {
            label: "Добавить аватар",
            done: Boolean(user.avatar_url || user.avatar),
        },
        {
            label: "Заполнить короткое описание",
            done: Boolean(user.headline),
        },
        {
            label: "Написать информацию о себе",
            done: Boolean(user.bio),
        },
        {
            label: "Указать город или ссылки",
            done: Boolean(user.location || websiteUrl || githubUrl),
        },
        {
            label: "Подтвердить email",
            done: isVerified,
        },
    ]

    return (
        <div className="space-y-6">
            <section className="grid gap-4 lg:grid-cols-3">
                <Card className="overflow-hidden border-primary/20 bg-primary/5 shadow-sm lg:col-span-2">
                    <CardContent className="relative p-6">
                        <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/15 blur-3xl" />

                        <div className="relative space-y-5">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary" className="gap-1.5">
                                    <UserRound className="size-3" />
                                    {getUserRoleLabel(user.role)}
                                </Badge>

                                {isVerified ? (
                                    <Badge variant="outline" className="border-primary/30 text-primary">
                                        Email подтверждён
                                    </Badge>
                                ) : (
                                    <Badge variant="outline">
                                        Email не подтверждён
                                    </Badge>
                                )}
                            </div>

                            <div className="max-w-2xl space-y-2">
                                <h2 className="text-2xl font-semibold tracking-tight">
                                    {user.headline || "Профиль участника сообщества"}
                                </h2>

                                <p className="text-sm leading-6 text-muted-foreground">
                                    {user.bio || "Добавьте описание о себе, чтобы другим участникам было проще понять ваш опыт, интересы и опыт в разработке."}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Button asChild>
                                    <Link href="/settings#profile-settings">
                                        <Pencil className="size-4" />
                                        Заполнить профиль
                                    </Link>
                                </Button>

                                <Button variant="outline" asChild>
                                    <Link href="/publications/create">
                                        Создать публикацию
                                        <ArrowRight className="size-4" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="size-4 text-primary" />
                            Заполненность
                        </CardTitle>
                        <CardDescription>
                            Чем подробнее профиль, тем понятнее ваша активность в сообществе.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="flex items-end justify-between gap-3">
                            <span className="text-4xl font-semibold tracking-tight">
                                {completion}%
                            </span>
                            <span className="pb-1 text-xs text-muted-foreground">
                                профиля заполнено
                            </span>
                        </div>

                        <Progress value={completion} />

                        <div className="space-y-2">
                            {recommendations.map((item) => (
                                <div key={item.label} className="flex items-center gap-2 text-sm">
                                    {item.done ? (
                                        <CheckCircle2 className="size-4 text-primary" />
                                    ) : (
                                        <Circle className="size-4 text-muted-foreground/60" />
                                    )}
                                    <span className={item.done ? "text-foreground" : "text-muted-foreground"}>
                                        {item.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
                <OverviewActionCard
                    icon={FileText}
                    title="Публикации"
                    description="Пишите материалы, заметки и разборы с кодом."
                    href="/publications/create"
                    action="Написать"
                />

                <OverviewActionCard
                    icon={HelpCircle}
                    title="Вопросы"
                    description="Задавайте вопросы и помогайте другим участникам."
                    href="/questions/create"
                    action="Задать вопрос"
                />

                <OverviewActionCard
                    icon={Bell}
                    title="Уведомления"
                    description="Следите за ответами, комментариями, подписками и изменением репутации."
                    href="/inbox"
                    action="Открыть"
                />
            </section>

            <section className="grid gap-6 lg:grid-cols-12">
                <div className="lg:col-span-7">
                    <ProfileReputationCard user={user} />
                </div>

                <div className="lg:col-span-5">
                    <ProfileReputationTimeline />
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-12">
                <Card className="shadow-sm lg:col-span-5">
                    <CardHeader>
                        <CardTitle>Информация</CardTitle>
                        <CardDescription>
                            Основные данные аккаунта.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-3">
                        <ProfileLine
                            icon={Mail}
                            label="Email"
                            value={user.email}
                        />

                        <ProfileLine
                            icon={ShieldCheck}
                            label="Вход"
                            value={getRegisteredViaLabel(user.registered_via)}
                        />

                        <ProfileLine
                            icon={UserRound}
                            label="Роль"
                            value={getUserRoleLabel(user.role)}
                        />

                        <ProfileLine
                            icon={Sparkles}
                            label="Дата регистрации"
                            value={formatProfileDate(user.created_at)}
                        />
                    </CardContent>
                </Card>

                <Card className="shadow-sm lg:col-span-7">
                    <CardHeader>
                        <CardTitle>Публичные данные</CardTitle>
                        <CardDescription>
                            То, что помогает другим участникам лучше узнать автора.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <PublicInfoBox
                                icon={MapPin}
                                title="Город"
                                value={user.location || "Не указан"}
                            />

                            <PublicInfoBox
                                icon={Code2}
                                title="Направление"
                                value={user.headline || "Не указано"}
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {websiteUrl ? (
                                <Button variant="outline" asChild>
                                    <a href={websiteUrl} target="_blank" rel="noreferrer">
                                        <Globe2 className="size-4" />
                                        Сайт
                                    </a>
                                </Button>
                            ) : null}

                            {githubUrl ? (
                                <Button variant="outline" asChild>
                                    <a href={githubUrl} target="_blank" rel="noreferrer">
                                        {githubIcon}
                                        GitHub
                                    </a>
                                </Button>
                            ) : null}

                            {!websiteUrl && !githubUrl ? (
                                <Button variant="outline" asChild>
                                    <Link href="/settings#profile-settings">
                                        Добавить ссылки
                                    </Link>
                                </Button>
                            ) : null}
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    )
}

function OverviewActionCard({
    icon: Icon,
    title,
    description,
    href,
    action,
}: {
    icon: React.ElementType
    title: string
    description: string
    href: string
    action: string
}) {
    return (
        <Card className="group overflow-hidden shadow-sm transition-colors hover:border-primary/40">
            <CardContent className="space-y-4 p-5">
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                </div>

                <div className="space-y-1.5">
                    <h3 className="font-semibold tracking-tight">
                        {title}
                    </h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                        {description}
                    </p>
                </div>

                <Button variant="ghost" className="px-0" asChild>
                    <Link href={href}>
                        {action}
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </Button>
            </CardContent>
        </Card>
    )
}

function ProfileLine({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ElementType
    label: string
    value: string
}) {
    return (
        <div className="flex items-center gap-3 rounded-xl border bg-muted/20 p-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
                <Icon className="size-4" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                    {label}
                </p>
                <p className="truncate text-sm font-medium">
                    {value}
                </p>
            </div>
        </div>
    )
}

function PublicInfoBox({
    icon: Icon,
    title,
    value,
}: {
    icon: React.ElementType
    title: string
    value: string
}) {
    return (
        <div className="rounded-xl border bg-muted/20 p-4">
            <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-background text-muted-foreground">
                <Icon className="size-4" />
            </div>
            <p className="text-xs text-muted-foreground">
                {title}
            </p>
            <p className="mt-1 truncate text-sm font-medium">
                {value}
            </p>
        </div>
    )
}
