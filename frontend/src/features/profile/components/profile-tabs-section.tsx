"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    Award,
    CalendarDays,
    CheckCircle2,
    Code2,
    Download,
    ExternalLink,
    FileArchive,
    FileText,
    Flag,
    Globe2,
    Hash,
    Loader2,
    Lock,
    MapPin,
    MessageSquare,
    MoreHorizontal,
    Newspaper,
    Pin,
    PinOff,
    Plus,
    ShieldCheck,
    Sparkles,
    Star,
    Trophy,
    UploadCloud,
    Users,
} from "lucide-react"
import { toast } from "sonner"

import type { User } from "@/features/auth/types"
import {
    getProfileDashboard,
    getPublicProfileDashboard,
    pinProfileItem,
    startProfileMessage,
    unpinProfileItem,
    type PinPayload,
    type ProfileDashboard,
    type ProfileHubItem,
} from "@/features/profile/api"
import { SubscribeButton } from "@/features/community/components/subscribe-button"
import { ReportDialog } from "@/features/interactions/components/report-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { getUserProfileHrefOrFallback } from "@/features/users/lib/user-links"

type ProfileTabsSectionProps = {
    user: User
    dashboardUserId?: number | string
    isAuthenticated?: boolean
    isPublicProfile?: boolean
}

type TabKey = "overview" | "materials" | "snippets" | "files" | "pins" | "friends" | "activity" | "achievements" | "saved" | "reputation"

const tabs: Array<{ value: TabKey; label: string }> = [
    { value: "overview", label: "Обзор" },
    { value: "materials", label: "Материалы" },
    { value: "snippets", label: "Сниппеты" },
    { value: "files", label: "Файлы" },
    { value: "pins", label: "Закрепы" },
    { value: "friends", label: "Друзья" },
    { value: "activity", label: "Активность" },
    { value: "achievements", label: "Достижения" },
    { value: "saved", label: "Сохранённое" },
    { value: "reputation", label: "Репутация" },
]

const itemTypeLabels: Record<string, string> = {
    publication: "Публикация",
    issue_question: "Вопрос",
    issue_answer: "Ответ",
    code_snippet: "Сниппет",
    user_file: "Файл",
    user: "Участник",
    achievement: "Достижение",
    reputation_event: "Репутация",
}

const itemTypeIcon: Record<string, React.ElementType> = {
    publication: Newspaper,
    issue_question: MessageSquare,
    issue_answer: CheckCircle2,
    code_snippet: Code2,
    user_file: FileText,
    user: Users,
    achievement: Award,
    reputation_event: Trophy,
}

function emptyDashboard(user: User): ProfileDashboard {
    return {
        user,
        stats: {},
        completion: 0,
        pinned_items: [],
        materials: [],
        snippets: [],
        files: [],
        friends: [],
        activity: [],
        achievements: [],
        reputation: { score: user.reputation_score || 0, level: user.reputation_level, events: [] },
        saved_summary: null,
        saved_items: [],
        relationship_to_viewer: { is_owner: true },
    }
}

export function ProfileTabsSection({ user, dashboardUserId, isAuthenticated = true, isPublicProfile = false }: ProfileTabsSectionProps) {
    const router = useRouter()
    const [dashboard, setDashboard] = React.useState<ProfileDashboard>(() => emptyDashboard(user))
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)
    const [active, setActive] = React.useState<TabKey>("overview")
    const [pinBusy, setPinBusy] = React.useState<string | null>(null)
    const profileUser = dashboard.user || user
    const isOwner = Boolean(dashboard.relationship_to_viewer?.is_owner) && !isPublicProfile

    const loadDashboard = React.useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const payload = isPublicProfile && dashboardUserId
                ? await getPublicProfileDashboard(dashboardUserId)
                : await getProfileDashboard()
            setDashboard(payload)
        } catch (requestError) {
            console.log("[PROFILE_DASHBOARD_LOAD_ERROR]", requestError)
            setError("Не удалось загрузить данные профиля. Проверьте авторизацию или backend-логи.")
        } finally {
            setLoading(false)
        }
    }, [dashboardUserId, isPublicProfile])

    React.useEffect(() => {
        void loadDashboard()
    }, [loadDashboard])

    const pinKeys = React.useMemo(() => new Set((dashboard.pinned_items || []).map((item) => pinKey(item))), [dashboard.pinned_items])
    const visibleTabs = React.useMemo(() => tabs.filter((tab) => tab.value !== "saved" || isOwner), [isOwner])
    const stats = dashboard.stats || {}
    const earnedAchievements = React.useMemo(() => onlyEarnedAchievements(dashboard.achievements || []), [dashboard.achievements])

    async function togglePin(item: ProfileHubItem) {
        const payload = toPinPayload(item)
        if (!payload) return

        const key = pinKey(item)
        const isPinned = pinKeys.has(key)
        setPinBusy(key)
        try {
            if (isPinned) {
                await unpinProfileItem(payload)
                toast.success("Закреп убран из профиля")
            } else {
                await pinProfileItem(payload)
                toast.success("Материал закреплён в профиле")
            }
            await loadDashboard()
        } catch (requestError) {
            console.log("[PROFILE_PIN_ERROR]", requestError)
            toast.error("Не удалось изменить закреп", {
                description: "Закреплять можно опубликованные материалы, публичные сниппеты и публичные файлы.",
            })
        } finally {
            setPinBusy(null)
        }
    }

    async function openMessage() {
        if (!isAuthenticated) {
            toast.message("Нужно авторизоваться", { description: "Войдите в аккаунт, чтобы написать участнику." })
            return
        }

        try {
            const conversation = await startProfileMessage(profileUser.id)
            router.push(conversation.url)
        } catch (requestError) {
            console.log("[PROFILE_MESSAGE_ERROR]", requestError)
            toast.error("Не удалось открыть чат")
        }
    }

    return (
        <TooltipProvider>
            <div className="space-y-5">
                <ProfileHeader
                    user={profileUser}
                    isOwner={isOwner}
                    isAuthenticated={isAuthenticated}
                    loading={loading}
                    onMessage={openMessage}
                />

                {error && !loading ? <ProfileError message={error} onRetry={loadDashboard} /> : null}

                <StatsSummary stats={stats} reputation={dashboard.reputation} loading={loading} />

                <Tabs value={active} onValueChange={(value) => setActive(value as TabKey)} className="gap-4">
                    <TabsList variant="line" className="h-auto w-full flex-wrap justify-start gap-1 border bg-card/80 p-1.5 rounded-none">
                        {visibleTabs.map((tab) => (
                            <TabsTrigger key={tab.value} value={tab.value} className="h-8 flex-none rounded-none px-3 data-active:bg-primary data-active:text-primary-foreground data-active:after:opacity-0">
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
                        <main className="min-w-0 space-y-5">
                            <TabsContent value="overview" className="m-0 space-y-5">
                                {dashboard.pinned_items.length > 0 ? (
                                    <ContentSection
                                        title="Закреплено"
                                        description="Главные материалы, сниппеты и файлы, которые участник показывает первыми."
                                        items={dashboard.pinned_items}
                                        isOwner={isOwner}
                                        pinKeys={pinKeys}
                                        pinBusy={pinBusy}
                                        onTogglePin={togglePin}
                                        loading={loading}
                                        featured
                                    />
                                ) : null}

                                <ContentSection
                                    title="Материалы"
                                    description="Публикации, вопросы и ответы участника."
                                    items={dashboard.materials}
                                    emptyTitle={isOwner ? "Создайте первый материал" : "Материалов пока нет"}
                                    emptyDescription={isOwner ? "Напишите публикацию, задайте вопрос или ответьте участникам — материалы появятся здесь." : "Участник пока не публиковал материалы."}
                                    action={isOwner ? { href: "/publications/create", label: "Создать публикацию" } : undefined}
                                    isOwner={isOwner}
                                    pinKeys={pinKeys}
                                    pinBusy={pinBusy}
                                    onTogglePin={togglePin}
                                    loading={loading}
                                />

                                <SectionGrid>
                                    <ContentSection
                                        title="Сниппеты"
                                        description="Публичный код из playground."
                                        items={dashboard.snippets.slice(0, 4)}
                                        emptyTitle="Сниппетов пока нет"
                                        emptyDescription={isOwner ? "Сделайте сниппет публичным в playground." : "Участник пока не публиковал сниппеты."}
                                        action={isOwner ? { href: "/playground", label: "Открыть playground" } : undefined}
                                        isOwner={isOwner}
                                        pinKeys={pinKeys}
                                        pinBusy={pinBusy}
                                        onTogglePin={togglePin}
                                        loading={loading}
                                        compact
                                    />
                                    <ContentSection
                                        title="Файлы"
                                        description="Публичные файлы из хранилища."
                                        items={dashboard.files.slice(0, 4)}
                                        emptyTitle="Файлов пока нет"
                                        emptyDescription={isOwner ? "Загрузите файл и сделайте его публичным." : "Пользователь пока не публиковал файлы."}
                                        action={isOwner ? { href: "/files", label: "Открыть файлы" } : undefined}
                                        isOwner={isOwner}
                                        pinKeys={pinKeys}
                                        pinBusy={pinBusy}
                                        onTogglePin={togglePin}
                                        loading={loading}
                                        compact
                                    />
                                </SectionGrid>
                            </TabsContent>

                            <TabsContent value="materials" className="m-0">
                                <ContentSection
                                    title="Материалы"
                                    description="Все опубликованные публикации, вопросы и ответы."
                                    items={dashboard.materials}
                                    emptyTitle="Материалов пока нет"
                                    emptyDescription="Здесь отображается только реальная публичная активность."
                                    action={isOwner ? { href: "/publications/create", label: "Создать материал" } : undefined}
                                    isOwner={isOwner}
                                    pinKeys={pinKeys}
                                    pinBusy={pinBusy}
                                    onTogglePin={togglePin}
                                    loading={loading}
                                />
                            </TabsContent>

                            <TabsContent value="snippets" className="m-0">
                                <ContentSection
                                    title="Сниппеты"
                                    description="Публичные и доступные владельцу сниппеты из playground."
                                    items={dashboard.snippets}
                                    emptyTitle="Сниппетов пока нет"
                                    emptyDescription="Сниппеты появляются после сохранения кода в playground."
                                    action={isOwner ? { href: "/playground", label: "Создать сниппет" } : undefined}
                                    isOwner={isOwner}
                                    pinKeys={pinKeys}
                                    pinBusy={pinBusy}
                                    onTogglePin={togglePin}
                                    loading={loading}
                                />
                            </TabsContent>

                            <TabsContent value="files" className="m-0">
                                <FilesSection
                                    items={dashboard.files}
                                    isOwner={isOwner}
                                    pinKeys={pinKeys}
                                    pinBusy={pinBusy}
                                    onTogglePin={togglePin}
                                    loading={loading}
                                />
                            </TabsContent>

                            <TabsContent value="pins" className="m-0">
                                <ContentSection
                                    title="Закрепы"
                                    description="Материалы, сниппеты и файлы, закреплённые в публичном профиле."
                                    items={dashboard.pinned_items}
                                    emptyTitle={isOwner ? "Закрепов пока нет" : "Участник ничего не закрепил"}
                                    emptyDescription={isOwner ? "Закрепите публикацию, вопрос, сниппет или публичный файл из меню элемента." : "Закрепы появятся, когда участник выберет важные материалы."}
                                    isOwner={isOwner}
                                    pinKeys={pinKeys}
                                    pinBusy={pinBusy}
                                    onTogglePin={togglePin}
                                    loading={loading}
                                    featured
                                />
                            </TabsContent>

                            <TabsContent value="friends" className="m-0">
                                <PeopleSection items={dashboard.friends} isOwner={isOwner} loading={loading} />
                            </TabsContent>

                            <TabsContent value="activity" className="m-0">
                                <ActivitySection items={dashboard.activity} isOwner={isOwner} loading={loading} />
                            </TabsContent>

                            <TabsContent value="achievements" className="m-0">
                                <AchievementsSection items={earnedAchievements} loading={loading} />
                            </TabsContent>

                            {isOwner ? (
                                <TabsContent value="saved" className="m-0">
                                    <ContentSection
                                        title="Сохранённое"
                                        description="Приватный раздел: сохранённые публикации, вопросы и ответы."
                                        items={dashboard.saved_items || []}
                                        emptyTitle="Пока ничего не сохранено"
                                        emptyDescription="Сохраняйте материалы, чтобы быстро вернуться к ним из профиля."
                                        isOwner={false}
                                        pinKeys={pinKeys}
                                        pinBusy={pinBusy}
                                        onTogglePin={togglePin}
                                        loading={loading}
                                    />
                                </TabsContent>
                            ) : null}

                            <TabsContent value="reputation" className="m-0">
                                <ReputationSection dashboard={dashboard} loading={loading} />
                            </TabsContent>
                        </main>

                        <aside className="space-y-4">
                            <ProfileCompletenessCard user={profileUser} completion={dashboard.completion} isOwner={isOwner} loading={loading} />
                            <LinksCard user={profileUser} isOwner={isOwner} />
                            <ReputationCard dashboard={dashboard} loading={loading} />
                            <MiniAchievements items={earnedAchievements} loading={loading} />
                        </aside>
                    </div>
                </Tabs>
            </div>
        </TooltipProvider>
    )
}

function ProfileError({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <Card className="rounded-none border-destructive/30 bg-destructive/5" size="sm">
            <CardContent className="flex flex-col gap-3 p-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                    <Lock className="mt-0.5 size-5 text-destructive" />
                    <span>{message}</span>
                </div>
                <Button variant="outline" className="rounded-none" onClick={() => void onRetry()}>Повторить</Button>
            </CardContent>
        </Card>
    )
}

function ProfileHeader({
    user,
    isOwner,
    isAuthenticated,
    loading,
    onMessage,
}: {
    user: User
    isOwner: boolean
    isAuthenticated: boolean
    loading: boolean
    onMessage: () => void
}) {
    const initials = (user.name || "U").slice(0, 2).toUpperCase()
    const registeredAt = formatDate(user.created_at, { month: "long", year: "numeric" })
    const meta = [
        user.location ? { icon: MapPin, value: user.location } : null,
        user.direction ? { icon: Hash, value: user.direction } : null,
        { icon: CalendarDays, value: `с ${registeredAt}` },
    ].filter(Boolean) as Array<{ icon: React.ElementType; value: string }>

    return (
        <section className="overflow-hidden rounded-none border bg-card/90 text-card-foreground shadow-sm">
            <div className="h-1 bg-primary/70" />
            <div className="grid gap-4 p-5 md:grid-cols-[auto_minmax(0,1fr)] xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:items-center">
                <Avatar className="size-20 rounded-none border bg-muted" size="lg">
                    <AvatarImage src={user.avatar_url || user.avatar || undefined} alt={user.name} />
                    <AvatarFallback className="rounded-none text-2xl font-semibold">{initials}</AvatarFallback>
                </Avatar>

                <div className="min-w-0 space-y-3">
                    <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-3xl font-semibold tracking-tight">{user.name}</h2>
                            {loading ? <Skeleton className="h-5 w-20" /> : <Badge variant="outline" className="rounded-none">{user.reputation_score || 0} реп.</Badge>}
                            {user.role && user.role !== "user" ? <Badge variant="secondary" className="rounded-none"><ShieldCheck className="size-3" />{user.role}</Badge> : null}
                        </div>
                        <p className="text-sm text-muted-foreground">@user-{user.id}{user.headline ? ` · ${user.headline}` : " · участник сообщества Вектор"}</p>
                    </div>

                    {user.bio ? (
                        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{user.bio}</p>
                    ) : isOwner ? (
                        <p className="max-w-3xl border border-dashed bg-background/45 p-3 text-sm leading-6 text-muted-foreground">Заполните bio, направление и ссылки в настройках — профиль станет похож на публичную страницу автора.</p>
                    ) : null}

                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                        {meta.map(({ icon: Icon, value }) => (
                            <span key={value} className="inline-flex items-center gap-1"><Icon className="size-3.5" />{value}</span>
                        ))}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 xl:justify-end">
                    {isOwner ? (
                        <>
                            <Button asChild className="rounded-none">
                                <Link href="/settings"><Sparkles className="size-4" />Редактировать</Link>
                            </Button>
                            <Button asChild variant="outline" className="rounded-none">
                                <Link href="/publications/create"><Plus className="size-4" />Публикация</Link>
                            </Button>
                            <Button asChild variant="outline" className="rounded-none">
                                <Link href="/questions/create"><MessageSquare className="size-4" />Вопрос</Link>
                            </Button>
                            <Button asChild variant="outline" className="rounded-none">
                                <Link href="/files"><UploadCloud className="size-4" />Файл</Link>
                            </Button>
                        </>
                    ) : (
                        <>
                            <SubscribeButton type="user" id={user.id} disabled={!isAuthenticated} label="Подписаться" activeLabel="Вы подписаны" />
                            <Button variant="outline" size="sm" className="rounded-none" onClick={onMessage} disabled={!isAuthenticated}>
                                <MessageSquare className="size-4" />Написать
                            </Button>
                            <ReportDialog targetType="user" targetId={user.id} label="Пожаловаться" variant="button" isAuthenticated={isAuthenticated} />
                        </>
                    )}
                </div>
            </div>
        </section>
    )
}

function StatsSummary({ stats, reputation, loading }: { stats: Record<string, number | undefined>; reputation: ProfileDashboard["reputation"]; loading: boolean }) {
    const items = [
        { label: "Репутация", value: reputation.score ?? stats.reputation ?? 0, icon: Trophy },
        { label: "Материалы", value: (stats.publications || 0) + (stats.questions || 0) + (stats.answers || 0), icon: Newspaper },
        { label: "Сниппеты", value: stats.snippets || 0, icon: Code2 },
        { label: "Файлы", value: stats.files || 0, icon: FileArchive },
        { label: "Закрепы", value: stats.pinned || 0, icon: Pin },
        { label: "Друзья", value: stats.friends || 0, icon: Users },
    ]

    return (
        <Card className="rounded-none bg-card/80" size="sm">
            <CardContent className="p-0">
                <div className="grid grid-cols-2 divide-y divide-border sm:grid-cols-3 lg:grid-cols-6 lg:divide-x lg:divide-y-0">
                    {items.map(({ label, value, icon: Icon }) => (
                        <div key={label} className="flex items-center justify-between gap-3 p-4">
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
                                {loading ? <Skeleton className="mt-2 h-6 w-12" /> : <p className="mt-1 text-2xl font-semibold">{value}</p>}
                            </div>
                            <Icon className="size-5 text-primary/80" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

function SectionGrid({ children }: { children: React.ReactNode }) {
    return <div className="grid gap-5 lg:grid-cols-2">{children}</div>
}

type ContentSectionProps = {
    title?: string
    description?: string
    items: ProfileHubItem[]
    emptyTitle?: string
    emptyDescription?: string
    action?: { href: string; label: string }
    isOwner: boolean
    pinKeys: Set<string>
    pinBusy: string | null
    onTogglePin: (item: ProfileHubItem) => void
    loading: boolean
    featured?: boolean
    compact?: boolean
}

function ContentSection({ title, description, items, emptyTitle, emptyDescription, action, isOwner, pinKeys, pinBusy, onTogglePin, loading, featured = false, compact = false }: ContentSectionProps) {
    return (
        <Card className={cn("rounded-none bg-card/80", featured && "border-primary/25 bg-primary/5")} size={compact ? "sm" : "default"}>
            {title ? (
                <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                        <CardTitle>{title}</CardTitle>
                        {description ? <CardDescription>{description}</CardDescription> : null}
                    </div>
                    {action ? <Button asChild size="sm" variant="outline" className="rounded-none"><Link href={action.href}>{action.label}</Link></Button> : null}
                </CardHeader>
            ) : null}
            <CardContent className="space-y-3">
                {loading ? <LoadingList rows={compact ? 2 : 3} /> : items.length > 0 ? items.map((item) => (
                    <HubItemCard
                        key={`${item.type}-${item.id}-${item.pinned_at || item.saved_at || "item"}`}
                        item={item}
                        isOwner={isOwner}
                        isPinned={pinKeys.has(pinKey(item))}
                        busy={pinBusy === pinKey(item)}
                        onTogglePin={onTogglePin}
                    />
                )) : (
                    <EmptyState title={emptyTitle || "Пока пусто"} description={emptyDescription || "Данных для этого раздела пока нет."} action={action} compact={compact} />
                )}
            </CardContent>
        </Card>
    )
}

function FilesSection({ items, isOwner, pinKeys, pinBusy, onTogglePin, loading }: Omit<ContentSectionProps, "title" | "description">) {
    return (
        <Card className="rounded-none bg-card/80">
            <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                    <CardTitle>Файлы пользователя</CardTitle>
                    <CardDescription>Публичные файлы из файлового хранилища. Владелец видит свои доступные действия.</CardDescription>
                </div>
                {isOwner ? <Button asChild size="sm" variant="outline" className="rounded-none"><Link href="/files"><UploadCloud className="size-4" />Открыть хранилище</Link></Button> : null}
            </CardHeader>
            <CardContent className="space-y-3">
                {loading ? <LoadingList /> : items.length > 0 ? items.map((item) => (
                    <HubItemCard
                        key={`file-${item.id}`}
                        item={item}
                        isOwner={isOwner}
                        isPinned={pinKeys.has(pinKey(item))}
                        busy={pinBusy === pinKey(item)}
                        onTogglePin={onTogglePin}
                    />
                )) : <EmptyState title="Файлов пока нет" description={isOwner ? "Загрузите файл и сделайте его публичным, чтобы он появился в профиле." : "Пользователь пока не публиковал файлы."} action={isOwner ? { href: "/files", label: "Загрузить файл" } : undefined} />}
            </CardContent>
        </Card>
    )
}

function HubItemCard({ item, isOwner, isPinned, busy, onTogglePin }: { item: ProfileHubItem; isOwner: boolean; isPinned: boolean; busy: boolean; onTogglePin: (item: ProfileHubItem) => void }) {
    const Icon = itemTypeIcon[item.type] || FileText
    const title = item.title || item.name || item.original_name || itemTypeLabels[item.type] || "Материал"
    const href = item.url || "#"
    const isFile = item.type === "user_file"
    const canPin = isOwner && Boolean(toPinPayload(item))

    return (
        <article className="group border bg-background/45 p-4 transition-colors hover:border-primary/40 hover:bg-muted/20">
            <div className="flex gap-3">
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center border bg-primary/10 text-primary">
                    <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={isPinned ? "default" : "outline"} className="rounded-none">{itemTypeLabels[item.type] || item.type}</Badge>
                        {item.language ? <Badge variant="secondary" className="rounded-none">{item.language}</Badge> : null}
                        {item.visibility ? <Badge variant="outline" className="rounded-none">{visibilityLabel(item.visibility)}</Badge> : null}
                        {item.points ? <Badge variant="secondary" className="rounded-none">+{item.points}</Badge> : null}
                        {item.created_at ? <span className="text-xs text-muted-foreground">{formatDate(item.created_at)}</span> : null}
                    </div>
                    <h3 className="line-clamp-2 text-base font-semibold leading-6">
                        {href !== "#" ? <Link href={href} className="hover:text-primary">{title}</Link> : title}
                    </h3>
                    {item.excerpt || item.description || item.headline ? (
                        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{item.excerpt || item.description || item.headline}</p>
                    ) : null}
                    {item.tags && item.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                            {item.tags.slice(0, 5).map((tag) => (
                                <Link key={tag.slug || tag.name} href={tag.slug ? `/tags/${tag.slug}` : "/tags"} className="border px-2 py-0.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary">
                                    #{tag.name}
                                </Link>
                            ))}
                        </div>
                    ) : null}
                    <ItemMeta item={item} />
                </div>
                <div className="flex shrink-0 items-start gap-1">
                    {isFile && item.download_url ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button asChild size="icon-sm" variant="ghost" className="rounded-none">
                                    <a href={item.download_url} aria-label="Скачать файл"><Download className="size-4" /></a>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Скачать</TooltipContent>
                        </Tooltip>
                    ) : null}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="rounded-none" aria-label="Действия">
                                <MoreHorizontal className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {href !== "#" ? (
                                <DropdownMenuItem asChild>
                                    <Link href={href}><ExternalLink className="size-4" />Открыть</Link>
                                </DropdownMenuItem>
                            ) : null}
                            {isFile && item.download_url ? (
                                <DropdownMenuItem asChild>
                                    <a href={item.download_url}><Download className="size-4" />Скачать файл</a>
                                </DropdownMenuItem>
                            ) : null}
                            {canPin ? (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem disabled={busy} onClick={() => onTogglePin(item)}>
                                        {busy ? <Loader2 className="size-4 animate-spin" /> : isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                                        {isPinned ? "Открепить" : "Закрепить"}
                                    </DropdownMenuItem>
                                </>
                            ) : null}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </article>
    )
}

function ItemMeta({ item }: { item: ProfileHubItem }) {
    const parts: string[] = []
    if (typeof item.score === "number" && item.score > 0) parts.push(`${item.score} score`)
    if (typeof item.runs_count === "number") parts.push(`${item.runs_count} запусков`)
    if (typeof item.size === "number") parts.push(sizeLabel(item.size))
    if (item.folder?.name) parts.push(item.folder.name)
    if (item.meta?.likes !== undefined) parts.push(`${Number(item.meta.likes)} лайков`)
    if (item.meta?.comments !== undefined) parts.push(`${Number(item.meta.comments)} комментариев`)
    if (item.meta?.answers !== undefined) parts.push(`${Number(item.meta.answers)} ответов`)

    if (parts.length === 0) return null
    return <p className="text-xs text-muted-foreground">{parts.join(" · ")}</p>
}

function PeopleSection({ items, isOwner, loading }: { items: ProfileHubItem[]; isOwner: boolean; loading: boolean }) {
    return (
        <Card className="rounded-none bg-card/80">
            <CardHeader>
                <CardTitle>Друзья</CardTitle>
                <CardDescription>Люди, с которыми участник связан внутри платформы.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? <LoadingList /> : items.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                        {items.map((friend) => (
                            <Link key={friend.id} href={getUserProfileHrefOrFallback(friend)} className="flex items-center gap-3 border bg-background/45 p-3 hover:border-primary/40">
                                <Avatar className="size-10 rounded-none">
                                    <AvatarImage src={friend.avatar_url || friend.avatar || undefined} />
                                    <AvatarFallback className="rounded-none">{(friend.name || friend.title || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <p className="truncate font-medium">{friend.name || friend.title}</p>
                                    <p className="truncate text-xs text-muted-foreground">{friend.headline || `${friend.reputation_score || 0} репутации`}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : <EmptyState title="Друзей пока нет" description={isOwner ? "Добавляйте участников в друзья, чтобы быстрее находить их в чатах и профилях." : "Пользователь не показывает друзей или список пуст."} action={isOwner ? { href: "/friends", label: "Найти друзей" } : undefined} />}
            </CardContent>
        </Card>
    )
}

function ActivitySection({ items, isOwner, loading }: { items: ProfileHubItem[]; isOwner: boolean; loading: boolean }) {
    return (
        <Card className="rounded-none bg-card/80">
            <CardHeader>
                <CardTitle>Последняя активность</CardTitle>
                <CardDescription>События профиля: материалы, ответы, комментарии, файлы, достижения.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? <LoadingList /> : items.length ? (
                    <div className="relative space-y-0 border-l border-border pl-5">
                        {items.map((item) => (
                            <div key={`${item.type}-${item.id}`} className="relative pb-5 last:pb-0">
                                <span className="absolute -left-[25px] top-1 size-2 border bg-primary" />
                                <div className="border bg-background/45 p-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="font-medium">{item.url ? <Link href={item.url} className="hover:text-primary">{item.title || itemTypeLabels[item.type] || item.type}</Link> : item.title || itemTypeLabels[item.type] || item.type}</p>
                                        {item.created_at ? <span className="text-xs text-muted-foreground">{formatDate(item.created_at)}</span> : null}
                                    </div>
                                    {item.description ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p> : null}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : <EmptyState title="Активности пока нет" description={isOwner ? "Публикации, вопросы, ответы, комментарии и файлы начнут формировать живую ленту профиля." : "Пользователь пока не оставил публичных событий."} />}
            </CardContent>
        </Card>
    )
}

function AchievementsSection({ items, loading }: { items: ProfileHubItem[]; loading: boolean }) {
    return (
        <Card className="rounded-none bg-card/80">
            <CardHeader>
                <CardTitle>Полученные достижения</CardTitle>
                <CardDescription>Показываем только реально полученные бейджи, без фейковых заглушек.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? <LoadingList /> : items.length ? (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {items.map((item) => (
                            <div key={item.id || item.title} className="border bg-background/45 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex size-10 items-center justify-center border bg-primary/10 text-primary"><Award className="size-4" /></div>
                                    <Badge variant="default" className="rounded-none">получено</Badge>
                                </div>
                                <h3 className="mt-3 font-semibold">{item.title || item.name}</h3>
                                {item.description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p> : null}
                                {item.unlocked_at || item.created_at ? <p className="mt-3 text-xs text-muted-foreground">{formatDate(item.unlocked_at || item.created_at)}</p> : null}
                            </div>
                        ))}
                    </div>
                ) : <EmptyState title="Достижений пока нет" description="Бейджи появятся после реальных действий: публикаций, ответов, реакций и активности." />}
            </CardContent>
        </Card>
    )
}

function ReputationSection({ dashboard, loading }: { dashboard: ProfileDashboard; loading: boolean }) {
    const events = dashboard.reputation.events || []
    return (
        <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
            <ReputationCard dashboard={dashboard} loading={loading} />
            <Card className="rounded-none bg-card/80">
                <CardHeader>
                    <CardTitle>История репутации</CardTitle>
                    <CardDescription>Начисления и списания, которые уже есть в backend.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {loading ? <LoadingList /> : events.length ? events.map((event) => (
                        <div key={event.id} className="flex items-start justify-between gap-4 border bg-background/45 p-3">
                            <div>
                                <p className="font-medium">{event.title}</p>
                                {event.description ? <p className="mt-1 text-xs text-muted-foreground">{event.description}</p> : null}
                                {event.created_at ? <p className="mt-1 text-xs text-muted-foreground">{formatDate(event.created_at)}</p> : null}
                            </div>
                            <Badge variant={(event.points || 0) >= 0 ? "default" : "destructive"} className="rounded-none">{(event.points || 0) > 0 ? "+" : ""}{event.points || 0}</Badge>
                        </div>
                    )) : <EmptyState title="Истории репутации пока нет" description="Репутация будет начисляться за полезные действия, реакции и принятые ответы." />}
                </CardContent>
            </Card>
        </div>
    )
}

function ProfileCompletenessCard({ user, completion, isOwner, loading }: { user: User; completion: number; isOwner: boolean; loading: boolean }) {
    const checks = [
        { label: "Аватар", done: Boolean(user.avatar_url || user.avatar) },
        { label: "Заголовок", done: Boolean(user.headline) },
        { label: "Bio", done: Boolean(user.bio) },
        { label: "Направление", done: Boolean(user.direction) },
        { label: "Локация", done: Boolean(user.location) },
        { label: "Ссылки", done: Boolean(user.website_url || user.github_url) },
    ]

    return (
        <Card className="rounded-none bg-card/80" size="sm">
            <CardHeader>
                <CardTitle>Заполнение профиля</CardTitle>
                <CardDescription>{isOwner ? "Что ещё улучшит публичный профиль." : "Насколько профиль заполнен."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading ? <Skeleton className="h-3 w-full" /> : <Progress value={completion} />}
                <p className="text-sm text-muted-foreground">{completion || 0}% заполнено</p>
                <div className="grid gap-2">
                    {checks.map((check) => (
                        <div key={check.label} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{check.label}</span>
                            {check.done ? <CheckCircle2 className="size-4 text-primary" /> : <span className="size-4 border" />}
                        </div>
                    ))}
                </div>
                {isOwner ? <Button asChild variant="outline" className="w-full rounded-none"><Link href="/settings">Дополнить профиль</Link></Button> : null}
            </CardContent>
        </Card>
    )
}

function LinksCard({ user, isOwner }: { user: User; isOwner: boolean }) {
    const website = normalizeUrl(user.website_url)
    const github = normalizeUrl(user.github_url)
    return (
        <Card className="rounded-none bg-card/80" size="sm">
            <CardHeader>
                <CardTitle>Контакты и ссылки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                {user.location ? <InfoLine icon={MapPin} label="Локация" value={user.location} /> : null}
                {user.direction ? <InfoLine icon={Hash} label="Направление" value={user.direction} /> : null}
                {website ? <Button asChild variant="outline" className="w-full justify-start rounded-none"><a href={website} target="_blank" rel="noreferrer"><Globe2 className="size-4" />Сайт</a></Button> : null}
                {github ? <Button asChild variant="outline" className="w-full justify-start rounded-none"><a href={github} target="_blank" rel="noreferrer"><Code2 className="size-4" />GitHub</a></Button> : null}
                {!website && !github && !user.location && !user.direction ? <EmptyState title="Ссылок нет" description={isOwner ? "Добавьте GitHub, сайт, город или направление в настройках." : "Пользователь не указал публичные контакты."} compact /> : null}
            </CardContent>
        </Card>
    )
}

function ReputationCard({ dashboard, loading }: { dashboard: ProfileDashboard; loading: boolean }) {
    const level = dashboard.reputation.level
    const progress = typeof level?.progress === "number" ? level.progress : Math.min(100, dashboard.reputation.score)
    return (
        <Card className="rounded-none border-primary/25 bg-primary/5" size="sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Trophy className="size-5 text-primary" />Репутация</CardTitle>
                <CardDescription>Баллы, уровень и история.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading ? <Skeleton className="h-10 w-24" /> : <div className="text-4xl font-semibold">{dashboard.reputation.score}</div>}
                <div>
                    <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                        <span>{level?.label || "Новичок"}</span>
                        {level?.next_label ? <span>{level.next_label}</span> : null}
                    </div>
                    <Progress value={progress} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
                    <div className="border bg-background/40 p-2"><b className="block text-foreground">{dashboard.stats.accepted_answers || 0}</b>принято</div>
                    <div className="border bg-background/40 p-2"><b className="block text-foreground">{dashboard.stats.followers || 0}</b>подписчики</div>
                    <div className="border bg-background/40 p-2"><b className="block text-foreground">{dashboard.reputation.events.length}</b>события</div>
                </div>
            </CardContent>
        </Card>
    )
}

function MiniAchievements({ items, loading }: { items: ProfileHubItem[]; loading: boolean }) {
    const visible = items.slice(0, 4)
    return (
        <Card className="rounded-none bg-card/80" size="sm">
            <CardHeader>
                <CardTitle>Достижения</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {loading ? <LoadingList rows={2} /> : visible.length ? visible.map((item) => (
                    <div key={item.id || item.title} className="border bg-background/45 p-3">
                        <div className="flex items-center gap-2 font-medium"><Star className="size-4 text-primary" />{item.title || item.name}</div>
                        {item.description ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p> : null}
                    </div>
                )) : <EmptyState title="Достижений пока нет" description="Первые бейджи появятся после действий." compact />}
            </CardContent>
        </Card>
    )
}

function InfoLine({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
    return <div className="flex items-center gap-2 text-muted-foreground"><Icon className="size-4 text-primary" /><span>{label}: </span><span className="text-foreground">{value}</span></div>
}

function EmptyState({ title, description, action, compact = false }: { title: string; description: string; action?: { href: string; label: string }; compact?: boolean }) {
    return (
        <div className={cn("border border-dashed bg-background/35 p-5 text-sm", compact && "p-3")}>
            <div className="flex items-start gap-3">
                <Flag className="mt-0.5 size-4 text-muted-foreground" />
                <div className="space-y-1">
                    <p className="font-medium text-foreground">{title}</p>
                    <p className="leading-6 text-muted-foreground">{description}</p>
                    {action ? <Button asChild size="sm" variant="outline" className="mt-2 rounded-none"><Link href={action.href}>{action.label}</Link></Button> : null}
                </div>
            </div>
        </div>
    )
}

function LoadingList({ rows = 3 }: { rows?: number }) {
    return <div className="space-y-3">{Array.from({ length: rows }).map((_, index) => <Skeleton key={index} className="h-20 w-full rounded-none" />)}</div>
}

function onlyEarnedAchievements(items: ProfileHubItem[]) {
    return items.filter((item) => Boolean(item.unlocked_at || item.created_at || item.meta?.unlocked_at))
}

function pinKey(item: ProfileHubItem) {
    const payload = toPinPayload(item)
    return payload ? `${payload.pinnable_type}:${payload.pinnable_id}` : `${item.type}:${item.id}`
}

function toPinPayload(item: ProfileHubItem): Omit<PinPayload, "position"> | null {
    const type = item.type === "question" ? "issue_question" : item.type === "answer" ? "issue_answer" : item.type
    if (["publication", "issue_question", "issue_answer", "code_snippet", "user_file"].includes(type)) {
        return { pinnable_type: type as PinPayload["pinnable_type"], pinnable_id: item.id }
    }
    return null
}

function formatDate(value?: string | null, options?: Intl.DateTimeFormatOptions) {
    if (!value) return "недавно"
    try {
        return new Intl.DateTimeFormat("ru-RU", options || { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
    } catch {
        return value
    }
}

function sizeLabel(value?: number | null) {
    if (!value) return "0 Б"
    if (value < 1024) return `${value} Б`
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} КБ`
    return `${(value / 1024 / 1024).toFixed(1)} МБ`
}

function visibilityLabel(value: string) {
    return value === "public" ? "публично" : value === "private" ? "приватно" : value
}

function normalizeUrl(value?: string | null) {
    if (!value) return null
    return value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`
}
