"use client"

import { BackgroundRenderer } from "@/components/backgrounds/BackgroundRenderer"
import type { BackgroundScope } from "@/components/backgrounds/appearance-settings"

export function AppAmbient({ scope = "main" }: { scope?: BackgroundScope }) {
    return (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
            <BackgroundRenderer scope={scope} />
        </div>
    )
}
