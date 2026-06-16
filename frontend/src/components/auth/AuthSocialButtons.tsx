"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import GoogleSVG from "@/components/ui/googleLogo"
import YandexSVG from "@/components/ui/yandexLogo"
import type { AllowedAuthProviders, AuthProviders } from "@/features/auth/types"
import { cn } from "@/lib/utils"

type SVGProps = React.ComponentPropsWithoutRef<"svg">

const GithubSVG = (props: SVGProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
        <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.49 2.87 8.3 6.84 9.68.5.1.68-.22.68-.49 0-.24-.01-1.05-.01-1.91-2.78.62-3.37-1.22-3.37-1.22-.45-1.19-1.11-1.51-1.11-1.51-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.35 9.35 0 0 1 12 6.9c.85 0 1.71.12 2.51.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.07.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.18 10.18 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
    </svg>
)

type AuthButtonsProps = {
    providers: AuthProviders
    label?: string
    className?: string
    onProviderClick?: (provider: AllowedAuthProviders) => void
}

const providerData: Record<AllowedAuthProviders, { component: React.ComponentType<SVGProps>; label: string }> = {
    google: { component: GoogleSVG, label: "Google" },
    yandex: { component: YandexSVG, label: "Яндекс" },
    github: { component: GithubSVG, label: "GitHub" },
}

export default function AuthSocialButtons({
    providers,
    label = "Продолжить через",
    className,
    onProviderClick,
}: AuthButtonsProps) {
    const handleClick = (provider: AllowedAuthProviders) => {
        if (onProviderClick) {
            onProviderClick(provider)
            return
        }

        window.location.href = `/api/auth/oauth/${provider}/redirect`
    }

    return (
        <div className={cn("flex w-full flex-col gap-3", className)}>
            <div className="relative flex items-center">
                <div className="h-px grow bg-white/10" />
                <span className="mx-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    {label}
                </span>
                <div className="h-px grow bg-white/10" />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
                {providers.map((name) => {
                    const provider = providerData[name]
                    const Icon = provider.component

                    return (
                        <Button
                            key={name}
                            type="button"
                            variant="outline"
                            className="group h-10 w-full !rounded-xl border-white/10 bg-white/[0.045] text-slate-100 shadow-sm shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/55 hover:bg-primary/10 hover:text-white"
                            onClick={() => handleClick(name)}
                            title={`${label} ${provider.label}`}
                        >
                            <Icon className="size-5 opacity-75 transition duration-300 group-hover:scale-110 group-hover:opacity-100" />
                            <span className="sr-only">{provider.label}</span>
                        </Button>
                    )
                })}
            </div>
        </div>
    )
}
