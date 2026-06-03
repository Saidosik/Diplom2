"use client"

import { useEffect } from "react"
import { RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { StatusPage } from "@/components/errors/status-page"

export default function RootErrorPage({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error("[ROOT_ERROR]", error)
    }, [error])

    return (
        <StatusPage
            status="500"
            eyebrow="Ошибка сервера"
            title="Сервер заварил чай вместо ответа"
            description="Что-то пошло не так при обработке запроса. Пасхалка честная: внутри он чайник, а не кофемашина — но повторный запрос часто возвращает всё на место."
            details={error.digest ? `Код диагностики: ${error.digest}` : "Код диагностики появится здесь, если его вернёт Next.js."}
            variant="server-error"
            action={
                <Button type="button" variant="secondary" onClick={reset}>
                    <RotateCcw className="size-4" />
                    Повторить запрос
                </Button>
            }
        />
    )
}
