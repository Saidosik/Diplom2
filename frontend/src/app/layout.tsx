import type { Metadata } from "next"

import { OAuthToastHandler } from "@/components/auth/oauth-toast-handler"

import { cn } from "@/lib/utils"

import "./globals.css"
import { AppProviders } from "@/components/providers/app-providers"
import { Suspense } from "react"

export const metadata: Metadata = {
    title: "Вектор",
    description: "Информационное сообщество программистов с публикациями, вопросами, репутацией и уведомлениями",
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html
            suppressHydrationWarning
            lang="ru"
            className={cn("h-full font-sans antialiased")}
        >
            <body className="min-h-full bg-background text-foreground">
                <AppProviders>

                    <Suspense fallback={null}>
                        <OAuthToastHandler />
                    </Suspense>
                    {children}
                </AppProviders>
            </body>
        </html>
    )
}