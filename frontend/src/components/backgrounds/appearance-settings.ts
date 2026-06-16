import { browserApi } from "@/lib/http/browser"

export type BackgroundScope = "auth" | "main" | "admin"
export type BackgroundEffect = "none" | "dark-veil" | "aurora" | "light-rays"

export type BackgroundScopeSettings = {
    enabled: boolean
    effect: BackgroundEffect
    intensity: number
    speed: number
    hueShift: number
    noiseIntensity: number
    scanlineIntensity: number
    warpAmount: number
    overlayOpacity: number
    gridOpacity: number
}

export type AppearanceSettings = Record<BackgroundScope, BackgroundScopeSettings>

export const APPEARANCE_SETTINGS_EVENT = "vektor:appearance-backgrounds-updated"

export const scopeLabels: Record<BackgroundScope, string> = {
    auth: "Auth flow",
    main: "Основное приложение",
    admin: "Админ-панель",
}

export const effectLabels: Record<BackgroundEffect, string> = {
    none: "Без эффекта",
    "dark-veil": "Dark Veil",
    aurora: "Aurora",
    "light-rays": "Light Rays",
}

export const defaultAppearanceSettings: AppearanceSettings = {
    auth: {
        enabled: true,
        effect: "aurora",
        intensity: 0.82,
        speed: 1.5,
        hueShift: 0,
        noiseIntensity: 0.012,
        scanlineIntensity: 0.01,
        warpAmount: 0.08,
        overlayOpacity: 0.18,
        gridOpacity: 0.2,
    },
    main: {
        enabled: true,
        effect: "dark-veil",
        intensity: 0.18,
        speed: 0.28,
        hueShift: 120,
        noiseIntensity: 0.014,
        scanlineIntensity: 0.018,
        warpAmount: 0.07,
        overlayOpacity: 0.84,
        gridOpacity: 0.08,
    },
    admin: {
        enabled: true,
        effect: "dark-veil",
        intensity: 0.1,
        speed: 0.16,
        hueShift: 120,
        noiseIntensity: 0.01,
        scanlineIntensity: 0.012,
        warpAmount: 0.04,
        overlayOpacity: 0.9,
        gridOpacity: 0.04,
    },
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

function toNumber(value: unknown, fallback: number, min: number, max: number) {
    const number = typeof value === "number" && Number.isFinite(value) ? value : fallback
    return Math.min(max, Math.max(min, number))
}

function toBoolean(value: unknown, fallback: boolean) {
    return typeof value === "boolean" ? value : fallback
}

function toEffect(value: unknown, fallback: BackgroundEffect): BackgroundEffect {
    return value === "none" || value === "dark-veil" || value === "aurora" || value === "light-rays"
        ? value
        : fallback
}

function normalizeScopeSettings(value: unknown, fallback: BackgroundScopeSettings): BackgroundScopeSettings {
    const source = isRecord(value) ? value : {}

    return {
        enabled: toBoolean(source.enabled, fallback.enabled),
        effect: toEffect(source.effect, fallback.effect),
        intensity: toNumber(source.intensity, fallback.intensity, 0, 1),
        speed: toNumber(source.speed, fallback.speed, 0, 2),
        hueShift: toNumber(source.hueShift, fallback.hueShift, -180, 180),
        noiseIntensity: toNumber(source.noiseIntensity, fallback.noiseIntensity, 0, 0.12),
        scanlineIntensity: toNumber(source.scanlineIntensity, fallback.scanlineIntensity, 0, 0.14),
        warpAmount: toNumber(source.warpAmount, fallback.warpAmount, 0, 0.3),
        overlayOpacity: toNumber(source.overlayOpacity, fallback.overlayOpacity, 0, 0.98),
        gridOpacity: toNumber(source.gridOpacity, fallback.gridOpacity, 0, 0.35),
    }
}

export function normalizeAppearanceSettings(value: unknown): AppearanceSettings {
    const source = isRecord(value) ? value : {}

    return {
        auth: normalizeScopeSettings(source.auth, defaultAppearanceSettings.auth),
        main: normalizeScopeSettings(source.main, defaultAppearanceSettings.main),
        admin: normalizeScopeSettings(source.admin, defaultAppearanceSettings.admin),
    }
}

function unwrapSettingsPayload(payload: unknown): AppearanceSettings {
    const source = isRecord(payload) && "data" in payload ? payload.data : payload
    return normalizeAppearanceSettings(source)
}

export async function fetchAppearanceSettings(): Promise<AppearanceSettings> {
    const response = await browserApi.get("/laravel/appearance")
    return unwrapSettingsPayload(response.data)
}

export async function updateAppearanceSettings(settings: AppearanceSettings): Promise<AppearanceSettings> {
    const response = await browserApi.patch("/laravel/admin/appearance", normalizeAppearanceSettings(settings))
    return unwrapSettingsPayload(response.data)
}

export async function resetAppearanceSettings(): Promise<AppearanceSettings> {
    const response = await browserApi.post("/laravel/admin/appearance/reset")
    return unwrapSettingsPayload(response.data)
}

export function emitAppearanceSettingsUpdated(settings?: AppearanceSettings) {
    if (typeof window === "undefined") {
        return
    }

    window.dispatchEvent(new CustomEvent(APPEARANCE_SETTINGS_EVENT, { detail: settings }))
}
