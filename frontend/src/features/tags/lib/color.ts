import type { CSSProperties } from "react"

export const FALLBACK_TAG_COLOR = "#38bdf8"

export type ReadabilityStatus = "good" | "acceptable" | "poor"

export type ReadabilityResult = {
    ratio: number
    status: ReadabilityStatus
    label: string
}

export function normalizeHexColor(color?: string | null) {
    const value = color?.trim() ?? ""
    if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase()
    if (/^#[0-9a-f]{3}$/i.test(value)) {
        const [, r, g, b] = value
        return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
    }
    return FALLBACK_TAG_COLOR
}

function hexToRgb(hex: string) {
    const normalized = normalizeHexColor(hex).slice(1)
    return {
        r: Number.parseInt(normalized.slice(0, 2), 16),
        g: Number.parseInt(normalized.slice(2, 4), 16),
        b: Number.parseInt(normalized.slice(4, 6), 16),
    }
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
    if (status === "good") return "Хорошо читается"
    if (status === "acceptable") return "Допустимо"
    return "Плохо читается"
}

export function calculateReadability(color?: string | null) {
    const normalized = normalizeHexColor(color)
    const lightRatio = contrastRatio(normalized, "#ffffff")
    const darkRatio = contrastRatio(normalized, "#0f172a")
    const lightStatus = readabilityStatus(lightRatio)
    const darkStatus = readabilityStatus(darkRatio)

    return {
        color: normalized,
        light: { ratio: lightRatio, status: lightStatus, label: readabilityLabel(lightStatus) },
        dark: { ratio: darkRatio, status: darkStatus, label: readabilityLabel(darkStatus) },
    }
}

function alphaHex(color: string, alpha: string) {
    return `${normalizeHexColor(color)}${alpha}`
}

export function getTagBadgeStyle(color?: string | null, theme: "light" | "dark" = "dark"): CSSProperties {
    const normalized = normalizeHexColor(color)
    const background = theme === "dark" ? "#0f172a" : "#ffffff"
    const textCandidates = theme === "dark" ? ["#f8fafc", normalized, "#111827"] : ["#111827", normalized, "#f8fafc"]
    const textColor = textCandidates
        .map((candidate) => ({ candidate, ratio: contrastRatio(candidate, background) }))
        .sort((a, b) => b.ratio - a.ratio)[0]?.candidate ?? (theme === "dark" ? "#f8fafc" : "#111827")
    const accentContrast = contrastRatio(normalized, background)
    const safeAccent = accentContrast < 3 && theme === "dark" ? "#f8fafc" : normalized

    return {
        color: textColor,
        borderColor: alphaHex(safeAccent, theme === "dark" ? "99" : "80"),
        backgroundColor: alphaHex(normalized, theme === "dark" ? "2e" : "1f"),
        boxShadow: theme === "dark" ? `inset 0 0 0 1px ${alphaHex(safeAccent, "24")}` : undefined,
    }
}
