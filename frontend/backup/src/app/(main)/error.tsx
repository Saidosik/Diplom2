"use client"

import { useEffect } from "react"
import { RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { StatusPage } from "@/components/errors/status-page"

export default function MainErrorPage({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error("[MAIN_ERROR]", error)
    }, [error])

    return (
        <StatusPage
            status="500"
            eyebrow="Ошибка раздела"
            title="Сервер заварил чай вместо ответа"
            description="Раздел не смог получить данные или обработать запрос. Это не 404: маршрут найден, но ответ не собрался. Пасхалка: чайник, а не кофемашина."
            details={error.digest ? `Код диагностики: ${error.digest}` : "Запрос можно повторить или вернуться на главную страницу."}
            variant="server-error"
            action={
                <Button type="button" variant="secondary" onClick={reset}>
                    <RotateCcw className="size-4" />
                    Повторить
                </Button>
            }
        />
    )
}
