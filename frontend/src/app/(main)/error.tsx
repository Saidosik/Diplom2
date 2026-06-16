"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function MainRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error("Home page render failed", error)
    }, [error])

    return (
        <main className="mx-auto flex min-h-[60vh] w-full max-w-4xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
            <Card className="w-full border-destructive/30 bg-destructive/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <AlertTriangle className="size-5 text-destructive" />
                        Не удалось отрисовать главную страницу
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Это не должно ломать весь сайт. Попробуйте обновить ленту, а если ошибка повторится — проверьте BFF/API рекомендации и server logs.
                    </p>
                    <Button type="button" onClick={reset} className="rounded-none">
                        <RefreshCw className="size-4" />
                        Повторить загрузку
                    </Button>
                </CardContent>
            </Card>
        </main>
    )
}
