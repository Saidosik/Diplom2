import type { CSSProperties } from "react"
import { colorToHex, getThemeColorFallback, type ThemeName, type ThemeSurface } from "@/features/tags/lib/theme-colors"

export const FALLBACK_TAG_COLOR = getThemeColorFallback("light", "primary")

export type ReadabilityStatus = "good" | "acceptable" | "poor"

export type ReadabilityResult = {
    ratio: number
    status: ReadabilityStatus
    label: string
}

export function isValidHexColor(color?: string | null) {
    return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(color?.trim() ?? "")
}

export function normalizeHexColor(color?: string | null) {
    return colorToHex(color) ?? FALLBACK_TAG_COLOR
}

function hexToRgb(hex: string) {
    const normalized = normalizeHexColor(hex).slice(1)
    return {
        r: Number.parseInt(normalized.slice(0, 2), 16),
        g: Number.parseInt(normalized.slice(2, 4), 16),
        b: Number.parseInt(normalized.slice(4, 6), 16),
    }
}

function rgbToHex(value: number) {
    return Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, "0")
}

function withAlpha(color: string, alpha: number) {
    const { r, g, b } = hexToRgb(color)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function blend(foreground: string, background: string, alpha: number) {
    const fg = hexToRgb(foreground)
    const bg = hexToRgb(background)
    return `#${rgbToHex((fg.r * alpha) + (bg.r * (1 - alpha)))}${rgbToHex((fg.g * alpha) + (bg.g * (1 - alpha)))}${rgbToHex((fg.b * alpha) + (bg.b * (1 - alpha)))}`
}

function channelToLinear(value: number) {
    const channel = value / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(hex: string) {
    const { r, g, b } = hexToRgb(hex)
    return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b)
}

export function contrastRatio(foreground: string, background: string) {
    const fg = relativeLuminance(foreground)
    const bg = relativeLuminance(background)
    const lighter = Math.max(fg, bg)
    const darker = Math.min(fg, bg)
    return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100
}

export function readabilityStatus(ratio: number): ReadabilityStatus {
    if (ratio >= 4.5) return "good"
    if (ratio >= 3) return "acceptable"
    return "poor"
}

export function readabilityLabel(status: ReadabilityStatus) {
    if (status === "good") return "Контраст: хороший"
    if (status === "acceptable") return "Контраст: допустимый"
    return "Контраст: низкий"
}

export function calculateReadability(color?: string | null, background?: string | null) {
    const normalized = normalizeHexColor(color)
    const surfaceBackground = normalizeHexColor(background ?? getThemeColorFallback("light", "background"))
    const ratio = contrastRatio(normalized, surfaceBackground)
    const status = readabilityStatus(ratio)

    return {
        color: normalized,
        background: surfaceBackground,
        ratio,
        status,
        label: readabilityLabel(status),
    }
}

export function calculateSurfaceReadability(color: string | null | undefined, surface: ThemeSurface) {
    return calculateReadability(color, surface.background)
}

export function getRepresentativeSurface(surfaces: ThemeSurface[], theme: ThemeName = "dark") {
    return surfaces.find((surface) => surface.theme === theme && surface.backgroundToken === "card")
        ?? surfaces.find((surface) => surface.theme === theme)
}

export function getTagBadgeStyle(color?: string | null, surface?: Pick<ThemeSurface, "background" | "foreground"> | null): CSSProperties {
    const normalized = normalizeHexColor(color)
    const background = normalizeHexColor(surface?.background ?? getThemeColorFallback("dark", "card"))
    const surfaceForeground = normalizeHexColor(surface?.foreground ?? getThemeColorFallback("dark", "card-foreground"))
    const alpha = contrastRatio(normalized, background) >= 3 ? 0.16 : 0.10
    const badgeBackground = blend(normalized, background, alpha)
    const textCandidates = [surfaceForeground, normalized, background]
    const textColor = textCandidates
        .map((candidate) => ({ candidate, ratio: contrastRatio(candidate, badgeBackground) }))
        .sort((a, b) => b.ratio - a.ratio)[0]?.candidate ?? surfaceForeground

    return {
        color: textColor,
        borderColor: withAlpha(normalized, 0.58),
        backgroundColor: withAlpha(normalized, alpha),
        boxShadow: `inset 0 0 0 1px ${withAlpha(normalized, 0.14)}`,
    }
}
