"use client"

import * as React from "react"
import { FileText, Loader2, Paperclip, Plus, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { uploadMyFile, getMyFiles } from "@/features/files/api"
import type { UserFile } from "@/features/files/types"

export type ContentAttachment = {
    id: number
    user_file_id: number
    title?: string | null
    original_name: string
    mime_type?: string | null
    size: number
    kind?: string | null
    visibility?: "private" | "public" | string
    download_url?: string | null
}

type ContentAttachmentsFieldProps = {
    value: number[]
    onChange: (value: number[]) => void
    initialAttachments?: ContentAttachment[]
    description?: string
}

export function ContentAttachmentsField({ value, onChange, initialAttachments = [], description }: ContentAttachmentsFieldProps) {
    const [files, setFiles] = React.useState<UserFile[]>(() => initialAttachments.map((attachment) => ({
        id: attachment.user_file_id,
        title: attachment.title,
        original_name: attachment.original_name,
        mime_type: attachment.mime_type,
        size: attachment.size,
        kind: attachment.kind || "file",
        visibility: (attachment.visibility as "private" | "public") || "private",
        download_url: attachment.download_url,
    })))
    const [isUploading, setIsUploading] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement | null>(null)

    React.useEffect(() => {
        getMyFiles({ per_page: 60 })
            .then((payload) => {
                setFiles((current) => mergeFiles(current, payload.data ?? []))
            })
            .catch(() => null)
    }, [])

    const selectedFiles = React.useMemo(() => files.filter((file) => value.includes(file.id)), [files, value])

    function addFile(id: number) {
        if (!value.includes(id)) {
            onChange([...value, id].slice(0, 12))
        }
    }

    function removeFile(id: number) {
        onChange(value.filter((item) => item !== id))
    }

    async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
        const selected = Array.from(event.target.files ?? [])
        if (!selected.length) return

        setIsUploading(true)
        try {
            const uploaded: UserFile[] = []
            for (const file of selected.slice(0, 6)) {
                uploaded.push(await uploadMyFile({ file, visibility: "private" }))
            }
            setFiles((current) => mergeFiles(uploaded, current))
            onChange([...value, ...uploaded.map((file) => file.id)].filter(unique).slice(0, 12))
            toast.success("Файлы прикреплены")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Не удалось загрузить файл")
        } finally {
            setIsUploading(false)
            if (inputRef.current) inputRef.current.value = ""
        }
    }

    return (
        <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-medium">Вложения</p>
                    <p className="text-xs text-muted-foreground">
                        {description || "Прикрепи файлы из личного хранилища или загрузи новые."}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <input ref={inputRef} type="file" multiple className="hidden" onChange={handleUpload} />
                    <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={isUploading}>
                        {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
                        Загрузить
                    </Button>
                    <Select value="" onValueChange={(raw) => addFile(Number(raw))}>
                        <SelectTrigger className="h-9 w-[220px]">
                            <SelectValue placeholder="Из моих файлов" />
                        </SelectTrigger>
                        <SelectContent>
                            {files.length ? files.map((file) => (
                                <SelectItem key={file.id} value={String(file.id)} disabled={value.includes(file.id)}>
                                    {file.original_name}
                                </SelectItem>
                            )) : (
                                <SelectItem value="empty" disabled>Файлов пока нет</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {selectedFiles.length ? (
                <div className="flex flex-wrap gap-2">
                    {selectedFiles.map((file) => (
                        <span key={file.id} className="inline-flex max-w-full items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs">
                            <FileText className="size-3.5 text-muted-foreground" />
                            <span className="max-w-64 truncate">{file.original_name}</span>
                            <button type="button" onClick={() => removeFile(file.id)} className="text-muted-foreground hover:text-foreground" aria-label="Убрать файл">
                                <X className="size-3.5" />
                            </button>
                        </span>
                    ))}
                </div>
            ) : null}
        </div>
    )
}

function mergeFiles(a: UserFile[], b: UserFile[]) {
    const map = new Map<number, UserFile>()
    ;[...a, ...b].forEach((file) => map.set(file.id, file))
    return Array.from(map.values())
}

function unique(value: number, index: number, array: number[]) {
    return array.indexOf(value) === index
}
