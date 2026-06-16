"use client"

import * as React from "react"

import {
    APPEARANCE_SETTINGS_EVENT,
    type AppearanceSettings,
    defaultAppearanceSettings,
    fetchAppearanceSettings,
    normalizeAppearanceSettings,
} from "@/components/backgrounds/appearance-settings"

export function useAppearanceSettings() {
    const [settings, setSettings] = React.useState<AppearanceSettings>(defaultAppearanceSettings)
    const [isMounted, setIsMounted] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)

    const refresh = React.useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            const next = await fetchAppearanceSettings()
            setSettings(next)
            return next
        } catch (requestError) {
            console.error("[APPEARANCE_SETTINGS_FETCH_ERROR]", requestError)
            setError("Не удалось загрузить настройки внешнего вида")
            setSettings(defaultAppearanceSettings)
            return defaultAppearanceSettings
        } finally {
            setIsLoading(false)
        }
    }, [])

    React.useEffect(() => {
        setIsMounted(true)
        void refresh()

        const sync = (event: Event) => {
            const detail = (event as CustomEvent<AppearanceSettings | undefined>).detail

            if (detail) {
                setSettings(normalizeAppearanceSettings(detail))
                setIsLoading(false)
                setError(null)
                return
            }

            void refresh()
        }

        window.addEventListener(APPEARANCE_SETTINGS_EVENT, sync)

        return () => {
            window.removeEventListener(APPEARANCE_SETTINGS_EVENT, sync)
        }
    }, [refresh])

    return {
        settings,
        isMounted,
        isLoading,
        error,
        refresh,
    }
}
