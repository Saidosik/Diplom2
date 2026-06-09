import Link from "next/link"

import { cn } from "@/lib/utils"
import { getTagBadgeStyle } from "@/features/tags/lib/color"

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

export function TagBadge({ tag, className, showHash = true, compact = false }: TagBadgeProps) {
    return (
        <Link
            href={`/tags/${tag.slug}`}
            className={cn(
                "inline-flex max-w-full items-center rounded-full border font-medium leading-none transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs",
                className,
            )}
            style={getTagBadgeStyle(tag.color)}
        >
            <span className="truncate">{showHash ? `#${tag.name}` : tag.name}</span>
        </Link>
    )
}
