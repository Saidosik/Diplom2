"use client"

import Aurora from "@/components/animations/Aurora"
import DarkVeil from "@/components/animations/DarkVeil"
import LightRays from "@/components/animations/LightRays"
import {
    type BackgroundScope,
    type BackgroundScopeSettings,
    defaultAppearanceSettings,
} from "@/components/backgrounds/appearance-settings"
import { useAppearanceSettings } from "@/components/backgrounds/use-appearance-settings"
import { cn } from "@/lib/utils"

type BackgroundRendererProps = {
    scope: BackgroundScope
    settingsOverride?: BackgroundScopeSettings
    className?: string
}

const effectOpacityMultiplier: Record<BackgroundScope, number> = {
    auth: 1,
    main: 0.46,
    admin: 0.36,
}

const ambientGlowClassName: Record<BackgroundScope, string> = {
    auth: "opacity-100",
    main: "opacity-45",
    admin: "opacity-30",
}

function EffectLayer({ scope, settings }: { scope: BackgroundScope; settings: BackgroundScopeSettings }) {
    if (!settings.enabled || settings.effect === "none" || settings.intensity <= 0) {
        return null
    }

    const visualOpacity = settings.intensity * effectOpacityMultiplier[scope]

    if (settings.effect === "aurora") {
        return (
            <div className="absolute inset-x-0 top-[-18%] h-[72svh] md:h-[88svh]" style={{ opacity: visualOpacity }}>
                <Aurora
                    colorStops={["#19d78c", "#6d5cff", "#b497cf"]}
                    blend={1}
                    amplitude={scope === "auth" ? 1.08 : 0.72}
                    speed={settings.speed}
                />
            </div>
        )
    }

    if (settings.effect === "light-rays") {
        return (
            <div className="absolute inset-x-0 top-0 h-[58svh]" style={{ opacity: visualOpacity * 0.52 }}>
                <LightRays
                    raysOrigin="top-center"
                    raysColor="#19d78c"
                    raysSpeed={settings.speed}
                    lightSpread={0.34}
                    rayLength={0.62}
                    fadeDistance={0.92}
                    saturation={0.24}
                    followMouse={false}
                    mouseInfluence={0}
                    noiseAmount={0.012}
                    distortion={0.012}
                />
            </div>
        )
    }

    return (
        <div className="absolute inset-0" style={{ opacity: visualOpacity }}>
            <DarkVeil
                hueShift={settings.hueShift}
                noiseIntensity={settings.noiseIntensity}
                scanlineIntensity={settings.scanlineIntensity}
                speed={settings.speed}
                warpAmount={settings.warpAmount}
                resolutionScale={0.72}
            />
        </div>
    )
}

export function BackgroundRenderer({ scope, settingsOverride, className }: BackgroundRendererProps) {
    const { settings } = useAppearanceSettings()
    const scopeSettings = settingsOverride ?? settings[scope] ?? defaultAppearanceSettings[scope]
    const isAuth = scope === "auth"
    const glowsClassName = ambientGlowClassName[scope]

    return (
        <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
            <div className="absolute inset-0 bg-background" />
            <EffectLayer scope={scope} settings={scopeSettings} />

            <div
                className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(circle_at_center,black,transparent_78%)]"
                style={{ opacity: scopeSettings.gridOpacity }}
            />

            <div className={cn("absolute -left-28 top-8 h-96 w-96 bg-primary/10 blur-3xl dark:bg-primary/12", glowsClassName)} />
            <div className={cn("absolute right-0 top-12 h-96 w-96 bg-cyan-400/6 blur-3xl", glowsClassName)} />
            <div className={cn("absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 bg-violet-500/6 blur-3xl", glowsClassName)} />

            <div
                className="absolute inset-0 bg-background"
                style={{ opacity: scopeSettings.overlayOpacity }}
            />
            <div
                className={cn(
                    "absolute inset-0",
                    isAuth
                        ? "bg-[radial-gradient(circle_at_16%_14%,rgba(25,215,140,0.16),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(109,92,255,0.14),transparent_36%),linear-gradient(to_bottom,rgba(2,8,6,0.08),rgba(2,8,6,0.78)_58%,#020806)]"
                        : "bg-[radial-gradient(circle_at_18%_0%,rgba(25,215,140,0.045),transparent_24%),radial-gradient(circle_at_92%_8%,rgba(109,92,255,0.04),transparent_28%),linear-gradient(to_bottom,rgba(0,0,0,0),rgba(0,0,0,0.28)_42%,rgba(0,0,0,0.52))"
                )}
            />
        </div>
    )
}
