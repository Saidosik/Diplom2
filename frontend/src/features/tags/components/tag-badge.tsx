import Link from "next/link"

import { cn } from "@/lib/utils"

export type TagBadgeData = {
    id?: number | string
    name: string
    slug: string
    color?: string | null
}

type TagBadgeProps = {
    tag: TagBadgeData
    className?: string
    showHash?: boolean
    compact?: boolean
}

const FALLBACK_TAG_COLOR = "#ffffff"

function getTagColor(color?: string | null) {
    const trimmed = color?.trim()

    return trimmed || FALLBACK_TAG_COLOR
}

function getTagBackground(color: string) {
    if (/^#[0-9a-f]{6}$/i.test(color)) {
        return `${color}14`
    }

    if (/^#[0-9a-f]{3}$/i.test(color)) {
        const [, r, g, b] = color
        return `#${r}${r}${g}${g}${b}${b}14`
    }

    return "rgb(255 255 255 / 0.06)"
}

export function TagBadge({ tag, className, showHash = true, compact = false }: TagBadgeProps) {
    const tagColor = getTagColor(tag.color)

    return (
        <Link
            href={`/tags/${tag.slug}`}
            className={cn(
                "inline-flex max-w-full items-center border font-medium leading-none transition-all hover:-translate-y-0.5 hover:bg-muted/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs",
                className,
            )}
            style={{
                borderColor: tagColor,
                color: tagColor,
                backgroundColor: getTagBackground(tagColor),
            }}
        >
            <span className="truncate">{showHash ? `#${tag.name}` : tag.name}</span>
        </Link>
    )
}
