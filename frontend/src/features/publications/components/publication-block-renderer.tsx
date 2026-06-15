import { AlertTriangle, Info, LinkIcon, Quote } from "lucide-react"

import { MarkdownBlock } from "@/components/ui/MarkdownBlock"
import { ShikiCodeBlock } from "@/components/ui/ShikiCodeBlock"
import { CodeSnippetBlock } from "@/features/playground/components/code-snippet-block"
import { VideoBlockClient } from "@/components/ui/VideoBlockClient"
import { cn } from "@/lib/utils"
import type { PublicationBlock } from "@/features/publications/types"

type PublicationBlockRendererProps = {
    block: PublicationBlock
    compact?: boolean
}

function getString(value: unknown, fallback = "") {
    return typeof value === "string" ? value : fallback
}

function getNumber(value: unknown, fallback: number) {
    return typeof value === "number" ? value : fallback
}

function getCalloutClasses(variant: string) {
    if (variant === "warning") return "border-destructive/30 bg-destructive/5"
    if (variant === "success") return "border-primary/30 bg-primary/5"
    if (variant === "tip") return "border-emerald-500/30 bg-emerald-500/5"
    return "border-sky-500/30 bg-sky-500/5"
}

export function PublicationBlockRenderer({ block, compact = false }: PublicationBlockRendererProps) {
    const content = block.content || block.properties || {}

    switch (block.type) {
        case "heading": {
            const level = Math.min(Math.max(getNumber(content.level, 2), 1), 3)
            const text = getString(content.text)

            if (!text) return null

            if (level === 1) {
                return <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">{text}</h1>
            }

            if (level === 3) {
                return <h3 className="text-2xl font-semibold tracking-tight">{text}</h3>
            }

            return <h2 className="text-3xl font-semibold tracking-tight">{text}</h2>
        }

        case "paragraph": {
            const text = getString(content.text)
            if (!text) return null

            return <p className="text-base leading-8 text-muted-foreground md:text-lg">{text}</p>
        }

        case "markdown": {
            const text = getString(content.text)
            if (!text) return null

            return <MarkdownBlock content={text} />
        }

        case "image": {
            const src = getString(content.src)
            if (!src) return null

            return (
                <figure className="space-y-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={src}
                        alt={getString(content.alt, "Изображение публикации")}
                        className="w-full rounded-3xl border object-cover shadow-sm"
                    />
                    {getString(content.caption) && (
                        <figcaption className="text-center text-sm text-muted-foreground">
                            {getString(content.caption)}
                        </figcaption>
                    )}
                </figure>
            )
        }

        case "video": {
            const url = getString(content.url)
            if (!url) return null

            return <VideoBlockClient url={url} title={getString(content.title, "Видео публикации")} />
        }

        case "code": {
            const code = getString(content.code)
            if (!code) return null

            return (
                <ShikiCodeBlock
                    code={code}
                    language={getString(content.language, "text")}
                    filename={getString(content.filename)}
                    compact={compact}
                />
            )
        }

        case "terminal": {
            const command = getString(content.command)
            const output = getString(content.output)
            if (!command && !output) return null

            return (
                <div className="overflow-hidden rounded-3xl border bg-zinc-950 text-zinc-100 shadow-sm">
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs text-zinc-400">
                        <span>{getString(content.shell, "bash")}</span>
                        {getString(content.cwd) ? <span>{getString(content.cwd)}</span> : null}
                    </div>
                    <pre className="overflow-x-auto p-4 text-sm leading-6"><code>{command ? `$ ${command}\n` : ""}{output}</code></pre>
                </div>
            )
        }

        case "diff": {
            const code = getString(content.code)
            if (!code) return null

            return (
                <ShikiCodeBlock
                    code={code}
                    language={getString(content.language, "diff")}
                    filename={getString(content.filename)}
                    compact={compact}
                />
            )
        }

        case "file_tree": {
            const tree = getString(content.tree)
            if (!tree) return null

            return (
                <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
                    {getString(content.title) ? (
                        <div className="border-b bg-muted/40 px-4 py-2 text-sm font-medium">{getString(content.title)}</div>
                    ) : null}
                    <pre className="overflow-x-auto p-4 font-mono text-sm leading-7 text-muted-foreground"><code>{tree}</code></pre>
                </div>
            )
        }

        case "code_snippet":
            return <CodeSnippetBlock content={content} compact={compact} />

        case "callout": {
            const text = getString(content.text)
            if (!text) return null

            const variant = getString(content.variant, "info")

            return (
                <div className={cn("rounded-3xl border p-5", getCalloutClasses(variant))}>
                    {getString(content.title) ? <p className="mb-2 font-semibold">{getString(content.title)}</p> : null}
                    <div className="text-sm leading-7 text-muted-foreground">{text}</div>
                </div>
            )
        }

        case "quote": {
            const text = getString(content.text)
            if (!text) return null

            return (
                <blockquote className="rounded-3xl border-l-4 border-primary bg-muted/40 p-5 text-lg leading-8">
                    <Quote className="mb-3 size-5 text-primary" />
                    {text}
                </blockquote>
            )
        }

        case "important":
        case "warning": {
            const text = getString(content.text)
            if (!text) return null

            const isWarning = block.type === "warning"

            return (
                <div
                    className={cn(
                        "flex gap-3 rounded-3xl border p-5 text-sm leading-7",
                        isWarning ? "bg-destructive/5 text-foreground" : "bg-primary/5 text-foreground"
                    )}
                >
                    {isWarning ? <AlertTriangle className="mt-1 size-5 text-destructive" /> : <Info className="mt-1 size-5 text-primary" />}
                    <div>{text}</div>
                </div>
            )
        }

        case "link": {
            const url = getString(content.url)
            if (!url) return null

            return (
                <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex gap-3 rounded-3xl border bg-card p-5 transition-colors hover:bg-muted/40"
                >
                    <LinkIcon className="mt-1 size-5 text-primary" />
                    <span className="space-y-1">
                        <span className="block font-medium">{getString(content.title, url)}</span>
                        {getString(content.description) && (
                            <span className="block text-sm text-muted-foreground">{getString(content.description)}</span>
                        )}
                    </span>
                </a>
            )
        }

        case "table": {
            const rows = Array.isArray(content.rows) ? content.rows as string[][] : [["Параметр", "Значение"], ["SLA", "99.9%"]]
            return <div className="overflow-hidden rounded-3xl border"><table className="w-full text-sm"><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="border-b last:border-0">{row.map((cell, cellIndex) => rowIndex === 0 ? <th key={cellIndex} className="bg-muted/60 p-3 text-left font-semibold">{cell}</th> : <td key={cellIndex} className="p-3 text-muted-foreground">{cell}</td>)}</tr>)}</tbody></table></div>
        }

        case "diagram": {
            const source = getString(content.source)
            if (!source) return null
            return <div className="rounded-3xl border bg-card p-4"><p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Mermaid diagram</p><pre className="overflow-x-auto text-sm"><code>{source}</code></pre>{getString(content.caption) ? <p className="mt-2 text-center text-xs text-muted-foreground">{getString(content.caption)}</p> : null}</div>
        }

        case "divider":
            return <div className={compact ? "h-px bg-border" : "my-8 h-px bg-border"} />

        default:
            return null
    }
}
