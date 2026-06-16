"use client"

import { useEffect, useState } from "react"

import { SESSION_CHANGED_EVENT } from "@/lib/auth/session-events"

export function useSessionRefreshKey() {
    const [refreshKey, setRefreshKey] = useState(0)

    useEffect(() => {
        if (typeof window === "undefined") {
            return
        }

        const refresh = () => setRefreshKey((current) => current + 1)

        window.addEventListener(SESSION_CHANGED_EVENT, refresh)
        window.addEventListener("focus", refresh)
        window.addEventListener("pageshow", refresh)

        return () => {
            window.removeEventListener(SESSION_CHANGED_EVENT, refresh)
            window.removeEventListener("focus", refresh)
            window.removeEventListener("pageshow", refresh)
        }
    }, [])

    return refreshKey
}
