"use client"

import Link from "next/link"
import { useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Copy, Download, Eye, FolderOpen, Grid2X2, List, Loader2, Search, ShieldAlert, Trash2, UploadCloud } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { deleteMyFile, getMyFiles, updateMyFile, uploadMyFile } from "@/features/files/api"
import type { UserFile } from "@/features/files/types"
import { absoluteShareUrl, dateLabel, fileIcon, kindLabels, sizeLabel } from "./file-utils"

export function FilesPage() {
    const queryClient = useQueryClient()
    const inputRef = useRef<HTMLInputElement>(null)
    const [q, setQ] = useState("")
    const [kind, setKind] = useState("all")
    const [visibility, setVisibility] = useState("all")
    const [sort, setSort] = useState("newest")
    const [view, setView] = useState<"grid" | "list">("grid")
    const [uploadVisibility, setUploadVisibility] = useState<"private" | "public">("private")
    const [title, setTitle] = useState("")
    const [dragActive, setDragActive] = useState(false)
    const [publishFile, setPublishFile] = useState<UserFile | null>(null)
    const [downloadWarning, setDownloadWarning] = useState<UserFile | null>(null)

    const filesQuery = useQuery({ queryKey: ["files", q, kind, visibility, sort], queryFn: () => getMyFiles({ q: q || undefined, kind: kind === "all" ? undefined : kind, visibility: visibility === "all" ? undefined : visibility, sort, per_page: 60 }) })
    const meta = filesQuery.data?.meta?.storage
    const files = filesQuery.data?.data ?? []
    const hasFilters = Boolean(q || kind !== "all" || visibility !== "all")
    const quotaFull = Boolean(meta && (meta.used_bytes >= meta.quota_bytes || meta.files_count >= meta.max_files || meta.public_files_count >= meta.max_public_files))

    const uploadMutation = useMutation({ mutationFn: uploadMyFile, onSuccess: () => { toast.success("Файл загружен"); setTitle(""); queryClient.invalidateQueries({ queryKey: ["files"] }) }, onError: (error: Error) => toast.error(error.message) })
    const updateMutation = useMutation({ mutationFn: ({ id, nextVisibility }: { id: number; nextVisibility: "private" | "public" }) => updateMyFile(id, { visibility: nextVisibility }), onSuccess: (file) => { toast.success(file.visibility === "public" ? "Файл стал публичным" : "Файл стал приватным"); queryClient.invalidateQueries({ queryKey: ["files"] }) }, onError: (error: Error) => toast.error(error.message) })
    const deleteMutation = useMutation({ mutationFn: deleteMyFile, onSuccess: () => { toast.success("Файл удалён"); queryClient.invalidateQueries({ queryKey: ["files"] }) }, onError: (error: Error) => toast.error(error.message) })

    const helper = useMemo(() => meta ? `До ${sizeLabel(meta.max_file_bytes)}. Разрешены изображения, PDF, архивы, текст, логи и код.` : "Изображения, PDF, архивы, текст, логи и код.", [meta])

    function resetFilters() { setQ(""); setKind("all"); setVisibility("all"); setSort("newest") }
    function choose(file?: File | null) { if (!file) return; uploadMutation.mutate({ file, title: title.trim() || file.name, visibility: uploadVisibility }) }
    function copyLink(file: UserFile) { const url = absoluteShareUrl(file.share_url); if (!url) return; navigator.clipboard.writeText(url).then(() => toast.success("Ссылка скопирована")) }
    function download(file: UserFile) { if (!file.download_url) return; const warn = !file.is_owner || ["archive", "file"].includes(file.kind); if (warn) setDownloadWarning(file); else window.location.href = file.download_url }

    return <div className="space-y-6 overflow-x-hidden">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div><Badge variant="outline" className="mb-3 gap-2"><FolderOpen className="size-3.5" /> Личное хранилище</Badge><h1 className="text-3xl font-semibold tracking-tight">Мои файлы</h1><p className="mt-1 max-w-3xl text-muted-foreground">Загружайте изображения, PDF, архивы, логи и код, чтобы использовать их в чатах, публикациях и демонстрации проекта.</p></div>
        </div>

        <Card><CardHeader><CardTitle>Квота хранилища</CardTitle><CardDescription>{meta ? `Использовано: ${sizeLabel(meta.used_bytes)} из ${sizeLabel(meta.quota_bytes)}` : "Загружаем лимиты хранилища"}</CardDescription></CardHeader><CardContent className="space-y-4"><Progress value={meta?.used_percent ?? 0} /><div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><Quota label="Файлов" value={meta ? `${meta.files_count} / ${meta.max_files}` : "—"} /><Quota label="Публичных" value={meta ? `${meta.public_files_count} / ${meta.max_public_files}` : "—"} /><Quota label="Максимум файла" value={meta ? sizeLabel(meta.max_file_bytes) : "—"} /><Quota label="Заполнено" value={`${meta?.used_percent ?? 0}%`} /></div></CardContent></Card>

        {quotaFull ? <Alert><ShieldAlert className="size-4" /><AlertTitle>Хранилище заполнено</AlertTitle><AlertDescription>Удалите ненужные файлы или сделайте их приватными, если достигнут лимит публичных файлов.</AlertDescription></Alert> : null}

        <div className="grid gap-4 xl:grid-cols-[0.85fr_1.4fr]">
            <Card><CardHeader><CardTitle>Загрузка</CardTitle><CardDescription>По умолчанию файл приватный и доступен только владельцу.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label>Название</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Автоматически из имени файла" /></div><div className="space-y-2"><Label>Доступ</Label><Select value={uploadVisibility} onValueChange={(v) => setUploadVisibility(v as "private" | "public")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="private">Приватный</SelectItem><SelectItem value="public">Публичный</SelectItem></SelectContent></Select></div><div onDragEnter={() => setDragActive(true)} onDragLeave={() => setDragActive(false)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setDragActive(false); choose(e.dataTransfer.files.item(0)) }} className={`flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center transition ${dragActive ? "border-primary bg-primary/10" : "bg-muted/30"}`}><UploadCloud className="mb-3 size-8 text-primary" /><div className="font-medium">Перетащите файл сюда</div><p className="mt-1 text-sm text-muted-foreground">{helper}</p><Button className="mt-4" disabled={uploadMutation.isPending} onClick={() => inputRef.current?.click()}>{uploadMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}Выбрать файл</Button><input ref={inputRef} type="file" className="hidden" disabled={uploadMutation.isPending} onChange={(e) => { choose(e.target.files?.item(0)); e.currentTarget.value = "" }} /></div></CardContent></Card>

            <Card><CardHeader><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><CardTitle>Библиотека</CardTitle><CardDescription>Поиск, фильтры, сортировка и действия с файлами.</CardDescription></div><ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as "grid" | "list")}><ToggleGroupItem value="grid" aria-label="Сетка"><Grid2X2 className="size-4" /></ToggleGroupItem><ToggleGroupItem value="list" aria-label="Список"><List className="size-4" /></ToggleGroupItem></ToggleGroup></div></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_150px_160px_140px]"><div className="relative md:col-span-2 xl:col-span-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по файлам" className="pl-9" /></div><Select value={kind} onValueChange={setKind}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Все типы</SelectItem>{Object.entries(kindLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><Select value={visibility} onValueChange={setVisibility}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Любой доступ</SelectItem><SelectItem value="private">Приватные</SelectItem><SelectItem value="public">Публичные</SelectItem></SelectContent></Select><Select value={sort} onValueChange={setSort}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Новые</SelectItem><SelectItem value="oldest">Старые</SelectItem><SelectItem value="name">Имя</SelectItem><SelectItem value="size">Размер</SelectItem></SelectContent></Select></div>{filesQuery.isLoading ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div> : files.length ? <div className={view === "grid" ? "grid gap-3 sm:grid-cols-2 2xl:grid-cols-3" : "space-y-3"}>{files.map((file) => <FileCard key={file.id} file={file} compact={view === "list"} onCopy={() => copyLink(file)} onDownload={() => download(file)} onPublish={() => setPublishFile(file)} onTogglePrivate={() => updateMutation.mutate({ id: file.id, nextVisibility: "private" })} onDelete={() => deleteMutation.mutate(file.id)} />)}</div> : <EmptyState hasFilters={hasFilters} quotaFull={quotaFull} onReset={resetFilters} onUpload={() => inputRef.current?.click()} onBiggest={() => { resetFilters(); setSort("size") }} />}</CardContent></Card>
        </div>

        <AlertDialog open={Boolean(publishFile)} onOpenChange={(open) => !open && setPublishFile(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Сделать файл публичным?</AlertDialogTitle><AlertDialogDescription>Файл станет доступен другим пользователям. Не публикуйте персональные данные, пароли, токены, ключи API и приватные документы.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><AlertDialogAction onClick={() => { if (publishFile) updateMutation.mutate({ id: publishFile.id, nextVisibility: "public" }); setPublishFile(null) }}>Сделать публичным</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        <AlertDialog open={Boolean(downloadWarning)} onOpenChange={(open) => !open && setDownloadWarning(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Вы скачиваете файл другого пользователя</AlertDialogTitle><AlertDialogDescription>Платформа «Вектор» не проверяет содержимое каждого файла и не несёт ответственности за файлы, загруженные пользователями. Не открывайте подозрительные архивы, документы и файлы из неизвестных источников.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><AlertDialogAction onClick={() => { if (downloadWarning?.download_url) window.location.href = downloadWarning.download_url }}>Скачать файл</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
}

function Quota({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border bg-card/50 p-3"><div className="text-muted-foreground">{label}</div><div className="mt-1 font-medium">{value}</div></div> }

function FileCard({ file, compact, onCopy, onDownload, onPublish, onTogglePrivate, onDelete }: { file: UserFile; compact?: boolean; onCopy: () => void; onDownload: () => void; onPublish: () => void; onTogglePrivate: () => void; onDelete: () => void }) {
    const Icon = fileIcon(file.kind)
    return <div className={`min-w-0 rounded-2xl border bg-card/60 p-3 ${compact ? "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between" : "space-y-3"}`}><div className="flex min-w-0 gap-3"><div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary">{file.kind === "image" && file.preview_url ? <img src={file.preview_url} alt="" className="size-full object-cover" /> : <Icon className="size-5" />}</div><div className="min-w-0"><div className="truncate font-medium">{file.title || file.original_name}</div><div className="truncate text-xs text-muted-foreground">{file.original_name}</div><div className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted-foreground"><span>{file.mime_type || kindLabels[file.kind] || file.kind}</span><span>·</span><span>{sizeLabel(file.size)}</span><span>·</span><span>{dateLabel(file.created_at)}</span></div></div></div><div className="flex flex-wrap items-center gap-2"><Badge variant={file.visibility === "public" ? "secondary" : "outline"}>{file.visibility === "public" ? "Публичный" : "Приватный"}</Badge><Button size="sm" variant="outline" asChild><Link href={`/files/${file.id}`}><Eye className="size-4" />Открыть</Link></Button><Button size="sm" variant="outline" onClick={onDownload}><Download className="size-4" />Скачать</Button>{file.visibility === "public" ? <Button size="sm" variant="outline" onClick={onCopy}><Copy className="size-4" />Ссылка</Button> : null}<Button size="sm" variant="outline" onClick={file.visibility === "public" ? onTogglePrivate : onPublish}>{file.visibility === "public" ? "Скрыть" : "Опубликовать"}</Button><Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="size-4" /></Button></div></div>
}

function EmptyState({ hasFilters, quotaFull, onReset, onUpload, onBiggest }: { hasFilters: boolean; quotaFull: boolean; onReset: () => void; onUpload: () => void; onBiggest: () => void }) {
    const title = quotaFull ? "Хранилище заполнено" : hasFilters ? "Ничего не найдено" : "Файлов пока нет"
    const text = quotaFull ? "Удалите ненужные файлы или сделайте их приватными, если достигнут лимит публичных файлов." : hasFilters ? "Попробуйте изменить поиск, тип файла или фильтр доступа." : "Загрузите изображение, PDF, архив, лог или код, чтобы использовать файл в чатах, публикациях и AI-помощнике."
    return <Empty className="border"><EmptyHeader><EmptyMedia variant="icon"><FolderOpen className="size-5" /></EmptyMedia><EmptyTitle>{title}</EmptyTitle><EmptyDescription>{text}</EmptyDescription></EmptyHeader><EmptyContent><Button onClick={quotaFull ? onBiggest : hasFilters ? onReset : onUpload}>{quotaFull ? "Показать самые большие файлы" : hasFilters ? "Сбросить фильтры" : "Загрузить первый файл"}</Button></EmptyContent></Empty>
}
