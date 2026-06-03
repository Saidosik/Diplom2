import type { ChatAttachment } from "@/features/chat/types"

function formatSize(size: number) {
    if (!size) return ""
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
    return `${(size / 1024 / 1024).toFixed(1)} MB`
}

export function ChatAttachmentView({ attachment }: { attachment: ChatAttachment }) {
    if (attachment.kind === "image") {
        return (
            <a href={attachment.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={attachment.url} alt={attachment.original_name} className="max-h-80 w-full object-contain" />
            </a>
        )
    }

    if (attachment.kind === "video") {
        return <video src={attachment.url} controls className="max-h-80 w-full rounded-xl border bg-muted" />
    }

    if (attachment.kind === "audio") {
        return <audio src={attachment.url} controls className="w-full" />
    }

    return (
        <a href={attachment.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-xl border bg-muted/50 p-3 text-sm hover:bg-muted">
            <span className="min-w-0 truncate font-medium">{attachment.original_name}</span>
            <span className="shrink-0 text-muted-foreground">{formatSize(attachment.size)}</span>
        </a>
    )
}
