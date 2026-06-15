"use client"

import * as React from "react"
import Link from "next/link"
import { browserApi } from "@/lib/http/browser"
import type { User } from "@/features/auth/types"

type HubItem = { id: number; type?: string; title?: string; excerpt?: string; url?: string; created_at?: string; language?: string; visibility?: string; original_name?: string; size?: number; name?: string; headline?: string; progress?: number; target?: number; unlocked_at?: string | null; category?: string; description?: string }
type Dashboard = { user: User & { cover_url?: string | null; direction?: string | null }; stats: Record<string, number>; completion: number; materials: HubItem[]; snippets: HubItem[]; files: HubItem[]; friends: HubItem[]; activity: HubItem[]; achievements: HubItem[]; reputation: { score: number; level?: { label: string; next_label?: string; progress: number }; events: HubItem[] }; saved_summary?: number | null; relationship_to_viewer: { is_owner?: boolean } }

const tabs = ["Обзор", "Материалы", "Сниппеты", "Файлы", "Друзья", "Активность", "Достижения", "Сохранённое", "Репутация"]

export function ProfileTabsSection({ user }: { user: User }) {
  const [dashboard, setDashboard] = React.useState<Dashboard | null>(null)
  const [active, setActive] = React.useState("Обзор")
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    browserApi.get<Dashboard>("/laravel/me/profile/dashboard").then((response) => {
      if (!cancelled) setDashboard(response.data)
    }).catch((error) => console.log("[PROFILE_HUB_LOAD_ERROR]", error)).finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [])

  const data: Dashboard = dashboard || { user: user as Dashboard["user"], stats: {}, completion: 0, materials: [], snippets: [], files: [], friends: [], activity: [], achievements: [], reputation: { score: user.reputation_score || 0, events: [] }, relationship_to_viewer: { is_owner: true } }
  const visibleTabs = tabs

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-slate-950 shadow-2xl shadow-cyan-950/30">
      <div className="h-44 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,.35),_transparent_35%),linear-gradient(135deg,_#020617,_#111827_45%,_#0f172a)]" style={data.user.cover_url ? { backgroundImage: `linear-gradient(90deg, rgba(2,6,23,.4), rgba(2,6,23,.8)), url(${data.user.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
      <div className="-mt-14 flex flex-col gap-5 px-6 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <img src={data.user.avatar_url || data.user.avatar || "/window.svg"} alt="avatar" className="size-28 rounded-3xl border-4 border-slate-950 bg-slate-900 object-cover" />
          <div className="space-y-2 pb-1">
            <div><h2 className="text-3xl font-bold text-white">{data.user.name}</h2><p className="text-sm text-cyan-200">@user-{data.user.id} · {data.user.headline || "Участник сообщества Вектор"}</p></div>
            {data.user.bio ? <p className="max-w-2xl text-sm text-slate-300">{data.user.bio}</p> : <p className="max-w-2xl text-sm text-slate-500">Добавьте bio, направление и ссылки — профиль станет понятнее для сообщества.</p>}
            <div className="flex flex-wrap gap-2 text-xs text-slate-300"><span>{data.user.location || "Локация не указана"}</span><span>•</span><span>{data.user.direction || "Направление не указано"}</span><span>•</span><span>с {formatDate(data.user.created_at)}</span></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950" href="/profile/settings">Редактировать профиль</Link>
          <Link className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-100" href="/publications/create">Создать публикацию</Link>
          <Link className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-100" href="/issues/create">Задать вопрос</Link>
          <Link className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-100" href="/files">Загрузить файл</Link>
        </div>
      </div>
    </section>

    <div className="grid gap-3 md:grid-cols-6">{[["Репутация", data.stats.reputation], ["Материалы", (data.stats.publications||0)+(data.stats.questions||0)+(data.stats.answers||0)], ["Сниппеты", data.stats.snippets], ["Файлы", data.stats.files], ["Друзья", data.stats.friends], ["Подписчики", data.stats.followers]].filter(([,v]) => Number(v) > 0).map(([k,v]) => <div key={k} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4"><p className="text-xs text-slate-500">{k}</p><b className="text-2xl text-white">{v}</b></div>)}</div>

    <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80 p-2">{visibleTabs.map(tab => <button key={tab} onClick={() => setActive(tab)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm ${active===tab ? "bg-cyan-400 text-slate-950" : "text-slate-300 hover:bg-slate-900"}`}>{tab}</button>)}</div>
    {loading ? <div className="rounded-3xl border border-slate-800 p-8 text-slate-400">Загружаем центр профиля…</div> : <TabContent active={active} data={data} />}
  </div>
}

function TabContent({ active, data }: { active: string; data: Dashboard }) {
  if (active === "Обзор") return <div className="grid gap-6 lg:grid-cols-[1fr_320px]"><div className="space-y-6"><Section title="Лучшие и свежие материалы" items={data.materials} empty="Создайте публикацию или задайте вопрос — они появятся здесь." /><Section title="Публичные сниппеты" items={data.snippets} empty="Опубликуйте первый сниппет из playground." /><Section title="Последняя активность" items={data.activity} empty="Активности пока нет — heatmap скрыта, чтобы не показывать пустые блоки." /></div><aside className="space-y-6"><div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5"><h3 className="font-semibold text-white">Заполнение профиля</h3><div className="mt-3 h-2 rounded-full bg-slate-800"><div className="h-2 rounded-full bg-cyan-400" style={{ width: `${data.completion}%` }} /></div><p className="mt-2 text-sm text-slate-400">{data.completion}% · добавьте bio, направление, ссылки и аватар.</p></div><Section title="Достижения рядом" items={data.achievements.slice(0,4)} empty="Достижения появятся после первых действий." /></aside></div>
  if (active === "Материалы") return <Section title="Материалы" items={data.materials} empty="Материалов пока нет." />
  if (active === "Сниппеты") return <Section title="Сниппеты" items={data.snippets} empty="Сниппетов пока нет." />
  if (active === "Файлы") return <Section title="Файлы" items={data.files} empty="Файлы пока не загружены." />
  if (active === "Друзья") return <Section title="Друзья" items={data.friends} empty="Добавьте друзей, чтобы быстрее находить людей и чаты." />
  if (active === "Активность") return <Section title="Активность" items={data.activity} empty="Пока нет событий активности." />
  if (active === "Достижения") return <Section title="Достижения" items={data.achievements} empty="Первые достижения выдаются за регистрацию и вклад." />
  if (active === "Репутация") return <Section title={`Репутация: ${data.reputation.score}`} items={data.reputation.events || []} empty="Истории репутации пока нет." />
  return <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-slate-300">Сохранённое доступно только владельцу профиля: {data.saved_summary || 0} элементов.</div>
}

function Section({ title, items, empty }: { title: string; items: HubItem[]; empty: string }) {
  return <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5"><h3 className="mb-4 text-lg font-semibold text-white">{title}</h3>{items.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-800 p-5 text-sm text-slate-500">{empty}</p> : <div className="space-y-3">{items.map((item, index) => <Link href={item.url || "#"} key={`${item.id}-${index}`} className="block rounded-2xl border border-slate-800 bg-slate-900/50 p-4 hover:border-cyan-400/50"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-slate-100">{item.title || item.name || item.original_name || item.type}</p><p className="mt-1 line-clamp-2 text-sm text-slate-400">{item.excerpt || item.description || [item.language, item.visibility, item.category].filter(Boolean).join(" · ")}</p></div>{item.progress !== undefined && item.target ? <span className="text-xs text-cyan-300">{item.progress}/{item.target}</span> : null}</div></Link>)}</div>}</section>
}

function formatDate(value?: string | null) { return value ? new Date(value).toLocaleDateString("ru-RU", { month: "long", year: "numeric" }) : "недавно" }
