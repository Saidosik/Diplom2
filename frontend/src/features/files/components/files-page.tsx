"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Download, FileArchive, FileAudio, FileCode2, FileImage, FileText, FileVideo, FolderOpen, Loader2, Search, Trash2, UploadCloud } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { deleteMyFile, getMyFiles, updateMyFile, uploadMyFile } from "@/features/files/api"
import type { UserFile } from "@/features/files/types"

const kindLabels: Record<string, string> = {
    image: "Изображения",
    video: "Видео",
    audio: "Аудио",
    pdf: "PDF",
    archive: "Архивы",
    text: "Текст/код",
    file: "Файлы",
}

function fileIcon(kind: string) {
    if (kind === "image") return FileImage
    if (kind === "video") return FileVideo
    if (kind === "audio") return FileAudio
    if (kind === "archive") return FileArchive
    if (kind === "text") return FileCode2
    return FileText
}

function sizeLabel(bytes: number) {
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
    return `${Math.max(1, Math.round(bytes / 1024))} КБ`
}

function dateLabel(value?: string | null) {
    if (!value) return "—"
    return new Date(value).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export function FilesPage() {
    const queryClient = useQueryClient()
    const [q, setQ] = useState("")
    const [kind, setKind] = useState("all")
    const [visibility, setVisibility] = useState("all")
    const [uploadVisibility, setUploadVisibility] = useState<"private" | "public">("private")
    const [title, setTitle] = useState("")

    const filesQuery = useQuery({
        queryKey: ["files", q, kind, visibility],
        queryFn: () => getMyFiles({
            q: q || undefined,
            kind: kind === "all" ? undefined : kind,
            visibility: visibility === "all" ? undefined : visibility,
            per_page: 50,
        }),
    })

    const uploadMutation = useMutation({
        mutationFn: uploadMyFile,
        onSuccess: () => {
            toast.success("Файл загружен")
            setTitle("")
            queryClient.invalidateQueries({ queryKey: ["files"] })
        },
        onError: (error: Error) => toast.error(error.message),
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, nextVisibility }: { id: number; nextVisibility: "private" | "public" }) => updateMyFile(id, { visibility: nextVisibility }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["files"] }),
        onError: (error: Error) => toast.error(error.message),
    })

    const deleteMutation = useMutation({
        mutationFn: deleteMyFile,
        onSuccess: () => {
            toast.success("Файл удалён")
            queryClient.invalidateQueries({ queryKey: ["files"] })
        },
        onError: (error: Error) => toast.error(error.message),
    })

    const files = filesQuery.data?.data ?? []
    const summary = useMemo(() => {
        const totalSize = files.reduce((sum, file) => sum + file.size, 0)
        const publicCount = files.filter((file) => file.visibility === "public").length
        return { totalSize, publicCount }
    }, [files])

    function handleFileInput(files: FileList | null) {
        const file = files?.item(0)
        if (!file) return
        uploadMutation.mutate({ file, title: title.trim() || undefined, visibility: uploadVisibility })
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <Badge variant="outline" className="mb-3 gap-2"><FolderOpen className="size-3.5" /> Личное хранилище</Badge>
                    <h1 className="text-3xl font-semibold tracking-tight">Мои файлы</h1>
                    <p className="mt-1 text-muted-foreground">Загружай изображения, PDF, архивы, логи и код, чтобы использовать их в чатах, публикациях и демонстрации проекта.</p>
                </div>
                <div className="flex gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary">{files.length} файлов</Badge>
                    <Badge variant="outline">{sizeLabel(summary.totalSize)}</Badge>
                    <Badge variant="outline">{summary.publicCount} публичных</Badge>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                <Card>
                    <CardHeader>
                        <CardTitle>Добавить файл</CardTitle>
                        <CardDescription>По умолчанию файл приватный и доступен только владельцу.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Название</Label>
                            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Например: backend-error.log" />
                        </div>
                        <div className="space-y-2">
                            <Label>Доступ</Label>
                            <Select value={uploadVisibility} onValueChange={(value) => setUploadVisibility(value as "private" | "public")}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="private">Приватный</SelectItem>
                                    <SelectItem value="public">Публичный</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/30 p-6 text-center hover:bg-muted/50">
                            {uploadMutation.isPending ? <Loader2 className="mb-3 size-8 animate-spin text-primary" /> : <UploadCloud className="mb-3 size-8 text-primary" />}
                            <span className="font-medium">Выбрать файл</span>
                            <span className="mt-1 text-sm text-muted-foreground">До 20 МБ, изображения/PDF/архивы/текст/код</span>
                            <input type="file" className="hidden" disabled={uploadMutation.isPending} onChange={(event) => { handleFileInput(event.target.files); event.currentTarget.value = "" }} />
                        </label>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Библиотека</CardTitle>
                        <CardDescription>Фильтруй личные и публичные файлы по типу.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-[1fr_160px_160px]">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Поиск по файлам" className="pl-9" />
                            </div>
                            <Select value={kind} onValueChange={setKind}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Все типы</SelectItem>
                                    {Object.entries(kindLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={visibility} onValueChange={setVisibility}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Любой доступ</SelectItem>
                                    <SelectItem value="private">Приватные</SelectItem>
                                    <SelectItem value="public">Публичные</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            {files.map((file) => <FileRow key={file.id} file={file} onToggleVisibility={(nextVisibility) => updateMutation.mutate({ id: file.id, nextVisibility })} onDelete={() => deleteMutation.mutate(file.id)} />)}
                            {!filesQuery.isLoading && files.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">Файлы не найдены.</p> : null}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function FileRow({ file, onToggleVisibility, onDelete }: { file: UserFile; onToggleVisibility: (visibility: "private" | "public") => void; onDelete: () => void }) {
    const Icon = fileIcon(file.kind)

    return (
        <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-3 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></div>
                <div className="min-w-0">
                    <div className="truncate font-medium">{file.title || file.original_name}</div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{file.original_name}</span>
                        <span>·</span>
                        <span>{sizeLabel(file.size)}</span>
                        <span>·</span>
                        <span>{dateLabel(file.created_at)}</span>
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <Badge variant={file.visibility === "public" ? "secondary" : "outline"}>{file.visibility === "public" ? "Публичный" : "Приватный"}</Badge>
                <Button size="sm" variant="outline" onClick={() => onToggleVisibility(file.visibility === "public" ? "private" : "public")}>{file.visibility === "public" ? "Скрыть" : "Опубликовать"}</Button>
                {file.download_url ? <Button size="sm" variant="outline" asChild><a href={file.download_url}><Download className="size-4" /></a></Button> : null}
                <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="size-4" /></Button>
            </div>
        </div>
    )
}
