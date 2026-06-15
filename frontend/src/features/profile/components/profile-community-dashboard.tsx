"use client"

import * as React from "react"
import Link from "next/link"
import { Award, Bookmark, CalendarDays, CheckCircle2, Circle, CircleHelp, ExternalLink, FileText, Flame, Globe2, Heart, Mail, MapPin, MessageSquare, Newspaper, Pencil, Plus, Search, Settings, Share2, Sparkles, Trophy } from "lucide-react"

import type { User } from "@/features/auth/types"
import type { Publication } from "@/features/publications/types"
import type { IssueAnswer, IssueQuestion } from "@/features/issues/types"
import type { CommentItem, SavedItem, SavedTargetType } from "@/features/interactions/types"
import { getUserRoleLabel, formatProfileDate } from "@/features/users/lib/user-display"
import { UserAvatar } from "@/features/users/components/user-avatar"
import { SubscribeButton } from "@/features/community/components/subscribe-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type ProfileStats = {
  reputation: number
  publications: number
  questions: number
  answers: number
  comments: number
  acceptedAnswers?: number
  likes: number
  saved?: number
}

type ActivityEvent = {
  id: string
  type: "publication" | "question" | "answer" | "comment" | "reputation"
  title: string
  description?: string
  href?: string
  date?: string | null
  score?: number
}

type Achievement = { title: string; description: string; unlocked: boolean }

export type ProfileCommunityDashboardProps = {
  isOwnProfile: boolean
  user: User
  isAuthenticated?: boolean
  stats: ProfileStats
  publications: Publication[]
  questions: IssueQuestion[]
  answers: IssueAnswer[]
  comments: CommentItem[]
  savedItems?: SavedItem[]
  loading?: boolean
  canViewFullProfile?: boolean
}

function normalizeUrl(url?: string | null) {
  if (!url) return null
  return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`
}

function formatDate(value?: string | null) {
  if (!value) return "недавно"
  try { return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value)) } catch { return value }
}

function getBlockText(blocks?: Array<{ content?: Record<string, unknown> }>) {
  const block = blocks?.find((item) => typeof item.content?.text === "string" || typeof item.content?.code === "string")
  const value = block?.content?.text ?? block?.content?.code
  return typeof value === "string" ? value : "Краткое описание пока отсутствует."
}

function getProfileCompletion(user: User) {
  const steps = [
    { label: "Имя указано", done: Boolean(user.name), weight: 10 },
    { label: "Email подтверждён", done: Boolean(user.is_email_verified || user.email_verified_at), weight: 10 },
    { label: "Добавить аватар", done: Boolean(user.avatar_url || user.avatar), weight: 10 },
    { label: "Заполнить bio", done: Boolean(user.bio), weight: 15 },
    { label: "Указать направление", done: Boolean(user.headline), weight: 15 },
    { label: "Указать город или ссылку", done: Boolean(user.location || user.website_url || user.github_url), weight: 20 },
    { label: "Добавить GitHub/сайт", done: Boolean(user.website_url || user.github_url), weight: 20 },
  ]
  return { steps, value: steps.reduce((sum, step) => sum + (step.done ? step.weight : 0), 0) }
}

function deriveSkills(user: User, publications: Publication[], questions: IssueQuestion[]) {
  const values = new Map<string, string>()
  ;[...publications.flatMap((item) => item.tags || []), ...questions.flatMap((item) => item.tags || [])].forEach((tag) => values.set(tag.slug || tag.name, tag.name))
  if (user.headline) user.headline.split(/[\/|,;•]+/).map((part) => part.trim()).filter(Boolean).slice(0, 4).forEach((part) => values.set(part.toLowerCase(), part))
  return Array.from(values.values()).slice(0, 12)
}

function deriveEvents(publications: Publication[], questions: IssueQuestion[], answers: IssueAnswer[], comments: CommentItem[], user: User): ActivityEvent[] {
  const events: ActivityEvent[] = [
    ...publications.map((item) => ({ id: `p-${item.id}`, type: "publication" as const, title: `Опубликован материал «${item.title}»`, description: item.excerpt || undefined, href: `/publications/${item.slug}`, date: item.published_at || item.created_at, score: (item.likes_count || 0) + (item.comments_count || 0) + (item.saved_count || 0) })),
    ...questions.map((item) => ({ id: `q-${item.id}`, type: "question" as const, title: `Задан вопрос «${item.title}»`, description: item.excerpt || undefined, href: `/questions/${item.slug}`, date: item.published_at || item.created_at, score: (item.likes_count || 0) + (item.answers_count || 0) + (item.views_count || 0) })),
    ...answers.map((item) => ({ id: `a-${item.id}`, type: "answer" as const, title: `Ответ на вопрос «${item.question?.title || "без названия"}»`, description: getBlockText(item.blocks), href: item.question?.slug ? `/questions/${item.question.slug}#answer-${item.id}` : "/questions", date: item.created_at, score: (item.comments_count || 0) + (item.is_accepted ? 10 : 0) })),
    ...comments.map((item) => ({ id: `c-${item.id}`, type: "comment" as const, title: item.target?.title ? `Комментарий к «${item.target.title}»` : "Комментарий в сообществе", description: item.content, href: item.target?.href || undefined, date: item.created_at, score: 0 })),
  ]
  if ((user.reputation_score || 0) > 0) events.push({ id: "rep", type: "reputation", title: `Получено ${user.reputation_score} репутации`, date: user.updated_at || user.created_at, score: user.reputation_score })
  return events.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
}

function deriveAchievements(stats: ProfileStats, completion: number): Achievement[] {
  return [
    { title: "Новичок", description: "Профиль создан на платформе", unlocked: true },
    { title: "Первый шаг", description: "Есть публикация, вопрос или ответ", unlocked: stats.publications + stats.questions + stats.answers > 0 },
    { title: "Автор", description: "Опубликован первый материал", unlocked: stats.publications > 0 },
    { title: "Помощник", description: "Есть ответы в Q&A", unlocked: stats.answers > 0 },
    { title: "Активный участник", description: "Есть комментарии или несколько действий", unlocked: stats.comments > 0 || stats.publications + stats.questions + stats.answers >= 3 },
    { title: "Профиль заполнен", description: "Заполненность профиля от 80%", unlocked: completion >= 80 },
  ]
}

function bestContent(publications: Publication[], questions: IssueQuestion[], answers: IssueAnswer[]) {
  const items = [
    ...publications.map((item) => ({ id: `p-${item.id}`, label: "Публикация", title: item.title, href: `/publications/${item.slug}`, score: (item.likes_count || 0) * 3 + (item.comments_count || 0) + (item.saved_count || 0) * 2, meta: `${item.likes_count || 0} лайков · ${item.comments_count || 0} комментариев` })),
    ...questions.map((item) => ({ id: `q-${item.id}`, label: "Вопрос", title: item.title, href: `/questions/${item.slug}`, score: (item.likes_count || 0) * 3 + (item.answers_count || 0) * 2 + (item.views_count || 0), meta: `${item.answers_count || 0} ответов · ${item.views_count || 0} просмотров` })),
    ...answers.map((item) => ({ id: `a-${item.id}`, label: item.is_accepted ? "Принятый ответ" : "Ответ", title: item.question?.title || "Ответ на вопрос", href: item.question?.slug ? `/questions/${item.question.slug}#answer-${item.id}` : "/questions", score: (item.comments_count || 0) + (item.is_accepted ? 100 : 0), meta: `${item.comments_count || 0} комментариев` })),
  ]
  return items.sort((a, b) => b.score - a.score).slice(0, 5)
}

export function ProfileCommunityDashboard(props: ProfileCommunityDashboardProps) {
  const { isOwnProfile, user, stats, publications, questions, answers, comments, savedItems = [], loading, canViewFullProfile = true } = props
  const completion = getProfileCompletion(user)
  const skills = deriveSkills(user, publications, questions)
  const events = deriveEvents(publications, questions, answers, comments, user)
  const achievements = deriveAchievements(stats, completion.value)
  const best = bestContent(publications, questions, answers)
  const githubUrl = normalizeUrl(user.github_url)
  const websiteUrl = normalizeUrl(user.website_url)
  const tabs = isOwnProfile ? ["overview", "activity", "saved", "reputation"] : ["overview", "publications", "questions", "answers", "activity", "reputation"]
  const [tab, setTab] = React.useState(tabs[0])

  return <div className="space-y-6">
    <ProfileHeroBlock isOwnProfile={isOwnProfile} user={user} stats={stats} skills={skills} isAuthenticated={props.isAuthenticated} />
    {!canViewFullProfile ? <Card className="border-amber-500/30 bg-amber-500/5"><CardContent className="p-5 text-sm text-muted-foreground">Пользователь ограничил доступ к активности. Публично доступна только краткая информация профиля.</CardContent></Card> : null}
    <ProfileStatsRow stats={stats} isOwnProfile={isOwnProfile} />
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <main className="min-w-0">
        <Tabs value={tab} onValueChange={setTab} className="space-y-5">
          <TabsList variant="line" className="w-full justify-start overflow-x-auto"><TabsTrigger value="overview">Обзор</TabsTrigger>{!isOwnProfile && <><TabsTrigger value="publications">Публикации</TabsTrigger><TabsTrigger value="questions">Вопросы</TabsTrigger><TabsTrigger value="answers">Ответы</TabsTrigger></>}<TabsTrigger value="activity">Активность</TabsTrigger>{isOwnProfile && <TabsTrigger value="saved">Сохранённое</TabsTrigger>}<TabsTrigger value="reputation">Репутация</TabsTrigger></TabsList>
          <TabsContent value="overview" className="space-y-5"><BestContent items={best} isOwnProfile={isOwnProfile} /><ActivityTimeline events={events.slice(0, 6)} loading={loading} isOwnProfile={isOwnProfile} /><InfoCard user={user} isOwnProfile={isOwnProfile} /></TabsContent>
          {!isOwnProfile && <><TabsContent value="publications"><Materials items={publications} type="publication" /></TabsContent><TabsContent value="questions"><Materials items={questions} type="question" /></TabsContent><TabsContent value="answers"><Materials items={answers} type="answer" /></TabsContent></>}
          <TabsContent value="activity" className="space-y-5"><ActivityHeatmap events={events} /><ActivityTimeline events={events} loading={loading} isOwnProfile={isOwnProfile} /></TabsContent>
          {isOwnProfile && <TabsContent value="saved"><SavedMaterials items={savedItems} /></TabsContent>}
          <TabsContent value="reputation"><ReputationBlock user={user} events={events.filter((event) => event.type === "reputation")} /></TabsContent>
        </Tabs>
      </main>
      <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
        {isOwnProfile && <CompletionCard completion={completion} />}
        <SkillsCard skills={skills} isOwnProfile={isOwnProfile} />
        <BadgesCard achievements={achievements} />
        <LinksCard user={user} githubUrl={githubUrl} websiteUrl={websiteUrl} isOwnProfile={isOwnProfile} />
      </aside>
    </div>
  </div>
}

function ProfileHeroBlock({ isOwnProfile, user, stats, skills, isAuthenticated }: { isOwnProfile: boolean; user: User; stats: ProfileStats; skills: string[]; isAuthenticated?: boolean }) {
  const githubUrl = normalizeUrl(user.github_url)
  return <section className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm md:p-8"><div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent" /><div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div className="flex min-w-0 flex-col gap-5 sm:flex-row"><UserAvatar user={user} size="xl" className="border shadow-sm" /><div className="min-w-0 space-y-3"><div><h1 className="text-3xl font-semibold tracking-tight">{user.name}</h1><p className="text-sm text-muted-foreground">{user.headline || (isOwnProfile ? "Участник сообщества программистов" : "Участник IT-сообщества")}</p></div>{user.bio && <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{user.bio}</p>}<div className="flex flex-wrap gap-2 text-sm text-muted-foreground"><Badge variant="secondary">{getUserRoleLabel(user.role)}</Badge><Badge variant="outline"><Trophy className="mr-1 size-3.5" />{user.reputation_level?.label || "Новичок"}</Badge><span className="inline-flex items-center gap-1"><CalendarDays className="size-4" />На платформе с {formatProfileDate(user.created_at)}</span></div><div className="flex flex-wrap gap-2 text-sm"><span>Репутация <b>{user.reputation_score || 0}</b></span><span>· Публикации <b>{stats.publications}</b></span><span>· Вопросы <b>{stats.questions}</b></span><span>· Ответы <b>{stats.answers}</b></span></div>{skills.length > 0 && <div className="flex flex-wrap gap-2">{skills.slice(0, 6).map((skill) => <Badge key={skill} variant="outline">#{skill}</Badge>)}</div>}</div></div><div className="flex flex-wrap gap-2 lg:justify-end">{isOwnProfile ? <><Button asChild><Link href="/settings#profile-settings"><Pencil className="size-4" />Редактировать профиль</Link></Button><Button variant="outline" asChild><Link href="/publications/create"><Plus className="size-4" />Создать публикацию</Link></Button><Button variant="outline" asChild><Link href="/questions/create">Задать вопрос</Link></Button><Button variant="ghost" asChild><Link href="/settings"><Settings className="size-4" />Настройки</Link></Button></> : <><SubscribeButton type="user" id={user.id} label="Подписаться" activeLabel="В подписках" disabled={!isAuthenticated} />{githubUrl && <Button variant="outline" asChild><a href={githubUrl} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />GitHub</a></Button>}<Button variant="ghost" type="button" onClick={() => navigator.clipboard?.writeText(window.location.href)}><Share2 className="size-4" />Поделиться</Button></>}</div></div></section>
}

function ProfileStatsRow({ stats, isOwnProfile }: { stats: ProfileStats; isOwnProfile: boolean }) { const list = [[Trophy,"Репутация",stats.reputation],[Newspaper,"Публикации",stats.publications],[CircleHelp,"Вопросы",stats.questions],[MessageSquare,"Ответы",stats.answers],[FileText,"Комментарии",stats.comments],[Heart,"Лайки",stats.likes], ...(isOwnProfile ? [[Bookmark,"Сохранения",stats.saved || 0] as const] : [])] as const; return <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">{list.map(([Icon,label,value]) => <Card key={label} className="bg-card/80"><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-semibold">{value}</p></div><Icon className="size-4 text-primary" /></CardContent></Card>)}</section> }
function CompletionCard({ completion }: { completion: ReturnType<typeof getProfileCompletion> }) { const next = completion.steps.find((s) => !s.done); return <Card><CardHeader><CardTitle>Заполненность профиля: {completion.value}%</CardTitle><CardDescription>{next ? `Следующий шаг: ${next.label} (+${next.weight}%)` : "Профиль выглядит готовым для сообщества."}</CardDescription></CardHeader><CardContent className="space-y-3"><Progress value={completion.value} />{completion.steps.map((step) => <div key={step.label} className="flex items-center justify-between gap-2 text-sm"><span className="inline-flex items-center gap-2">{step.done ? <CheckCircle2 className="size-4 text-primary" /> : <Circle className="size-4 text-muted-foreground" />}{step.label}</span><span className="text-xs text-muted-foreground">+{step.weight}%</span></div>)}<Button className="w-full" asChild><Link href="/settings#profile-settings">Заполнить профиль</Link></Button></CardContent></Card> }
function SkillsCard({ skills, isOwnProfile }: { skills: string[]; isOwnProfile: boolean }) { if (!skills.length && !isOwnProfile) return null; return <Card><CardHeader><CardTitle>Навыки и интересы</CardTitle></CardHeader><CardContent>{skills.length ? <div className="flex flex-wrap gap-2">{skills.map((s) => <Badge key={s} variant="outline">#{s}</Badge>)}</div> : <EmptyMini text="Навыки пока не указаны." action={isOwnProfile ? "/settings#profile-settings" : undefined} />}</CardContent></Card> }
function BadgesCard({ achievements }: { achievements: Achievement[] }) { return <Card><CardHeader><CardTitle>Достижения</CardTitle><CardDescription>Бейджи вычислены из доступной активности профиля.</CardDescription></CardHeader><CardContent className="grid gap-2">{achievements.map((a) => <div key={a.title} title={a.description} className={cn("rounded-xl border p-3 text-sm", a.unlocked ? "bg-primary/5 border-primary/30" : "bg-muted/20 opacity-60")}><div className="flex items-center gap-2 font-medium"><Award className="size-4 text-primary" />{a.title}</div><p className="mt-1 text-xs text-muted-foreground">{a.description}</p></div>)}</CardContent></Card> }
function LinksCard({ user, githubUrl, websiteUrl, isOwnProfile }: { user: User; githubUrl: string | null; websiteUrl: string | null; isOwnProfile: boolean }) { return <Card><CardHeader><CardTitle>Публичные ссылки</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{user.location && <p className="flex items-center gap-2"><MapPin className="size-4" />{user.location}</p>}{websiteUrl && <Button variant="outline" className="w-full justify-start" asChild><a href={websiteUrl} target="_blank" rel="noreferrer"><Globe2 className="size-4" />Сайт</a></Button>}{githubUrl && <Button variant="outline" className="w-full justify-start" asChild><a href={githubUrl} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />GitHub</a></Button>}{!websiteUrl && !githubUrl && <EmptyMini text={isOwnProfile ? "Добавьте GitHub или сайт." : "Публичные ссылки не указаны."} action={isOwnProfile ? "/settings#profile-settings" : undefined} />}</CardContent></Card> }
function BestContent({ items, isOwnProfile }: { items: ReturnType<typeof bestContent>; isOwnProfile: boolean }) { return <Card><CardHeader><CardTitle>Лучшие материалы</CardTitle><CardDescription>Сортировка по доступным метрикам: лайки, комментарии, сохранения, ответы и просмотры.</CardDescription></CardHeader><CardContent className="space-y-3">{items.length ? items.map((item) => <Link key={item.id} href={item.href} className="block rounded-xl border bg-muted/20 p-4 transition-colors hover:border-primary/40"><Badge variant="secondary">{item.label}</Badge><h3 className="mt-2 line-clamp-2 font-semibold">{item.title}</h3><p className="mt-1 text-xs text-muted-foreground">{item.meta}</p></Link>) : <EmptyBlock title={isOwnProfile ? "Вы пока ничего не опубликовали" : "Пользователь пока ничего не опубликовал"} description={isOwnProfile ? "Создайте первую публикацию или задайте вопрос." : "Материалы появятся после активности участника."} />}</CardContent></Card> }
function ActivityTimeline({ events, loading, isOwnProfile }: { events: ActivityEvent[]; loading?: boolean; isOwnProfile: boolean }) { return <Card><CardHeader><CardTitle>Последняя активность</CardTitle></CardHeader><CardContent className="space-y-3">{loading ? <div className="text-sm text-muted-foreground">Загружаем активность...</div> : events.length ? events.map((e) => <article key={e.id} className="rounded-xl border bg-muted/20 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">{e.href ? <Link href={e.href} className="hover:text-primary">{e.title}</Link> : e.title}</h3><span className="text-xs text-muted-foreground">{formatDate(e.date)}</span></div>{e.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{e.description}</p>}</article>) : <EmptyBlock title={isOwnProfile ? "Активности пока нет" : "Активности пока нет"} description={isOwnProfile ? "Создайте публикацию, задайте вопрос или ответьте участникам." : "Активность появится, когда участник начнёт взаимодействовать с сообществом."} />}</CardContent></Card> }
function ActivityHeatmap({ events }: { events: ActivityEvent[] }) { const counts = new Map<string, number>(); events.forEach((event) => { if (event.date) counts.set(new Date(event.date).toISOString().slice(0,10), (counts.get(new Date(event.date).toISOString().slice(0,10)) || 0) + 1) }); const days = Array.from({ length: 84 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - (83 - index)); const count = counts.get(date.toISOString().slice(0,10)) || 0; return Math.min(3, count) as 0|1|2|3 }); return <Card><CardHeader><CardTitle>Карта активности</CardTitle><CardDescription>Группировка реальных событий по дням.</CardDescription></CardHeader><CardContent><div className="grid grid-cols-12 gap-1 sm:grid-cols-21">{days.map((i, idx) => <span key={idx} className={cn("size-3 rounded-[3px] border", i===0&&"border-border bg-muted", i===1&&"border-emerald-500/20 bg-emerald-500/25", i===2&&"border-emerald-500/30 bg-emerald-500/50", i===3&&"border-emerald-500/40 bg-emerald-500/80")} />)}</div></CardContent></Card> }
function InfoCard({ user, isOwnProfile }: { user: User; isOwnProfile: boolean }) { return <Card><CardHeader><CardTitle>Информация</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{isOwnProfile && <Info icon={Mail} label="Email" value={user.email} />}<Info icon={Sparkles} label="Роль" value={getUserRoleLabel(user.role)} /><Info icon={Trophy} label="Уровень" value={user.reputation_level?.label || "Новичок"} /><Info icon={CalendarDays} label="Дата регистрации" value={formatProfileDate(user.created_at)} />{user.location && <Info icon={MapPin} label="Город" value={user.location} />}</CardContent></Card> }
function Info({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) { return <div className="rounded-xl border bg-muted/20 p-3"><p className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="size-4" />{label}</p><p className="mt-1 truncate text-sm font-medium">{value}</p></div> }
function ReputationBlock({ user }: { user: User; events: ActivityEvent[] }) { const score = user.reputation_score || 0; const level = user.reputation_level; return <Card className="border-primary/20 bg-primary/5"><CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="size-5 text-primary" />Репутация участника</CardTitle><CardDescription>Текущий рейтинг: {score}. Уровень: {level?.label || "Новичок"}.</CardDescription></CardHeader><CardContent className="space-y-4"><Progress value={level?.progress ?? Math.min(99, score)} /><div className="grid gap-3 sm:grid-cols-3"><Info icon={Newspaper} label="Публикация" value="+10" /><Info icon={MessageSquare} label="Ответ" value="+5" /><Info icon={Heart} label="Лайк" value="+2" /></div></CardContent></Card> }
function Materials({ items, type }: { items: Array<Publication | IssueQuestion | IssueAnswer>; type: "publication"|"question"|"answer" }) { return <Card><CardHeader><CardTitle>{type === "publication" ? "Публикации" : type === "question" ? "Вопросы" : "Ответы"}</CardTitle></CardHeader><CardContent className="grid gap-4 lg:grid-cols-2">{items.length ? items.map((item) => { const title = "title" in item ? item.title : item.question?.title || "Ответ на вопрос"; const href = type === "publication" ? `/publications/${(item as Publication).slug}` : type === "question" ? `/questions/${(item as IssueQuestion).slug}` : (item as IssueAnswer).question?.slug ? `/questions/${(item as IssueAnswer).question?.slug}#answer-${item.id}` : "/questions"; return <Link key={`${type}-${item.id}`} href={href} className="rounded-xl border bg-muted/20 p-4 hover:border-primary/40"><Badge variant="secondary">{type}</Badge><h3 className="mt-2 line-clamp-2 font-semibold">{title}</h3><p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{"excerpt" in item ? item.excerpt : "blocks" in item ? getBlockText(item.blocks) : ""}</p></Link> }) : <div className="lg:col-span-2"><EmptyBlock title="Материалов пока нет" description="Здесь появится публичная активность участника." /></div>}</CardContent></Card> }
function SavedMaterials({ items }: { items: SavedItem[] }) { const [filter, setFilter] = React.useState<SavedTargetType | "all">("all"); const [query, setQuery] = React.useState(""); const visible = items.filter((item) => (filter === "all" || item.saveable_type === filter) && JSON.stringify(item.item || {}).toLowerCase().includes(query.toLowerCase())); return <Card><CardHeader><CardTitle>Сохранённые материалы</CardTitle><CardDescription>Приватный раздел виден только владельцу профиля.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex flex-wrap gap-2"><Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>Все</Button><Button size="sm" variant={filter === "publication" ? "default" : "outline"} onClick={() => setFilter("publication")}>Публикации</Button><Button size="sm" variant={filter === "issue_question" ? "default" : "outline"} onClick={() => setFilter("issue_question")}>Вопросы</Button><Button size="sm" variant={filter === "issue_answer" ? "default" : "outline"} onClick={() => setFilter("issue_answer")}>Ответы</Button><label className="ml-auto flex items-center gap-2 rounded-md border px-3 py-2 text-sm"><Search className="size-4" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск" className="bg-transparent outline-none" /></label></div>{visible.length ? <div className="grid gap-3 lg:grid-cols-2">{visible.map((item) => <div key={item.id} className="rounded-xl border bg-muted/20 p-4"><Badge variant="secondary">{item.saveable_type}</Badge><p className="mt-2 line-clamp-2 text-sm">{JSON.stringify(item.item || {}).slice(0, 160)}</p></div>)}</div> : <EmptyBlock title="Пока ничего не сохранено" description="Добавляйте публикации, вопросы и ответы в сохранённое, чтобы быстро вернуться к ним." />}</CardContent></Card> }
function EmptyBlock({ title, description }: { title: string; description: string }) { return <Empty className="min-h-52 border"><EmptyHeader><EmptyMedia variant="icon"><Flame className="size-5" /></EmptyMedia><EmptyTitle>{title}</EmptyTitle><EmptyDescription>{description}</EmptyDescription></EmptyHeader><EmptyContent><div className="flex justify-center gap-2"><Button variant="outline" asChild><Link href="/publications">К публикациям</Link></Button><Button variant="outline" asChild><Link href="/questions">К вопросам</Link></Button></div></EmptyContent></Empty> }
function EmptyMini({ text, action }: { text: string; action?: string }) { return <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{text}{action && <Button className="mt-3 w-full" variant="outline" size="sm" asChild><Link href={action}>Добавить</Link></Button>}</div> }
