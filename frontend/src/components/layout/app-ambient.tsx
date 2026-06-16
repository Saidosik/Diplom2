"use client"

import LightRays from "@/components/animations/LightRays"

export function AppAmbient() {
    return (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
            <div className="absolute inset-0 bg-background" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-[0.16] [mask-image:radial-gradient(circle_at_center,black,transparent_76%)] dark:opacity-[0.12]" />
            <div className="absolute inset-x-0 top-0 h-[62svh] opacity-[0.65] dark:opacity-[0.75]">
                <LightRays
                    raysOrigin="top-center"
                    raysColor="#19d78c"
                    raysSpeed={0.65}
                    lightSpread={0.82}
                    rayLength={1.55}
                    fadeDistance={1.38}
                    saturation={1.18}
                    followMouse
                    mouseInfluence={0.045}
                    noiseAmount={0.1}
                    distortion={0.055}
                />
            </div>
            <div className="absolute inset-x-0 top-0 h-[54svh] opacity-[0.35] dark:opacity-[0.45]">
                <LightRays
                    raysOrigin="top-right"
                    raysColor="#6d5cff"
                    raysSpeed={0.45}
                    lightSpread={0.72}
                    rayLength={1.25}
                    fadeDistance={1.2}
                    saturation={1.08}
                    noiseAmount={0.07}
                    distortion={0.045}
                />
            </div>
            <div className="absolute -left-24 top-10 h-96 w-96 bg-primary/14 blur-3xl dark:bg-primary/18" />
            <div className="absolute right-0 top-20 h-80 w-80 bg-cyan-400/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 bg-fuchsia-400/10 blur-3xl" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/70 to-background" />
        </div>
    )
}
