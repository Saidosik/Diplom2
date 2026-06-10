"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"
import { Edit, Plus, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { createAdminTag, deleteAdminTag, getAdminTags, updateAdminTag, type AdminTagPayload } from "@/features/admin/api"
import type { AdminTag, AdminTagStats } from "@/features/admin/types"
import { AdminPageHeader, AdminTable, StatCard, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./admin-shared"
import { calculateReadability, calculateSurfaceReadability, FALLBACK_TAG_COLOR, getRepresentativeSurface, isValidHexColor, normalizeHexColor, type ReadabilityStatus } from "@/features/tags/lib/color"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { type ThemeSurface, useReadableThemeColors } from "@/features/tags/lib/theme-colors"
import { cn } from "@/lib/utils"

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]
const TAG_COLOR_PRESETS = [
    { name: "Синий", color: "#2563eb" },
    { name: "Голубой", color: "#0ea5e9" },
    { name: "Фиолетовый", color: "#7c3aed" },
    { name: "Розовый", color: "#db2777" },
    { name: "Красный", color: "#dc2626" },
    { name: "Оранжевый", color: "#ea580c" },
    { name: "Жёлтый", color: "#ca8a04" },
    { name: "Зелёный", color: "#16a34a" },
    { name: "Бирюзовый", color: "#0d9488" },
    { name: "Серый", color: "#64748b" },
]

const emptyForm: AdminTagPayload = { name: "", slug: "", description: "", color: FALLBACK_TAG_COLOR, is_active: true }

function slugify(value: string) {
    return value.toLowerCase().trim().replace(/[^a-z0-9а-яё\s-]/gi, "").replace(/[а-яё]/gi, (char) => cyrillicToLatin(char)).replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
}

function cyrillicToLatin(char: string) {
    const map: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ы: "y", э: "e", ю: "yu", я: "ya", ь: "", ъ: "" }
    return map[char.toLowerCase()] ?? char
}

function contrastText(status: ReadabilityStatus) {
    if (status === "good") return "Контраст: хороший"
    if (status === "acceptable") return "Контраст: допустимый"
    return "Контраст: низкий"
}

function contrastShort(status: ReadabilityStatus) {
    if (status === "good") return "Хороший"
    if (status === "acceptable") return "Допустимый"
    return "Низкий"
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

    const themeSurfaces = useReadableThemeColors()
    const lightSurface = getRepresentativeSurface(themeSurfaces, "light")
    const darkSurface = getRepresentativeSurface(themeSurfaces, "dark")

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
        onError: () => toast.error("Не удалось сохранить тег. Проверьте название, slug и HEX-цвет."),
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
                    <SelectNative value={readability} onChange={setReadability} options={[ ["all", "Любой контраст"], ["good", "Хороший"], ["acceptable", "Допустимый"], ["poor", "Низкий"] ]} />
                    <SelectNative value={usage} onChange={setUsage} options={[ ["all", "Все по использованию"], ["used", "Используемые"], ["unused", "Неиспользуемые"] ]} />
                    <SelectNative value={sort} onChange={setSort} options={[ ["popularity", "Популярность"], ["publications", "Публикации"], ["questions", "Вопросы"], ["updated_at", "Дата обновления"], ["name", "Название"] ]} />
                </CardContent>
            </Card>

            <AdminTable>
                <TableHeader>
                    <TableRow>
                        <TableHead>Тег</TableHead>
                        <TableHead>Цвет</TableHead>
                        <TableHead>Предпросмотр</TableHead>
                        <TableHead>Светлая тема</TableHead>
                        <TableHead>Тёмная тема</TableHead>
                        <TableHead>Публикации</TableHead>
                        <TableHead>Вопросы</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tags.length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Теги не найдены.</TableCell></TableRow>
                    ) : tags.map((tag, index) => (
                        <motion.tr key={tag.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16, delay: Math.min(index * 0.015, 0.15) }} className="border-b transition-colors hover:bg-muted/50">
                            <TableCell className="min-w-44">
                                <div className="space-y-1">
                                    <div className="font-medium">{tag.name}</div>
                                    <div className="text-xs text-muted-foreground">/{tag.slug}</div>
                                </div>
                            </TableCell>
                            <TableCell><ColorSwatch color={tag.color} /></TableCell>
                            <TableCell><TagBadge tag={tag} compact surface={darkSurface} /></TableCell>
                            <TableCell><ContrastBadge value={lightSurface ? calculateSurfaceReadability(tag.color, lightSurface) : tag.readability_light} /></TableCell>
                            <TableCell><ContrastBadge value={darkSurface ? calculateSurfaceReadability(tag.color, darkSurface) : tag.readability_dark} /></TableCell>
                            <TableCell>{tag.posts_count}</TableCell>
                            <TableCell>{tag.questions_count}</TableCell>
                            <TableCell>
                                <div className="flex justify-end gap-2">
                                    <Button size="sm" variant="outline" onClick={() => { setEditingTag(tag); setFormOpen(true) }}><Edit className="size-3.5" />Редактировать</Button>
                                    {canDelete ? <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(tag)}><Trash2 className="size-3.5" />Удалить</Button> : null}
                                </div>
                            </TableCell>
                        </motion.tr>
                    ))}
                </TableBody>
            </AdminTable>

            <TagFormDialog open={isFormOpen} tag={editingTag} pending={saveMutation.isPending} surfaces={themeSurfaces} onOpenChange={setFormOpen} onSubmit={(payload) => saveMutation.mutate({ id: editingTag?.id, payload })} />
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

function ColorSwatch({ color }: { color?: string | null }) {
    const normalized = normalizeHexColor(color)
    return <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="size-5 rounded-full border shadow-sm" style={{ backgroundColor: normalized }} />{normalized}</div>
}

function TagMetrics({ stats }: { stats: AdminTagStats }) {
    const t = stats.totals
    return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Всего тегов" value={t.tags} hint={`${t.active_tags} активных`} /><StatCard label="Неиспользуемых" value={t.unused_tags} hint={`${t.used_tags} используются`} /><StatCard label="Низкий контраст" value={`${t.poor_light_tags}/${t.poor_dark_tags}`} hint="светлая / тёмная тема" /><StatCard label="Среднее на тег" value={`${t.avg_publications_per_tag}/${t.avg_questions_per_tag}`} hint="публикации / вопросы" /><StatCard label="Покрытие тегами" value={`${t.tagged_materials_percent}%`} hint={`${t.tagged_materials_total} из ${t.materials_total}`} /><StatCard label="Средний contrast" value={`${t.avg_light_contrast}/${t.avg_dark_contrast}`} hint="светлая / тёмная" /><StatCard label="Популярный тег" value={stats.popular_tag ? `#${stats.popular_tag.name}` : "—"} hint={`${stats.popular_tag?.total_usage_count ?? 0} связей`} /><StatCard label="Рекомендуется проверить" value={stats.needs_color_work} hint={stats.problem_tag ? `Минимальный контраст: #${stats.problem_tag.name}` : undefined} /></div>
}

function TagAnalytics({ stats }: { stats: AdminTagStats }) {
    return <div className="grid gap-4 xl:grid-cols-3"><BarPanel title="Топ по публикациям" data={stats.top_publications} dataKey="posts_count" /><BarPanel title="Топ по вопросам" data={stats.top_questions} dataKey="questions_count" /><BarPanel title="Общая активность" data={stats.top_activity} dataKey="total_usage_count" /><PiePanel title="Активность тегов" data={stats.active_distribution} /><PiePanel title="Контраст" data={stats.readability_distribution} /><PiePanel title="Распределение использования" data={stats.usage_distribution} /></div>
}

function BarPanel({ title, data, dataKey }: { title: string; data: AdminTag[]; dataKey: keyof AdminTag }) {
    const chartData = data.map((tag) => ({ name: tag.name, value: Number(tag[dataKey]) || 0 }))
    return <Card><CardHeader><CardTitle className="text-base">{title}</CardTitle><CardDescription>Топ-10 тегов</CardDescription></CardHeader><CardContent><ChartContainer config={{ value: { label: title, color: "var(--chart-1)" } }} className="h-56"><BarChart data={chartData}><XAxis dataKey="name" hide /><YAxis allowDecimals={false} width={28} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="value" fill="var(--chart-1)" radius={4} /></BarChart></ChartContainer></CardContent></Card>
}

function PiePanel({ title, data }: { title: string; data: Array<{ name: string; value: number; percent: number }> }) {
    return <Card><CardHeader><CardTitle className="text-base">{title}</CardTitle><CardDescription>Количество и процент</CardDescription></CardHeader><CardContent><ChartContainer config={{ value: { label: title } }} className="h-56"><PieChart><ChartTooltip content={<ChartTooltipContent nameKey="name" />} /><Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78}>{data.map((item, index) => <Cell key={item.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Pie></PieChart></ChartContainer><div className="mt-2 grid gap-1 text-xs text-muted-foreground">{data.map((item) => <div key={item.name} className="flex justify-between"><span>{item.name}</span><span>{item.value} · {item.percent}%</span></div>)}</div></CardContent></Card>
}

function ContrastBadge({ value }: { value: { ratio: number; status: ReadabilityStatus } }) {
    const variant = value.status === "good" ? "default" : "secondary"
    return <div className="flex flex-col gap-1"><Badge variant={variant} className={cn(value.status === "poor" && "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300")}>{contrastShort(value.status)}</Badge><span className="text-xs text-muted-foreground">{value.ratio}:1</span></div>
}

function TagFormDialog({ open, tag, pending, surfaces, onOpenChange, onSubmit }: { open: boolean; tag: AdminTag | null; pending: boolean; surfaces: ThemeSurface[]; onOpenChange: (open: boolean) => void; onSubmit: (payload: AdminTagPayload) => void }) {
    const [form, setForm] = React.useState<AdminTagPayload>(emptyForm)
    const [autoSlug, setAutoSlug] = React.useState(true)
    React.useEffect(() => { setForm(tag ? { name: tag.name, slug: tag.slug, description: tag.description ?? "", color: normalizeHexColor(tag.color), is_active: tag.is_active } : emptyForm); setAutoSlug(!tag) }, [tag, open])

    const normalizedColor = normalizeHexColor(form.color)
    const hexIsValid = isValidHexColor(form.color)
    const surfaceReadability = surfaces.map((surface) => ({ surface, readability: calculateSurfaceReadability(form.color, surface) }))
    const lowContrastThemes = surfaceReadability
        .filter((item) => item.readability.status === "poor")
        .map((item) => item.surface.theme === "dark" ? "На тёмной теме читается хуже" : "На светлой теме читается хуже")
        .filter((value, index, values) => values.indexOf(value) === index)
    const updateName = (name: string) => setForm((current) => ({ ...current, name, slug: autoSlug ? slugify(name) : current.slug }))
    const updateColor = (color: string) => setForm((current) => ({ ...current, color }))
    const submit = () => {
        if (!hexIsValid) {
            toast.error(`Введите корректный HEX-цвет в формате ${FALLBACK_TAG_COLOR}.`)
            return
        }
        onSubmit({ ...form, color: normalizedColor })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[90dvh] overflow-hidden p-0 sm:max-w-4xl">
                <DialogHeader className="shrink-0 border-b px-6 py-5">
                    <DialogTitle>{tag ? "Редактировать тег" : "Создать тег"}</DialogTitle>
                    <DialogDescription>Выберите цвет, проверьте контраст на светлой и тёмной теме и сохраните тег.</DialogDescription>
                </DialogHeader>
                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
                        <div className="space-y-4">
                            <Field label="Название"><Input value={form.name} onChange={(event) => updateName(event.target.value)} placeholder="Laravel" /></Field>
                            <Field label="Slug"><div className="flex gap-2"><Input value={form.slug} onChange={(event) => { setAutoSlug(false); setForm({ ...form, slug: event.target.value }) }} placeholder="laravel" /><Button type="button" variant="outline" onClick={() => { setAutoSlug(true); setForm({ ...form, slug: slugify(form.name) }) }}>Авто</Button></div></Field>
                            <Field label="Описание"><Textarea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Краткое описание тега" /></Field>
                            <TagColorPicker value={form.color} onChange={updateColor} isValid={hexIsValid} />
                            <div className="flex items-center gap-3"><Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} /><Label>Тег активен</Label></div>
                        </div>
                        <div className="space-y-4">
                            <Card>
                                <CardHeader className="pb-3"><CardTitle className="text-base">Проверка читаемости</CardTitle><CardDescription>Фоны берутся из CSS variables текущей темы проекта.</CardDescription></CardHeader>
                                <CardContent className="grid gap-3">
                                    {surfaceReadability.map(({ surface, readability }) => (
                                        <SurfaceReadabilityPreview key={surface.id} surface={surface} color={form.color} tagName={form.name || "Пример"} readability={readability} />
                                    ))}
                                </CardContent>
                            </Card>
                            {!hexIsValid ? <Alert variant="destructive"><AlertTitle>Некорректный HEX</AlertTitle><AlertDescription>Используйте формат #RGB или #RRGGBB, например {FALLBACK_TAG_COLOR}.</AlertDescription></Alert> : null}
                            {hexIsValid && lowContrastThemes.length > 0 ? <Alert><AlertTitle>Рекомендация по контрасту</AlertTitle><AlertDescription>{lowContrastThemes.join(". ")}. Цвет можно использовать, но для лучшей читаемости рекомендуется выбрать более контрастный оттенок.</AlertDescription></Alert> : null}
                        </div>
                    </div>
                </div>
                <DialogFooter className="shrink-0 border-t px-6 py-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
                    <Button disabled={pending || !form.name || !hexIsValid} onClick={submit}>{pending ? "Сохранение..." : "Сохранить"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function TagColorPicker({ value, onChange, isValid }: { value?: string | null; onChange: (value: string) => void; isValid: boolean }) {
    const normalized = normalizeHexColor(value)
    return (
        <div className="space-y-3">
            <Label>Цвет тега</Label>
            <div className="flex flex-col gap-3 rounded-2xl border p-3">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="size-10 rounded-2xl border shadow-sm" style={{ backgroundColor: normalized }} />
                    <Input type="color" value={normalized} onChange={(event) => onChange(event.target.value)} className="h-10 w-16 cursor-pointer p-1" aria-label="Выбрать цвет тега" />
                    <Input value={value ?? ""} onChange={(event) => onChange(event.target.value)} placeholder={FALLBACK_TAG_COLOR} className={cn("max-w-36 font-mono", !isValid && "border-destructive focus-visible:ring-destructive/30")} />
                    <Popover>
                        <PopoverTrigger asChild><Button type="button" variant="outline">Пресеты</Button></PopoverTrigger>
                        <PopoverContent align="start" className="w-[min(20rem,calc(100vw-2rem))]">
                            <div className="space-y-3">
                                <div><p className="font-medium">Готовые цвета</p><p className="text-xs text-muted-foreground">Нажмите на цвет, чтобы применить его к тегу.</p></div>
                                <div className="grid grid-cols-2 gap-2">
                                    {TAG_COLOR_PRESETS.map((preset) => (
                                        <Button key={preset.color} type="button" variant="outline" className="justify-start gap-2" onClick={() => onChange(preset.color)}>
                                            <span className="size-4 rounded-full border" style={{ backgroundColor: preset.color }} />{preset.name}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                    <Button type="button" variant="ghost" onClick={() => onChange(FALLBACK_TAG_COLOR)}><RotateCcw className="size-4" />Сбросить к стандартному</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {TAG_COLOR_PRESETS.map((preset) => (
                        <button key={preset.color} type="button" className={cn("size-7 rounded-full border ring-offset-background transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", normalized === preset.color && "ring-2 ring-ring")} style={{ backgroundColor: preset.color }} onClick={() => onChange(preset.color)} aria-label={`Выбрать цвет ${preset.name}`} title={preset.name} />
                    ))}
                </div>
                <div className="rounded-xl border bg-muted/30 p-3"><TagBadge tag={{ name: "preview", slug: "preview", color: normalized }} compact /></div>
            </div>
            {!isValid ? <p className="text-sm text-destructive">Введите корректный HEX-цвет, например {FALLBACK_TAG_COLOR}.</p> : null}
        </div>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div> }
function SurfaceReadabilityPreview({ surface, color, tagName, readability }: { surface: ThemeSurface; color: string; tagName: string; readability: ReturnType<typeof calculateReadability> }) {
    return (
        <div className="rounded-xl border p-3" style={{ backgroundColor: surface.background, color: surface.foreground }}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span>{surface.label}</span>
                <span>{readability.ratio}:1 · {contrastText(readability.status)}</span>
            </div>
            <TagBadge tag={{ name: tagName, slug: "preview", color }} compact surface={surface} />
        </div>
    )
}
