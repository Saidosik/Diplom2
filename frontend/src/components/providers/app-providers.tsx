"use client"

import type { ReactNode } from "react"

import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { QueryProvider } from "@/providers/query-provider"
import { ThemeProvider } from "@/providers/theme-provider"
import { RealtimeBridge } from "@/components/realtime/realtime-bridge"

type AppProvidersProps = {
    children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
    return (
        <QueryProvider>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
                <TooltipProvider delayDuration={0}>
                    <RealtimeBridge />
                    {children}
                </TooltipProvider>

                <Toaster
                    richColors
                    closeButton
                    position="bottom-right"
                    expand
                    toastOptions={{
                        duration: 3500,
                    }}
                />
            </ThemeProvider>
        </QueryProvider>
    )
}