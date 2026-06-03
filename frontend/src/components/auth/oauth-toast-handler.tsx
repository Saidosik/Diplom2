"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

const providerLabels: Record<string, string> = {
    google: "Google",
    yandex: "Яндекс",
}

export function OAuthToastHandler() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const hasShownToastRef = React.useRef(false)

    React.useEffect(() => {
        const oauthStatus = searchParams.get("oauth")
        const provider = searchParams.get("provider")
        const message = searchParams.get("message")

        if (!oauthStatus || hasShownToastRef.current) {
            return
        }

        hasShownToastRef.current = true

        const providerLabel = provider
            ? providerLabels[provider] ?? provider
            : "сервис"

        if (oauthStatus === "success") {
            toast.success(`Вход через ${providerLabel} выполнен`)
        }

        if (oauthStatus === "error") {
            toast.error(
                message ?? `Не удалось войти через ${providerLabel}`
            )
        }

        const nextSearchParams = new URLSearchParams(searchParams.toString())

        nextSearchParams.delete("oauth")
        nextSearchParams.delete("provider")
        nextSearchParams.delete("message")

        const nextUrl = nextSearchParams.toString()
            ? `${pathname}?${nextSearchParams.toString()}`
            : pathname

        router.replace(nextUrl, {
            scroll: false,
        })
    }, [router, pathname, searchParams])

    return null
}