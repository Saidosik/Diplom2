"use client"

import * as React from "react"

import { CopyCodeButton } from "@/components/ui/CopyCodeButton"
import { cn } from "@/lib/utils"

type ShikiCodeBlockProps = {
    code: string
    language?: string | null
    filename?: string | null
    compact?: boolean
    className?: string
}

function normalizeLanguage(language?: string | null) {
    const value = language?.trim().toLowerCase()

    if (!value) return "text"

    const aliases: Record<string, string> = {
        js: "javascript",
        jsx: "jsx",
        ts: "typescript",
        tsx: "tsx",
        html: "html",
        css: "css",
        php: "php",
        blade: "php",
        bash: "bash",
        shell: "bash",
        sh: "bash",
        json: "json",
        sql: "sql",
        postgres: "sql",
        postgresql: "sql",
    }

    return aliases[value] || value
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;")
}

export function ShikiCodeBlock({
    code,
    language,
    filename,
    compact = false,
    className,
}: ShikiCodeBlockProps) {
    const [html, setHtml] = React.useState<string>("")
    const [failed, setFailed] = React.useState(false)

    const normalizedLanguage = normalizeLanguage(language)
    const label = filename || normalizedLanguage

    React.useEffect(() => {
        let cancelled = false

        async function highlight() {
            try {
                const { codeToHtml } = await import("shiki")
                const highlighted = await codeToHtml(code || " ", {
                    lang: normalizedLanguage as never,
                    theme: "dark-plus",
                })

                if (!cancelled) {
                    setHtml(highlighted)
                    setFailed(false)
                }
            } catch (error) {
                console.log("[SHIKI_HIGHLIGHT_ERROR]", error)

                if (!cancelled) {
                    setHtml(escapeHtml(code || ""))
                    setFailed(true)
                }
            }
        }

        highlight()

        return () => {
            cancelled = true
        }
    }, [code, normalizedLanguage])

    return (
        <div
            className={cn(
                "overflow-hidden rounded-2xl border border-zinc-800/90 bg-[#050505] text-zinc-100 shadow-sm",
                "ring-1 ring-white/5",
                className
            )}
        >
            {!compact && (
                <div className="flex items-center justify-between gap-3 border-b border-zinc-800 bg-[#0b0b0b] px-4 py-2.5 text-xs text-zinc-300">
                    <span className="truncate font-mono">{label}</span>
                    <CopyCodeButton code={code} />
                </div>
            )}

            {html ? (
                failed ? (
                    <pre className="overflow-x-auto bg-[#050505] p-4 font-mono text-[13px] leading-7 text-zinc-100">
                        <code>{code}</code>
                    </pre>
                ) : (
                    <div
                        className={cn(
                            "overflow-x-auto bg-[#050505] font-mono text-[13px] leading-7",
                            compact
                                ? "[&_.shiki]:!my-0 [&_.shiki]:!rounded-xl [&_.shiki]:!p-4"
                                : "[&_.shiki]:!m-0 [&_.shiki]:!bg-[#050505] [&_.shiki]:!p-4",
                            "[&_.shiki]:min-w-full [&_.shiki]:overflow-x-auto [&_.shiki]:!text-[13px]",
                            "[&_.line]:min-h-6"
                        )}
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                )
            ) : (
                <pre className="overflow-x-auto bg-[#050505] p-4 font-mono text-[13px] leading-7 text-zinc-300">
                    <code>{code || "Загрузка подсветки синтаксиса..."}</code>
                </pre>
            )}
        </div>
    )
}
