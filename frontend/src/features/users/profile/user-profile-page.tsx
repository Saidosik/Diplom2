"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  AlertCircle,
  BadgeCheck,
  Bell,
  BellOff,
  CalendarDays,
  Copy,
  Code2,
  Loader2,
  Mail,
  MoreHorizontal,
  Pin,
  RefreshCw,
  Settings,
  Share2,
  Shield,
  UserPlus,
  UserX,
  X,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserAvatar } from "@/features/users/components/user-avatar"
import { ReportDialog } from "@/features/interactions/components/report-dialog"
import { acceptFriendRequest, cancelFriendRequest, declineFriendRequest, sendFriendRequest } from "@/features/social/api"
import { subscribeToTarget, unsubscribeFromTarget } from "@/features/community/api"
import { cn } from "@/lib/utils"
import { formatPublicationDate } from "@/features/publications/lib/publication-labels"
import { getUserProfileDashboard, getUserProfileSection, openProfileMessage, unpinProfileItem } from "./user-profile-api"
import type { UserProfileDashboard, UserProfileHubItem, UserProfileTab } from "./user-profile-types"

type UserProfilePageProps = {
  user: string
  currentUserId?: number | null
  previewAsGuest?: boolean
}

const tabs: Array<{ value: UserProfileTab; label: string }> = [
  { value: "overview", label: "Обзор" },
  { value: "publications", label: "Публикации" },
  { value: "questions", label: "Вопросы" },
  { value: "answers", label: "Ответы" },
  { value: "snippets", label: "Сниппеты" },
  { value: "files", label: "Файлы" },
  { value: "activity", label: "Активность" },
  { value: "reputation", label: "Репутация" },
]

export function UserProfilePage({ user, currentUserId, previewAsGuest = false }: UserProfilePageProps) {
  const query = useQuery({
    queryKey: ["user-profile-dashboard", user, previewAsGuest ? "guest" : "viewer"],
    queryFn: () => getUserProfileDashboard(user, { asGuest: previewAsGuest }),
  })

  if (query.isLoading) return <UserProfileSkeleton />

  if (query.isError || !query.data?.user?.id) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <Alert variant="destructive" className="rounded-none">
          <AlertCircle className="size-4" />
          <AlertTitle>Профиль не загрузился</AlertTitle>
          <AlertDescription>Пользователь не найден или профиль недоступен.</AlertDescription>
        </Alert>
        <Button variant="outline" className="rounded-none" onClick={() => query.refetch()}>
          <RefreshCw className="size-4" /> Повторить
        </Button>
      </div>
    )
  }

  const dashboard = query.data
  const isOwner = !previewAsGuest && (dashboard.relation_state.is_owner || Number(currentUserId) === Number(dashboard.user.id))
  const isAuthenticated = Boolean(currentUserId) && !previewAsGuest

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      {previewAsGuest ? (
        <Alert className="rounded-none border-primary/30 bg-primary/5">
          <AlertCircle className="size-4" />
          <AlertTitle>Просмотр как гость</AlertTitle>
          <AlertDescription>Показываем публичную версию профиля без ваших owner-действий.</AlertDescription>
        </Alert>
      ) : null}
      <UserProfileHero dashboard={dashboard} isOwner={isOwner} userParam={user} isAuthenticated={isAuthenticated} />
      <UserProfilePinnedSection dashboard={dashboard} userParam={user} isOwner={isOwner} />
      <UserProfileTabs dashboard={dashboard} userParam={user} isOwner={isOwner} />
    </div>
  )
}

function UserProfileHero({ dashboard, isOwner, userParam, isAuthenticated }: { dashboard: UserProfileDashboard; isOwner: boolean; userParam: string; isAuthenticated: boolean }) {
  const { user, stats, relation_state: relation } = dashboard
  const role = user.role && user.role !== "user" ? user.role : "участник"

  return (
    <Card className="overflow-hidden rounded-none border bg-card/90 shadow-sm">
      <div className="h-28 border-b bg-muted/40 md:h-36">
        {user.cover_url ? <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={user.cover_url} alt="Обложка профиля" className="h-full w-full object-cover" />
        </> : <div className="h-full w-full bg-[linear-gradient(135deg,hsl(var(--muted)),hsl(var(--background)))]" />}
      </div>
      <CardContent className="space-y-5 p-4 md:p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <UserAvatar user={{ name: user.name, avatar: user.avatar, avatar_url: user.avatar_url }} size="xl" className="-mt-12 border-4 border-background bg-background" />
            <div className="min-w-0 space-y-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{user.name}</h1>
                  <Badge variant="secondary" className="rounded-none"><Shield className="size-3" />{role}</Badge>
                  {user.is_online || user.presence_status === "online" ? <Badge className="rounded-none bg-emerald-600">online</Badge> : null}
                </div>
                {user.username ? <p className="text-sm text-muted-foreground">@{user.username}</p> : null}
                {user.headline ? <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{user.headline}</p> : null}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />На платформе с {formatDate(user.created_at)}</span>
                {user.direction ? <span>{user.direction}</span> : null}
                {relation.mutual_friends_count ? <span>{relation.mutual_friends_count} общих друзей</span> : null}
              </div>
            </div>
          </div>
          <UserProfileActions dashboard={dashboard} isOwner={isOwner} userParam={userParam} isAuthenticated={isAuthenticated} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <Stat label="репутация" value={stats.reputation} />
          <Stat label="публикаций" value={stats.publications_count} />
          <Stat label="вопросов" value={stats.questions_count} />
          <Stat label="ответов" value={stats.answers_count} />
          <Stat label="подписчиков" value={stats.followers} />
          <Stat label="друзей" value={stats.friends} />
        </div>
      </CardContent>
    </Card>
  )
}

function UserProfileActions({ dashboard, isOwner, userParam, isAuthenticated }: { dashboard: UserProfileDashboard; isOwner: boolean; userParam: string; isAuthenticated: boolean }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const user = dashboard.user
  const relation = dashboard.relation_state
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["user-profile-dashboard", userParam] })
    queryClient.invalidateQueries({ queryKey: ["user-profile-dashboard", userParam, "viewer"] })
    queryClient.invalidateQueries({ queryKey: ["user-profile-dashboard", userParam, "guest"] })
  }

  const messageMutation = useMutation({
    mutationFn: () => openProfileMessage(user.id),
    onSuccess: (chat) => router.push(chat.url || `/chats?conversation=${chat.id}`),
    onError: () => toast.error("Не удалось открыть чат"),
  })
  const friendMutation = useMutation({
    mutationFn: async (action?: "decline") => {
      if (action === "decline" && relation.incoming_friend_request_id) return declineFriendRequest(relation.incoming_friend_request_id)
      if (relation.incoming_friend_request_id) return acceptFriendRequest(relation.incoming_friend_request_id)
      if (relation.outgoing_friend_request_id) return cancelFriendRequest(relation.outgoing_friend_request_id)
      return sendFriendRequest({ recipient_id: user.id })
    },
    onSuccess: () => { toast.success("Статус дружбы обновлён"); invalidate() },
    onError: () => toast.error("Не удалось изменить статус дружбы"),
  })
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (relation.is_subscribed || relation.is_following) {
        await unsubscribeFromTarget("user", user.id)
        return null
      }
      return subscribeToTarget("user", user.id)
    },
    onSuccess: () => { toast.success(relation.is_subscribed || relation.is_following ? "Подписка удалена" : "Подписка добавлена"); invalidate() },
    onError: () => toast.error("Не удалось изменить подписку"),
  })

  if (isOwner) {
    return (
      <div className="flex flex-wrap gap-2 lg:justify-end">
        <Button asChild className="rounded-none"><Link href="/settings"><Settings className="size-4" />Редактировать профиль</Link></Button>
        <Button asChild variant="outline" className="rounded-none"><Link href="/profile">Управлять закрепами</Link></Button>
        <Button asChild variant="secondary" className="rounded-none"><Link href={`/user/${user.id}?preview=guest`}>Посмотреть как гость</Link></Button>
      </div>
    )
  }

  const friendLabel = relation.incoming_friend_request_id ? "Принять заявку" : relation.outgoing_friend_request_id ? "Отменить заявку" : relation.is_friend ? "В друзьях" : "Добавить"
  const subscribed = Boolean(relation.is_subscribed || relation.is_following)

  return (
    <div className="flex flex-wrap gap-2 lg:justify-end">
      {relation.can_message ? <Button className="rounded-none" onClick={() => messageMutation.mutate()} disabled={messageMutation.isPending}>{messageMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}Написать</Button> : null}
      {isAuthenticated ? (
        <>
          <Button variant="outline" className="rounded-none" onClick={() => friendMutation.mutate(undefined)} disabled={friendMutation.isPending || relation.is_friend}>{friendMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}{friendLabel}</Button>
          <Button variant={subscribed ? "secondary" : "outline"} className="rounded-none" onClick={() => subscribeMutation.mutate()} disabled={subscribeMutation.isPending}>{subscribed ? <BellOff className="size-4" /> : <Bell className="size-4" />}{subscribed ? "Отписаться" : "Подписаться"}</Button>
        </>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-none"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-none">
          <DropdownMenuItem onClick={() => copyProfileLink(user.id)}><Share2 className="size-4" />Поделиться</DropdownMenuItem>
          <DropdownMenuItem onClick={() => copyProfileLink(user.id)}><Copy className="size-4" />Скопировать ссылку</DropdownMenuItem>
          {relation.incoming_friend_request_id && isAuthenticated ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => friendMutation.mutate("decline")} disabled={friendMutation.isPending}>
                <UserX className="size-4" />Отклонить заявку
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {relation.can_report ? <ReportDialog targetType="user" targetId={user.id} label="Пожаловаться" isAuthenticated={isAuthenticated} /> : null}
    </div>
  )
}

function UserProfilePinnedSection({ dashboard, userParam, isOwner }: { dashboard: UserProfileDashboard; userParam: string; isOwner: boolean }) {
  const queryClient = useQueryClient()
  const unpinMutation = useMutation({
    mutationFn: (item: UserProfileHubItem) => unpinProfileItem({ pinnable_type: item.type, pinnable_id: item.id }),
    onSuccess: () => { toast.success("Закреп удалён"); queryClient.invalidateQueries({ queryKey: ["user-profile-dashboard", userParam] }) },
    onError: () => toast.error("Не удалось удалить закреп"),
  })
  const pins = dashboard.pins.slice(0, 5)
  return (
    <Card className="rounded-none border bg-card/80">
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><Pin className="size-4 text-primary" />Закреплено</CardTitle>
        {isOwner ? <Button asChild variant="outline" size="sm" className="rounded-none"><Link href="/profile">Управлять</Link></Button> : null}
      </CardHeader>
      <CardContent>
        {pins.length === 0 ? <UserProfileEmptyState title="Пока нет закреплённых материалов" description={isOwner ? "Закрепи важные публикации, вопросы, сниппеты или файлы в своём профиле." : "Участник ещё не выбрал материалы для витрины."} /> : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pins.map((item) => <UserProfileMaterialCard key={`${item.type}-${item.id}`} item={item} compact action={isOwner ? <Button variant="ghost" size="icon-sm" onClick={() => unpinMutation.mutate(item)} disabled={unpinMutation.isPending}><X className="size-4" /></Button> : null} />)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function UserProfileTabs({ dashboard, userParam, isOwner }: { dashboard: UserProfileDashboard; userParam: string; isOwner: boolean }) {
  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-none border bg-card/70 p-1">
        {tabs.map((tab) => <TabsTrigger key={tab.value} value={tab.value} className="rounded-none whitespace-nowrap">{tab.label}</TabsTrigger>)}
      </TabsList>
      <TabsContent value="overview"><UserProfileOverview dashboard={dashboard} isOwner={isOwner} /></TabsContent>
      {tabs.filter((tab) => tab.value !== "overview").map((tab) => <TabsContent key={tab.value} value={tab.value}><UserProfileSection userParam={userParam} tab={tab.value} fallback={fallbackForTab(dashboard, tab.value)} /></TabsContent>)}
    </Tabs>
  )
}

function UserProfileOverview({ dashboard }: { dashboard: UserProfileDashboard; isOwner: boolean }) {
  const user = dashboard.user
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <Card className="rounded-none"><CardHeader><CardTitle>О себе</CardTitle></CardHeader><CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">{user.bio ? <p>{user.bio}</p> : <UserProfileEmptyState title="Описание не заполнено" description="Здесь появится краткая информация об участнике." />}{user.direction || user.location ? <div className="flex flex-wrap gap-2">{user.direction ? <Badge variant="secondary" className="rounded-none">{user.direction}</Badge> : null}{user.location ? <Badge variant="outline" className="rounded-none">{user.location}</Badge> : null}</div> : null}<ProfileLinks user={user} /></CardContent></Card>
        <CardList title="Последние материалы" items={[...dashboard.previews.latest_publications, ...dashboard.previews.latest_questions, ...dashboard.previews.latest_answers].slice(0, 5)} />
      </div>
      <div className="space-y-4">
        <CardList title="Достижения" items={dashboard.previews.achievements_preview} />
        <CardList title="Активность" items={dashboard.previews.activity_preview} />
        <Card className="rounded-none"><CardHeader><CardTitle>Репутация</CardTitle></CardHeader><CardContent><div className="text-3xl font-semibold text-primary">{dashboard.reputation?.score ?? dashboard.stats.reputation ?? 0}</div><p className="text-sm text-muted-foreground">Сводка вклада участника в сообщество.</p></CardContent></Card>
      </div>
    </div>
  )
}

function UserProfileSection({ userParam, tab, fallback }: { userParam: string; tab: UserProfileTab; fallback: UserProfileHubItem[] }) {
  const query = useQuery({ queryKey: ["user-profile-section", userParam, tab], queryFn: () => getUserProfileSection(userParam, tab), enabled: tab !== "overview", retry: false })
  const items = query.data ?? fallback
  if (query.isLoading && fallback.length === 0) return <SectionSkeleton />
  if (query.isError) return <Alert className="rounded-none"><AlertCircle className="size-4" /><AlertTitle>Раздел недоступен</AlertTitle><AlertDescription>Данные скрыты настройками приватности или временно не загрузились.</AlertDescription></Alert>
  if (items.length === 0) return <UserProfileEmptyState title="Раздел пуст" description="Здесь пока нет публичных данных." />
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <UserProfileMaterialCard key={`${tab}-${item.type}-${item.id}`} item={item} />)}</div>
}

function UserProfileMaterialCard({ item, compact = false, action }: { item: UserProfileHubItem; compact?: boolean; action?: React.ReactNode }) {
  const href = normalizeHref(item.url, item.type, item.id)
  return (
    <Card className="group rounded-none border bg-card/80 transition-colors hover:border-primary/45">
      <CardContent className={cn("space-y-3 p-4", compact && "p-3")}>
        <div className="flex items-start justify-between gap-2"><Badge variant="secondary" className="rounded-none">{typeLabel(item.type)}</Badge>{action}</div>
        <div className="space-y-1"><h3 className="line-clamp-2 font-medium tracking-tight"><Link href={href} className="hover:text-primary">{item.title || "Без названия"}</Link></h3>{item.description || item.excerpt ? <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{item.description || item.excerpt}</p> : null}</div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{item.created_at ? <span>{formatDate(item.created_at)}</span> : null}{item.language ? <span>{item.language}</span> : null}{item.kind ? <span>{item.kind}</span> : null}</div>
      </CardContent>
    </Card>
  )
}

function CardList({ title, items }: { title: string; items: UserProfileHubItem[] }) {
  return <Card className="rounded-none"><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="space-y-3">{items.length === 0 ? <UserProfileEmptyState title="Пока пусто" description="Данные появятся после активности участника." /> : items.map((item) => <UserProfileMaterialCard key={`${title}-${item.type}-${item.id}`} item={item} compact />)}</CardContent></Card>
}

function ProfileLinks({ user }: { user: UserProfileDashboard["user"] }) {
  const links = [{ label: "Сайт", href: user.website_url }, { label: "GitHub", href: user.github_url, icon: Code2 }, { label: "Telegram", href: user.telegram_url },].filter((link) => link.href)
  if (links.length === 0) return null
  return <div className="flex flex-wrap gap-2">{links.map(({ label, href, icon: Icon }) => <Button key={label} asChild variant="outline" size="sm" className="rounded-none"><a href={href ?? "#"} target="_blank" rel="noreferrer">{Icon ? <Icon className="size-4" /> : null}{label}</a></Button>)}</div>
}

function Stat({ label, value }: { label: string; value?: number }) { return <div className="border bg-muted/20 p-3"><div className="text-lg font-semibold text-primary">{value ?? 0}</div><p className="text-xs text-muted-foreground">{label}</p></div> }
function UserProfileEmptyState({ title, description }: { title: string; description: string }) { return <div className="rounded-none border border-dashed bg-muted/10 p-6 text-center"><div className="mx-auto mb-2 flex size-9 items-center justify-center bg-muted"><BadgeCheck className="size-4 text-muted-foreground" /></div><p className="font-medium">{title}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></div> }
function UserProfileSkeleton() { return <div className="mx-auto w-full max-w-7xl space-y-4"><Skeleton className="h-72 rounded-none" /><div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-40 rounded-none" /><Skeleton className="h-40 rounded-none" /><Skeleton className="h-40 rounded-none" /></div></div> }
function SectionSkeleton() { return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-none" />)}</div> }
function fallbackForTab(d: UserProfileDashboard, tab: UserProfileTab) { if (tab === "publications") return d.previews.latest_publications; if (tab === "questions") return d.previews.latest_questions; if (tab === "answers") return d.previews.latest_answers; if (tab === "snippets") return d.snippets ?? d.previews.snippets_preview; if (tab === "files") return d.files ?? d.previews.files_preview; if (tab === "activity") return d.activity ?? d.previews.activity_preview; if (tab === "reputation") return d.reputation?.events ?? []; return [] }
function formatDate(value?: string | null) { return value ? formatPublicationDate(value) : "дата неизвестна" }
function typeLabel(type: string) { return ({ publication: "Публикация", issue_question: "Вопрос", issue_answer: "Ответ", code_snippet: "Сниппет", user_file: "Файл", achievement: "Достижение" } as Record<string, string>)[type] ?? type }
function normalizeHref(url: string | null | undefined, type: string, id: number) { if (url) return url.startsWith("/questions/") ? url.replace("/questions/", "/questions/") : url; if (type === "user_file") return `/files/${id}`; if (type === "code_snippet") return `/playground?snippet=${id}`; return "#" }
function copyProfileLink(userId: number) { const href = `${window.location.origin}/user/${userId}`; void navigator.clipboard?.writeText(href); toast.success("Ссылка на профиль скопирована") }
