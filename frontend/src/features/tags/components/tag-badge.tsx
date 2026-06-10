"use client"

import Link from "next/link"

import { cn } from "@/lib/utils"
import { getRepresentativeSurface, getTagBadgeStyle } from "@/features/tags/lib/color"
import { type ThemeSurface, useCurrentThemeName, useReadableThemeColors } from "@/features/tags/lib/theme-colors"

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
    surface?: Pick<ThemeSurface, "background" | "foreground">
}

export function TagBadge({ tag, className, showHash = true, compact = false, surface }: TagBadgeProps) {
    const surfaces = useReadableThemeColors()
    const currentTheme = useCurrentThemeName()
    const effectiveSurface = surface ?? getRepresentativeSurface(surfaces, currentTheme)

    return (
        <Link
            href={`/tags/${tag.slug}`}
            className={cn(
                "inline-flex max-w-full items-center rounded-full border font-medium leading-none transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs",
                className,
            )}
            style={getTagBadgeStyle(tag.color, effectiveSurface)}
        >
            <span className="truncate">{showHash ? `#${tag.name}` : tag.name}</span>
        </Link>
    )
}
