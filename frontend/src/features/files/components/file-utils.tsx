import { FileArchive, FileAudio, FileCode2, FileImage, FileText, FileVideo } from "lucide-react"

export const kindLabels: Record<string, string> = { image: "Изображения", video: "Видео", audio: "Аудио", pdf: "PDF", archive: "Архивы", text: "Текст/код", file: "Файлы" }

export function fileIcon(kind: string) {
    if (kind === "image") return FileImage
    if (kind === "video") return FileVideo
    if (kind === "audio") return FileAudio
    if (kind === "archive") return FileArchive
    if (kind === "text") return FileCode2
    return FileText
}

export function sizeLabel(bytes: number) {
    if (bytes < 1024) return `${bytes} Б`
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} МБ`
    return `${Math.round(bytes / 1024)} КБ`
}

export function dateLabel(value?: string | null) {
    if (!value) return "—"
    return new Date(value).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export function absoluteShareUrl(path?: string | null) {
    if (!path) return null
    if (typeof window === "undefined") return path
    return `${window.location.origin}${path}`
}
