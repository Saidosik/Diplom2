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

function EffectLayer({ settings }: { settings: BackgroundScopeSettings }) {
    if (!settings.enabled || settings.effect === "none" || settings.intensity <= 0) {
        return null
    }

    if (settings.effect === "aurora") {
        return (
            <div className="absolute inset-x-0 top-[-18%] h-[72svh] md:h-[88svh]" style={{ opacity: settings.intensity }}>
                <Aurora
                    colorStops={["#19d78c", "#6d5cff", "#b497cf"]}
                    blend={1}
                    amplitude={1.08}
                    speed={settings.speed}
                />
            </div>
        )
    }

    if (settings.effect === "light-rays") {
        return (
            <div className="absolute inset-x-0 top-0 h-[60svh]" style={{ opacity: settings.intensity * 0.72 }}>
                <LightRays
                    raysOrigin="top-center"
                    raysColor="#19d78c"
                    raysSpeed={settings.speed}
                    lightSpread={0.48}
                    rayLength={0.92}
                    fadeDistance={0.9}
                    saturation={0.46}
                    followMouse={false}
                    mouseInfluence={0}
                    noiseAmount={0.025}
                    distortion={0.025}
                />
            </div>
        )
    }

    return (
        <div className="absolute inset-0" style={{ opacity: settings.intensity }}>
            <DarkVeil
                hueShift={settings.hueShift}
                noiseIntensity={settings.noiseIntensity}
                scanlineIntensity={settings.scanlineIntensity}
                speed={settings.speed}
                warpAmount={settings.warpAmount}
                resolutionScale={0.88}
            />
        </div>
    )
}

export function BackgroundRenderer({ scope, settingsOverride, className }: BackgroundRendererProps) {
    const { settings } = useAppearanceSettings()
    const scopeSettings = settingsOverride ?? settings[scope] ?? defaultAppearanceSettings[scope]
    const isAuth = scope === "auth"

    return (
        <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
            <div className="absolute inset-0 bg-background" />
            <EffectLayer settings={scopeSettings} />

            <div
                className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(circle_at_center,black,transparent_78%)]"
                style={{ opacity: scopeSettings.gridOpacity }}
            />

            <div className="absolute -left-28 top-8 h-96 w-96 bg-primary/14 blur-3xl dark:bg-primary/16" />
            <div className="absolute right-0 top-12 h-96 w-96 bg-cyan-400/8 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 bg-violet-500/8 blur-3xl" />

            <div
                className="absolute inset-0 bg-background"
                style={{ opacity: scopeSettings.overlayOpacity }}
            />
            <div
                className={cn(
                    "absolute inset-0",
                    isAuth
                        ? "bg-[radial-gradient(circle_at_16%_14%,rgba(25,215,140,0.16),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(109,92,255,0.14),transparent_36%),linear-gradient(to_bottom,rgba(2,8,6,0.08),rgba(2,8,6,0.78)_58%,#020806)]"
                        : "bg-[radial-gradient(circle_at_18%_0%,rgba(25,215,140,0.08),transparent_24%),radial-gradient(circle_at_92%_8%,rgba(109,92,255,0.08),transparent_28%),linear-gradient(to_bottom,rgba(0,0,0,0),rgba(0,0,0,0.28)_42%,rgba(0,0,0,0.48))"
                )}
            />
        </div>
    )
}
