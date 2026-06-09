import * as React from "react"

export type ThemeName = "light" | "dark"

export type ThemeColorToken =
    | "background"
    | "foreground"
    | "card"
    | "card-foreground"
    | "popover"
    | "popover-foreground"
    | "muted"
    | "muted-foreground"
    | "border"
    | "primary"
    | "secondary"
    | "accent"

export type ThemeSurface = {
    id: string
    label: string
    theme: ThemeName
    backgroundToken: ThemeColorToken
    foregroundToken: ThemeColorToken
    background: string
    foreground: string
}

const TOKEN_FALLBACKS: Record<ThemeName, Record<ThemeColorToken, string>> = {
    light: {
        background: "oklch(1 0 0)",
        foreground: "oklch(0.145 0 0)",
        card: "oklch(1 0 0)",
        "card-foreground": "oklch(0.145 0 0)",
        popover: "oklch(1 0 0)",
        "popover-foreground": "oklch(0.145 0 0)",
        muted: "oklch(0.97 0 0)",
        "muted-foreground": "oklch(0.556 0 0)",
        border: "oklch(0.922 0 0)",
        primary: "oklch(0.527 0.154 150.069)",
        secondary: "oklch(0.967 0.001 286.375)",
        accent: "oklch(0.97 0 0)",
    },
    dark: {
        background: "oklch(0.145 0 0)",
        foreground: "oklch(0.985 0 0)",
        card: "oklch(0.205 0 0)",
        "card-foreground": "oklch(0.985 0 0)",
        popover: "oklch(0.205 0 0)",
        "popover-foreground": "oklch(0.985 0 0)",
        muted: "oklch(0.269 0 0)",
        "muted-foreground": "oklch(0.708 0 0)",
        border: "oklch(1 0 0 / 10%)",
        primary: "oklch(0.448 0.119 151.328)",
        secondary: "oklch(0.274 0.006 286.033)",
        accent: "oklch(0.269 0 0)",
    },
}

const SURFACE_DEFINITIONS: Array<Omit<ThemeSurface, "background" | "foreground">> = [
    { id: "light-background", label: "Светлая тема · фон страницы", theme: "light", backgroundToken: "background", foregroundToken: "foreground" },
    { id: "light-card", label: "Светлая тема · фон карточки", theme: "light", backgroundToken: "card", foregroundToken: "card-foreground" },
    { id: "light-admin", label: "Светлая тема · таблица/админка", theme: "light", backgroundToken: "card", foregroundToken: "card-foreground" },
    { id: "light-popover", label: "Светлая тема · dialog/popover", theme: "light", backgroundToken: "popover", foregroundToken: "popover-foreground" },
    { id: "dark-background", label: "Тёмная тема · фон страницы", theme: "dark", backgroundToken: "background", foregroundToken: "foreground" },
    { id: "dark-card", label: "Тёмная тема · фон карточки", theme: "dark", backgroundToken: "card", foregroundToken: "card-foreground" },
    { id: "dark-admin", label: "Тёмная тема · таблица/админка", theme: "dark", backgroundToken: "card", foregroundToken: "card-foreground" },
    { id: "dark-popover", label: "Тёмная тема · dialog/popover", theme: "dark", backgroundToken: "popover", foregroundToken: "popover-foreground" },
]

function clamp(value: number, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value))
}

function formatHex(value: number) {
    return Math.round(clamp(value, 0, 255)).toString(16).padStart(2, "0")
}

function rgbToHex(r: number, g: number, b: number) {
    return `#${formatHex(r)}${formatHex(g)}${formatHex(b)}`
}

function parseHex(value: string) {
    const trimmed = value.trim()
    if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toLowerCase()
    if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
        const [, r, g, b] = trimmed
        return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
    }
    return null
}

function parseRgb(value: string) {
    const match = value.match(/rgba?\(([^)]+)\)/i)
    if (!match) return null
    const channels = match[1].split(/[\s,\/]+/).filter(Boolean).slice(0, 3).map(Number)
    if (channels.length < 3 || channels.some((channel) => !Number.isFinite(channel))) return null
    return rgbToHex(channels[0], channels[1], channels[2])
}

function oklabToLinearSrgb(l: number, a: number, b: number) {
    const lPrime = l + 0.3963377774 * a + 0.2158037573 * b
    const mPrime = l - 0.1055613458 * a - 0.0638541728 * b
    const sPrime = l - 0.0894841775 * a - 1.291485548 * b
    const lCube = lPrime ** 3
    const mCube = mPrime ** 3
    const sCube = sPrime ** 3

    return {
        r: 4.0767416621 * lCube - 3.3077115913 * mCube + 0.2309699292 * sCube,
        g: -1.2684380046 * lCube + 2.6097574011 * mCube - 0.3413193965 * sCube,
        b: -0.0041960863 * lCube - 0.7034186147 * mCube + 1.707614701 * sCube,
    }
}

function linearToSrgb(value: number) {
    const channel = clamp(value)
    return channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055
}

function parseOklch(value: string) {
    const match = value.match(/oklch\(([^)]+)\)/i)
    if (!match) return null
    const parts = match[1].split(/[\s\/]+/).filter(Boolean)
    const l = Number.parseFloat(parts[0])
    const c = Number.parseFloat(parts[1])
    const h = Number.parseFloat(parts[2] ?? "0")
    if (![l, c, h].every(Number.isFinite)) return null

    const hue = (h * Math.PI) / 180
    const lab = { l, a: c * Math.cos(hue), b: c * Math.sin(hue) }
    const rgb = oklabToLinearSrgb(lab.l, lab.a, lab.b)

    return rgbToHex(linearToSrgb(rgb.r) * 255, linearToSrgb(rgb.g) * 255, linearToSrgb(rgb.b) * 255)
}

export function colorToHex(value?: string | null) {
    const trimmed = value?.trim() ?? ""
    return parseHex(trimmed) ?? parseRgb(trimmed) ?? parseOklch(trimmed)
}

export function getThemeColorFallback(theme: ThemeName, token: ThemeColorToken) {
    return colorToHex(TOKEN_FALLBACKS[theme][token]) ?? "#ffffff"
}

function readCssVariableFromStylesheets(token: ThemeColorToken, theme: ThemeName) {
    if (typeof document === "undefined") return null
    const selector = theme === "dark" ? ".dark" : ":root"

    for (const sheet of Array.from(document.styleSheets)) {
        let rules: CSSRuleList
        try {
            rules = sheet.cssRules
        } catch {
            continue
        }

        for (const rule of Array.from(rules)) {
            if (!(rule instanceof CSSStyleRule)) continue
            if (!rule.selectorText.split(",").map((item) => item.trim()).includes(selector)) continue
            const value = rule.style.getPropertyValue(`--${token}`).trim()
            const hex = colorToHex(value)
            if (hex) return hex
        }
    }

    return null
}

function readCssVariable(token: ThemeColorToken, theme: ThemeName) {
    if (typeof document === "undefined") return null

    const stylesheetValue = readCssVariableFromStylesheets(token, theme)
    if (stylesheetValue) return stylesheetValue

    const probe = document.createElement("div")
    if (theme === "dark") probe.className = "dark"
    probe.style.position = "absolute"
    probe.style.visibility = "hidden"
    probe.style.pointerEvents = "none"
    document.body.appendChild(probe)
    const raw = getComputedStyle(probe).getPropertyValue(`--${token}`).trim()
    probe.remove()

    return colorToHex(raw)
}

export function resolveCssVariableColor(token: ThemeColorToken, theme: ThemeName) {
    return readCssVariable(token, theme) ?? getThemeColorFallback(theme, token)
}

export function getReadableThemeColors() {
    return SURFACE_DEFINITIONS.map((surface) => ({
        ...surface,
        background: resolveCssVariableColor(surface.backgroundToken, surface.theme),
        foreground: resolveCssVariableColor(surface.foregroundToken, surface.theme),
    }))
}

export function getReadableThemeColorFallbacks() {
    return SURFACE_DEFINITIONS.map((surface) => ({
        ...surface,
        background: getThemeColorFallback(surface.theme, surface.backgroundToken),
        foreground: getThemeColorFallback(surface.theme, surface.foregroundToken),
    }))
}

export function useReadableThemeColors() {
    const [surfaces, setSurfaces] = React.useState<ThemeSurface[]>(() => getReadableThemeColorFallbacks())

    React.useEffect(() => {
        setSurfaces(getReadableThemeColors())
    }, [])

    return surfaces
}

export function useCurrentThemeName(fallback: ThemeName = "dark") {
    const [theme, setTheme] = React.useState<ThemeName>(fallback)

    React.useEffect(() => {
        const root = document.documentElement
        const update = () => setTheme(root.classList.contains("dark") ? "dark" : "light")
        update()
        const observer = new MutationObserver(update)
        observer.observe(root, { attributes: true, attributeFilter: ["class"] })

        return () => observer.disconnect()
    }, [])

    return theme
}
