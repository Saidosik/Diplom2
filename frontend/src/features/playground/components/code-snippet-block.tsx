import Link from "next/link"
import { Code2, ExternalLink } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { ShikiCodeBlock } from "@/components/ui/ShikiCodeBlock"

type CodeSnippetBlockProps = {
    content: Record<string, unknown>
    compact?: boolean
}

function getString(value: unknown, fallback = "") {
    return typeof value === "string" ? value : fallback
}

export function CodeSnippetBlock({ content, compact = false }: CodeSnippetBlockProps) {
    const code = getString(content.code)
    const language = getString(content.language, "text")
    const title = getString(content.title, "Сниппет кода")
    const stdin = getString(content.stdin)
    const href = getString(content.href, content.snippet_id ? `/playground?snippet=${content.snippet_id}` : "/playground")
    const note = getString(content.note)

    if (!code) return null

    return (
        <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
            <div className="flex flex-col gap-3 border-b bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="gap-1.5">
                            <Code2 className="size-3.5" />
                            Сниппет
                        </Badge>
                        <Badge variant="outline">{language}</Badge>
                    </div>
                    <p className="line-clamp-1 font-medium">{title}</p>
                    {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
                </div>
                <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                    Открыть в песочнице
                    <ExternalLink className="size-3.5" />
                </Link>
            </div>

            <div className="space-y-4 p-4">
                <ShikiCodeBlock code={code} language={language} compact={compact} />
                {stdin ? (
                    <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">STDIN</p>
                        <pre className="overflow-x-auto rounded-2xl border bg-muted/40 p-3 text-sm leading-6"><code>{stdin}</code></pre>
                    </div>
                ) : null}
            </div>
        </div>
    )
}
