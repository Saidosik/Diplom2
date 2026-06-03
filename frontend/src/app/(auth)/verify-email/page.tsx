"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { browserApi } from "@/lib/http/browser"

function VerifyEmail() {
    const searchParams = useSearchParams()
    const [resultMessage, setResultMessage] = useState("")
    const [error, setError] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        const verify = async () => {
            const id = searchParams.get("id")
            const expires = searchParams.get("expires")
            const signature = searchParams.get("signature")

            try {
                const response = await browserApi.get("/auth/verify-email/", {
                    params: { id, expires, signature },
                })

                setResultMessage(response.data.message ?? "Email успешно подтверждён")
            } catch {
                setResultMessage("Не удалось подтвердить email. Возможно, ссылка устарела или была повреждена.")
                setError(true)
            } finally {
                setIsLoading(false)
            }
        }

        verify()
    }, [searchParams, router])

    return (
        <Card className="w-full sm:max-w-md">
            <CardHeader className="text-center">
                <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl border bg-background">
                    {isLoading ? (
                        <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
                    ) : error ? (
                        <XCircle className="size-5 text-destructive" />
                    ) : (
                        <CheckCircle2 className="size-5 text-emerald-500" />
                    )}
                </div>

                <CardTitle>
                    {isLoading
                        ? "Проверяем ссылку"
                        : error
                          ? "Подтверждение не выполнено"
                          : "Email подтверждён"}
                </CardTitle>

                <CardDescription>{resultMessage || "Подождите несколько секунд."}</CardDescription>
            </CardHeader>

            {!isLoading && (
                <CardContent>
                    <Button asChild className="w-full">
                        <Link href={error ? "/settings" : "/profile"}>
                            {error ? "Перейти в настройки" : "Перейти в профиль"}
                        </Link>
                    </Button>
                </CardContent>
            )}
        </Card>
    )
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <Card className="w-full sm:max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl border bg-background">
                        <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
                    </div>
                    <CardTitle>Загрузка</CardTitle>
                    <CardDescription>Подготавливаем страницу подтверждения email.</CardDescription>
                </CardHeader>
            </Card>
        }>
            <VerifyEmail />
        </Suspense>
    )
}
