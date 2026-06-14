"use client"

import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Copy, Download, EyeOff, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { deleteMyFile, getMyFile, getMyFileTextPreview, updateMyFile } from "@/features/files/api"
import { absoluteShareUrl, dateLabel, fileIcon, sizeLabel } from "./file-utils"
import { useState, type ReactNode } from "react"

export function FilePreviewPage({ id }: { id: number }) {
    const queryClient = useQueryClient()
    const [confirmPublic, setConfirmPublic] = useState(false)
    const fileQuery = useQuery({ queryKey: ["file", id], queryFn: () => getMyFile(id), enabled: Number.isFinite(id) })
    const file = fileQuery.data
    const textPreview = useQuery({ queryKey: ["file-preview", id], queryFn: () => getMyFileTextPreview(id), enabled: Boolean(file?.kind === "text") })
    const updateMutation = useMutation({ mutationFn: (visibility: "private" | "public") => updateMyFile(id, { visibility }), onSuccess: (next) => { toast.success(next.visibility === "public" ? "Файл стал публичным" : "Файл стал приватным"); queryClient.invalidateQueries({ queryKey: ["file", id] }) }, onError: (e: Error) => toast.error(e.message) })
    const deleteMutation = useMutation({ mutationFn: () => deleteMyFile(id), onSuccess: () => { toast.success("Файл удалён"); window.location.href = "/files" }, onError: (e: Error) => toast.error(e.message) })

    if (fileQuery.isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-96 rounded-2xl" /></div>
    if (!file) return <Card><CardHeader><CardTitle>Файл не найден</CardTitle></CardHeader><CardContent><Button asChild><Link href="/files">Вернуться к файлам</Link></Button></CardContent></Card>
    const Icon = fileIcon(file.kind)
    const share = absoluteShareUrl(file.share_url)

    return <div className="space-y-6 overflow-x-hidden">
        <Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink asChild><Link href="/files">Мои файлы</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>{file.title || file.original_name}</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><h1 className="break-words text-3xl font-semibold tracking-tight">{file.title || file.original_name}</h1><p className="mt-1 text-muted-foreground">Безопасный просмотр и действия с файлом.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" asChild><a href={file.download_url || "#"}><Download className="size-4" />Скачать</a></Button>{share ? <Button variant="outline" onClick={() => navigator.clipboard.writeText(share).then(() => toast.success("Ссылка скопирована"))}><Copy className="size-4" />Скопировать ссылку</Button> : null}<Button variant="outline" onClick={() => file.visibility === "public" ? updateMutation.mutate("private") : setConfirmPublic(true)}><EyeOff className="size-4" />{file.visibility === "public" ? "Сделать приватным" : "Сделать публичным"}</Button><Button variant="destructive" onClick={() => deleteMutation.mutate()}><Trash2 className="size-4" />Удалить</Button></div></div>
        <div className="grid gap-4 xl:grid-cols-[320px_1fr]"><Card><CardHeader><CardTitle>Метаданные</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><Meta label="Оригинальное имя" value={file.original_name} /><Meta label="Размер" value={sizeLabel(file.size)} /><Meta label="MIME/type" value={file.mime_type || file.kind} /><Meta label="Доступ" value={<Badge variant={file.visibility === "public" ? "secondary" : "outline"}>{file.visibility === "public" ? "Публичный" : "Приватный"}</Badge>} /><Meta label="Дата загрузки" value={dateLabel(file.created_at)} /></CardContent></Card><Card><CardHeader><CardTitle>Предпросмотр</CardTitle></CardHeader><CardContent><div className="flex min-h-80 items-center justify-center overflow-hidden rounded-2xl border bg-muted/20 p-3">{file.kind === "image" && file.preview_url ? <a href={file.preview_url} target="_blank"><img src={file.preview_url} alt={file.original_name} className="max-h-[70vh] rounded-xl object-contain" /></a> : file.kind === "pdf" && file.preview_url ? <iframe src={file.preview_url} className="h-[70vh] w-full rounded-xl" title={file.original_name} /> : file.kind === "audio" && file.preview_url ? <audio controls src={file.preview_url} className="w-full" /> : file.kind === "video" && file.preview_url ? <video controls src={file.preview_url} className="max-h-[70vh] w-full rounded-xl" /> : file.kind === "text" ? <pre className="max-h-[70vh] w-full overflow-auto whitespace-pre-wrap break-words rounded-xl bg-background p-4 font-mono text-sm">{textPreview.data?.content ?? "Загружаем предпросмотр..."}{textPreview.data?.truncated ? "\n\n…предпросмотр ограничен первыми 200 КБ" : ""}</pre> : <div className="text-center text-muted-foreground"><Icon className="mx-auto mb-3 size-10" />Предпросмотр недоступен</div>}</div></CardContent></Card></div>
        <AlertDialog open={confirmPublic} onOpenChange={setConfirmPublic}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Сделать файл публичным?</AlertDialogTitle><AlertDialogDescription>Файл станет доступен другим пользователям. Не публикуйте персональные данные, пароли, токены, ключи API и приватные документы.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><AlertDialogAction onClick={() => updateMutation.mutate("public")}>Сделать публичным</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
}

function Meta({ label, value }: { label: string; value: ReactNode }) { return <div className="space-y-1"><div className="text-muted-foreground">{label}</div><div className="break-words font-medium">{value}</div></div> }
