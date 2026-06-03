import { Download, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ContentAttachment } from "@/features/files/components/content-attachments-field"

export function ContentAttachmentList({ attachments }: { attachments?: ContentAttachment[] | null }) {
    if (!attachments?.length) return null

    return (
        <Card className="border-dashed shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="size-4" />
                    Прикреплённые файлы
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
                {attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between gap-3 rounded-2xl border bg-muted/20 p-3 text-sm">
                        <div className="min-w-0">
                            <p className="truncate font-medium">{attachment.original_name}</p>
                            <p className="text-xs text-muted-foreground">{attachment.kind || "file"} · {formatBytes(attachment.size)}</p>
                        </div>
                        {attachment.download_url ? (
                            <Button size="icon-sm" variant="outline" asChild>
                                <a href={attachment.download_url} target="_blank" rel="noreferrer" aria-label="Скачать файл">
                                    <Download className="size-4" />
                                </a>
                            </Button>
                        ) : null}
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

function formatBytes(value: number) {
    if (!value) return "0 Б"
    if (value < 1024) return `${value} Б`
    if (value < 1024 * 1024) return `${Math.round(value / 1024)} КБ`
    return `${(value / 1024 / 1024).toFixed(1)} МБ`
}
