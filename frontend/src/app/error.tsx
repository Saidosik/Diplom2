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

    if (isForbiddenError(error)) {
        return (
            <StatusPage
                status="403"
                eyebrow="Доступ закрыт"
                title="Недостаточно прав для этого действия"
                description="Сервер отклонил запрос из-за прав доступа. Войдите другим аккаунтом или вернитесь к публичной ленте сообщества."
                details="Если вы считаете, что доступ должен быть открыт, обратитесь к администратору проекта."
                variant="forbidden"
            />
        )
    }

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


function isForbiddenError(error: Error & { digest?: string }) {
    const maybeStatus = error as Error & { status?: number; response?: { status?: number } }

    return maybeStatus.status === 403
        || maybeStatus.response?.status === 403
        || error.message.includes("403")
}
