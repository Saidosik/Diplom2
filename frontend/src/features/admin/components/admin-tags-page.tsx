"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"
import { Edit, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { createAdminTag, deleteAdminTag, getAdminTags, updateAdminTag, type AdminTagPayload } from "@/features/admin/api"
import type { AdminTag, AdminTagStats } from "@/features/admin/types"
import { AdminPageHeader, AdminTable, StatCard, TableBody, TableCell, TableHead, TableHeader, TableRow, formatDateTime } from "./admin-shared"
import { calculateReadability, getTagBadgeStyle, normalizeHexColor } from "@/features/tags/lib/color"
import { TagBadge } from "@/features/tags/components/tag-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

const COLORS = ["#38bdf8", "#22c55e", "#f59e0b", "#ef4444", "#a78bfa"]

const emptyForm: AdminTagPayload = { name: "", slug: "", description: "", color: "#38bdf8", is_active: true }

function slugify(value: string) {
    return value.toLowerCase().trim().replace(/[^a-z0-9а-яё\s-]/gi, "").replace(/[а-яё]/gi, (char) => cyrillicToLatin(char)).replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
}

function cyrillicToLatin(char: string) {
    const map: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ы: "y", э: "e", ю: "yu", я: "ya", ь: "", ъ: "" }
    return map[char.toLowerCase()] ?? char
}

export function AdminTagsPage({ canDelete = false }: { canDelete?: boolean }) {
    const queryClient = useQueryClient()
    const [q, setQ] = React.useState("")
    const [status, setStatus] = React.useState("all")
    const [readability, setReadability] = React.useState("all")
    const [usage, setUsage] = React.useState("all")
    const [sort, setSort] = React.useState("popularity")
    const [editingTag, setEditingTag] = React.useState<AdminTag | null>(null)
    const [isFormOpen, setFormOpen] = React.useState(false)
    const [deleteTarget, setDeleteTarget] = React.useState<AdminTag | null>(null)

    const tagsQuery = useQuery({
        queryKey: ["admin", "tags", q, status, readability, usage, sort],
        queryFn: () => getAdminTags({ q: q || undefined, status, readability, usage, sort, per_page: 100 }),
    })

    const invalidate = () => {
        void queryClient.invalidateQueries({ queryKey: ["admin", "tags"] })
        void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] })
    }

    const saveMutation = useMutation({
        mutationFn: ({ id, payload }: { id?: number; payload: AdminTagPayload }) => id ? updateAdminTag(id, payload) : createAdminTag(payload),
        onSuccess: () => { toast.success(editingTag ? "Тег обновлён" : "Тег создан"); setFormOpen(false); setEditingTag(null); invalidate() },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Не удалось сохранить тег"),
    })
    const deleteMutation = useMutation({
        mutationFn: deleteAdminTag,
        onSuccess: () => { toast.success("Тег удалён"); setDeleteTarget(null); invalidate() },
        onError: () => toast.error("Не удалось удалить тег. Возможно, он связан с материалами."),
    })

    const tags = tagsQuery.data?.data ?? []
    const stats = tagsQuery.data?.stats

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: "easeOut" }} className="space-y-6">
            <AdminPageHeader
                title="Теги"
                description="Управление тегами сообщества, цветами бейджей, читаемостью и статистикой использования в публикациях и вопросах."
                actions={<Button onClick={() => { setEditingTag(null); setFormOpen(true) }}><Plus className="size-4" />Создать тег</Button>}
            />

            {stats ? <TagMetrics stats={stats} /> : null}
            {stats ? <TagAnalytics stats={stats} /> : null}

            <Card>
                <CardContent className="grid gap-3 pt-6 md:grid-cols-2 xl:grid-cols-5">
                    <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Поиск по названию или slug" />
                    <SelectNative value={status} onChange={setStatus} options={[ ["all", "Все статусы"], ["active", "Активные"], ["inactive", "Неактивные"] ]} />
                    <SelectNative value={readability} onChange={setReadability} options={[ ["all", "Любая читаемость"], ["good", "Хорошая"], ["acceptable", "Допустимая"], ["poor", "Плохая"] ]} />
                    <SelectNative value={usage} onChange={setUsage} options={[ ["all", "Все по использованию"], ["used", "Используемые"], ["unused", "Неиспользуемые"] ]} />
                    <SelectNative value={sort} onChange={setSort} options={[ ["popularity", "Популярность"], ["publications", "Публикации"], ["questions", "Вопросы"], ["updated_at", "Дата обновления"], ["name", "Название"] ]} />
                </CardContent>
            </Card>

            <AdminTable>
                <TableHeader>
                    <TableRow>
                        <TableHead>Тег</TableHead>
                        <TableHead>Цвет</TableHead>
                        <TableHead>Читаемость</TableHead>
                        <TableHead>Использование</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Обновлён</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tags.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Теги не найдены.</TableCell></TableRow>
                    ) : tags.map((tag, index) => (
                        <motion.tr key={tag.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16, delay: Math.min(index * 0.015, 0.15) }} className="border-b transition-colors hover:bg-muted/50">
                            <TableCell className="min-w-48">
                                <div className="space-y-1"><div className="font-medium">{tag.name}</div><div className="text-xs text-muted-foreground">/{tag.slug}</div><TagBadge tag={tag} compact /></div>
                            </TableCell>
                            <TableCell><div className="flex items-center gap-2"><span className="size-5 rounded-full border" style={{ backgroundColor: normalizeHexColor(tag.color) }} />{normalizeHexColor(tag.color)}</div></TableCell>
                            <TableCell><ReadabilityBadge value={tag.readability_light} label="светлая" /><ReadabilityBadge value={tag.readability_dark} label="тёмная" /></TableCell>
                            <TableCell className="min-w-40"><div className="text-sm">{tag.posts_count} публ. · {tag.questions_count} вопр.</div><Progress className="mt-2" value={Math.min(tag.usage_percent, 100)} /><div className="mt-1 text-xs text-muted-foreground">{tag.usage_percent}% материалов</div></TableCell>
                            <TableCell><Badge variant={tag.is_active ? "default" : "secondary"}>{tag.is_active ? "Активен" : "Неактивен"}</Badge></TableCell>
                            <TableCell>{formatDateTime(tag.updated_at)}</TableCell>
                            <TableCell><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => { setEditingTag(tag); setFormOpen(true) }}><Edit className="size-3.5" />Редактировать</Button>{canDelete ? <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(tag)}><Trash2 className="size-3.5" />Удалить</Button> : null}</div></TableCell>
                        </motion.tr>
                    ))}
                </TableBody>
            </AdminTable>

            <TagFormDialog open={isFormOpen} tag={editingTag} pending={saveMutation.isPending} onOpenChange={setFormOpen} onSubmit={(payload) => saveMutation.mutate({ id: editingTag?.id, payload })} />
            <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Удалить тег?</AlertDialogTitle><AlertDialogDescription>Удаление доступно только администратору. Связанный с публикациями или вопросами тег backend не удалит.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>Удалить</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    )
}

function SelectNative({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[][] }) {
    return <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
}

function TagMetrics({ stats }: { stats: AdminTagStats }) {
    const t = stats.totals
    return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Всего тегов" value={t.tags} hint={`${t.active_tags} активных`} /><StatCard label="Неиспользуемых" value={t.unused_tags} hint={`${t.used_tags} используются`} /><StatCard label="Плохая читаемость" value={`${t.poor_light_tags}/${t.poor_dark_tags}`} hint="светлая / тёмная тема" /><StatCard label="Среднее на тег" value={`${t.avg_publications_per_tag}/${t.avg_questions_per_tag}`} hint="публикации / вопросы" /><StatCard label="Покрытие тегами" value={`${t.tagged_materials_percent}%`} hint={`${t.tagged_materials_total} из ${t.materials_total}`} /><StatCard label="Средний contrast" value={`${t.avg_light_contrast}/${t.avg_dark_contrast}`} hint="светлая / тёмная" /><StatCard label="Популярный тег" value={stats.popular_tag ? `#${stats.popular_tag.name}` : "—"} hint={`${stats.popular_tag?.total_usage_count ?? 0} связей`} /><StatCard label="Требуют доработки" value={stats.needs_color_work} hint={stats.problem_tag ? `Проблемный: #${stats.problem_tag.name}` : undefined} /></div>
}

function TagAnalytics({ stats }: { stats: AdminTagStats }) {
    return <div className="grid gap-4 xl:grid-cols-3"><BarPanel title="Топ по публикациям" data={stats.top_publications} dataKey="posts_count" /><BarPanel title="Топ по вопросам" data={stats.top_questions} dataKey="questions_count" /><BarPanel title="Общая активность" data={stats.top_activity} dataKey="total_usage_count" /><PiePanel title="Активность тегов" data={stats.active_distribution} /><PiePanel title="Читаемость" data={stats.readability_distribution} /><PiePanel title="Распределение использования" data={stats.usage_distribution} /></div>
}

function BarPanel({ title, data, dataKey }: { title: string; data: AdminTag[]; dataKey: keyof AdminTag }) {
    const chartData = data.map((tag) => ({ name: tag.name, value: Number(tag[dataKey]) || 0 }))
    return <Card><CardHeader><CardTitle className="text-base">{title}</CardTitle><CardDescription>Топ-10 тегов</CardDescription></CardHeader><CardContent><ChartContainer config={{ value: { label: title, color: "#38bdf8" } }} className="h-56"><BarChart data={chartData}><XAxis dataKey="name" hide /><YAxis allowDecimals={false} width={28} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="value" fill="#38bdf8" radius={4} /></BarChart></ChartContainer></CardContent></Card>
}

function PiePanel({ title, data }: { title: string; data: Array<{ name: string; value: number; percent: number }> }) {
    return <Card><CardHeader><CardTitle className="text-base">{title}</CardTitle><CardDescription>Количество и процент</CardDescription></CardHeader><CardContent><ChartContainer config={{ value: { label: title } }} className="h-56"><PieChart><ChartTooltip content={<ChartTooltipContent nameKey="name" />} /><Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78}>{data.map((item, index) => <Cell key={item.name} fill={COLORS[index % COLORS.length]} />)}</Pie></PieChart></ChartContainer><div className="mt-2 grid gap-1 text-xs text-muted-foreground">{data.map((item) => <div key={item.name} className="flex justify-between"><span>{item.name}</span><span>{item.value} · {item.percent}%</span></div>)}</div></CardContent></Card>
}

function ReadabilityBadge({ value, label }: { value: AdminTag["readability_light"]; label: string }) {
    const variant = value.status === "poor" ? "destructive" : value.status === "acceptable" ? "secondary" : "default"
    return <div className="mb-1 flex items-center gap-2"><Badge variant={variant}>{label}</Badge><span className="text-xs text-muted-foreground">{value.ratio}:1 · {value.label}</span></div>
}

function TagFormDialog({ open, tag, pending, onOpenChange, onSubmit }: { open: boolean; tag: AdminTag | null; pending: boolean; onOpenChange: (open: boolean) => void; onSubmit: (payload: AdminTagPayload) => void }) {
    const [form, setForm] = React.useState<AdminTagPayload>(emptyForm)
    const [autoSlug, setAutoSlug] = React.useState(true)
    React.useEffect(() => { setForm(tag ? { name: tag.name, slug: tag.slug, description: tag.description ?? "", color: normalizeHexColor(tag.color), is_active: tag.is_active } : emptyForm); setAutoSlug(!tag) }, [tag, open])
    const readability = calculateReadability(form.color)
    const hasWarning = readability.light.status === "poor" || readability.dark.status === "poor"
    const updateName = (name: string) => setForm((current) => ({ ...current, name, slug: autoSlug ? slugify(name) : current.slug }))

    return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-3xl"><DialogHeader><DialogTitle>{tag ? "Редактировать тег" : "Создать тег"}</DialogTitle><DialogDescription>Цвет проверяется по WCAG contrast ratio и в предпросмотре использует безопасный фон, border и цвет текста.</DialogDescription></DialogHeader><div className="grid gap-5 lg:grid-cols-[1fr_280px]"><div className="space-y-4"><Field label="Название"><Input value={form.name} onChange={(e) => updateName(e.target.value)} placeholder="Laravel" /></Field><Field label="Slug"><div className="flex gap-2"><Input value={form.slug} onChange={(e) => { setAutoSlug(false); setForm({ ...form, slug: e.target.value }) }} placeholder="laravel" /><Button type="button" variant="outline" onClick={() => { setAutoSlug(true); setForm({ ...form, slug: slugify(form.name) }) }}>Авто</Button></div></Field><Field label="Описание"><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Краткое описание тега" /></Field><Field label="HEX-цвет"><Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="#38bdf8" /></Field><div className="flex items-center gap-3"><Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} /><Label>Тег активен</Label></div></div><div className="space-y-4"><PreviewCard title="Светлая тема" theme="light" color={form.color} tagName={form.name || "Пример"} /><PreviewCard title="Тёмная тема" theme="dark" color={form.color} tagName={form.name || "Пример"} /><div className="rounded-2xl border p-3 text-sm"><ReadabilityLine label="Светлая" value={readability.light} /><ReadabilityLine label="Тёмная" value={readability.dark} /></div>{hasWarning ? <Alert variant="destructive"><AlertTitle>Нужна доработка цвета</AlertTitle><AlertDescription>Тег плохо виден хотя бы на одной теме. Компонент применит безопасный fallback-стиль, но лучше выбрать более контрастный цвет.</AlertDescription></Alert> : null}</div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button><Button disabled={pending || !form.name || !form.color} onClick={() => onSubmit({ ...form, color: normalizeHexColor(form.color) })}>{pending ? "Сохранение..." : "Сохранить"}</Button></DialogFooter></DialogContent></Dialog>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div> }
function PreviewCard({ title, theme, color, tagName }: { title: string; theme: "light" | "dark"; color: string; tagName: string }) { return <div className={theme === "dark" ? "rounded-2xl border bg-slate-950 p-4" : "rounded-2xl border bg-white p-4"}><p className={theme === "dark" ? "mb-3 text-xs text-slate-400" : "mb-3 text-xs text-slate-500"}>{title}</p><span className="inline-flex rounded-full border px-2.5 py-1.5 text-xs font-medium" style={getTagBadgeStyle(color, theme)}>#{tagName}</span></div> }
function ReadabilityLine({ label, value }: { label: string; value: ReturnType<typeof calculateReadability>["light"] }) { return <div className="flex items-center justify-between py-1"><span>{label}</span><span className={value.status === "poor" ? "text-destructive" : "text-muted-foreground"}>{value.ratio}:1 · {value.label}</span></div> }
