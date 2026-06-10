"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { getMe } from "@/features/auth/api"
import { safeRequest } from "@/lib/http/api-errors"

function EmailVerifiedContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const verified = searchParams.get("verified") !== "0"
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const refreshUser = async () => {
            const result = await safeRequest(getMe())
            setIsAuthenticated(result.success && (result.data.email_verified === true || result.data.is_email_verified === true))
            setIsLoading(false)
            router.refresh()
        }

        refreshUser()
    }, [router])

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full sm:max-w-md"
        >
            <Card className="border-primary/10 bg-card/95 shadow-xl shadow-primary/5 backdrop-blur">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl border bg-background">
                        {isLoading ? (
                            <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
                        ) : verified ? (
                            <CheckCircle2 className="size-6 text-emerald-500" />
                        ) : (
                            <XCircle className="size-6 text-destructive" />
                        )}
                    </div>
                    <CardTitle>{verified ? "Email успешно подтверждён" : "Email не подтверждён"}</CardTitle>
                    <CardDescription>
                        {verified
                            ? "Теперь вы можете пользоваться всеми разделами платформы."
                            : "Ссылка подтверждения устарела или повреждена. Запросите новое письмо."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Button asChild className="w-full">
                        <Link href={verified && isAuthenticated ? "/profile" : "/auth?mode=login"}>
                            {verified && isAuthenticated ? "Перейти в приложение" : "Войти"}
                        </Link>
                    </Button>
                    {!verified && (
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/verify-email">Запросить письмо повторно</Link>
                        </Button>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    )
}

export default function EmailVerifiedPage() {
    return (
        <Suspense fallback={
            <Card className="w-full sm:max-w-md">
                <CardHeader className="text-center">
                    <LoaderCircle className="mx-auto size-5 animate-spin text-muted-foreground" />
                    <CardTitle>Загрузка</CardTitle>
                    <CardDescription>Обновляем статус аккаунта.</CardDescription>
                </CardHeader>
            </Card>
        }>
            <EmailVerifiedContent />
        </Suspense>
    )
}
