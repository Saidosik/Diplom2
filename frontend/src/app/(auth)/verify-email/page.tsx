"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { LoaderCircle, LogOut, MailCheck, RefreshCcw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { resendEmailVerification, logout } from "@/features/auth/api"
import { getMe } from "@/features/auth/api"
import { safeRequest } from "@/lib/http/api-errors"

const COOLDOWN_SECONDS = 60

function VerifyEmail() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const emailFromUrl = searchParams.get("email")
    const [email, setEmail] = useState(emailFromUrl ?? "")
    const [cooldown, setCooldown] = useState(0)
    const [isResending, setIsResending] = useState(false)
    const [isChecking, setIsChecking] = useState(true)

    const safeEmail = useMemo(() => email || emailFromUrl || "ваш email", [email, emailFromUrl])

    useEffect(() => {
        const loadStatus = async () => {
            const result = await safeRequest(getMe())

            if (result.success) {
                setEmail(result.data.email)

                if (result.data.email_verified || result.data.is_email_verified) {
                    router.replace("/auth/email-verified?verified=1")
                    return
                }
            }

            setIsChecking(false)
        }

        loadStatus()
    }, [router])

    useEffect(() => {
        if (cooldown <= 0) {
            return
        }

        const timer = window.setInterval(() => {
            setCooldown((value) => Math.max(0, value - 1))
        }, 1000)

        return () => window.clearInterval(timer)
    }, [cooldown])

    const handleResend = async () => {
        setIsResending(true)
        const result = await safeRequest(resendEmailVerification())
        setIsResending(false)

        if (!result.success) {
            toast.error(result.error.message)
            return
        }

        toast.success(result.data.message ?? "Письмо отправлено повторно")
        setCooldown(COOLDOWN_SECONDS)
    }

    const handleLogout = async () => {
        await safeRequest(logout())
        router.push("/auth?mode=login")
        router.refresh()
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full sm:max-w-lg"
        >
            <Card className="border-primary/10 bg-card/95 shadow-xl shadow-primary/5 backdrop-blur">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl border bg-primary/10 text-primary">
                        {isChecking ? <LoaderCircle className="size-6 animate-spin" /> : <MailCheck className="size-6" />}
                    </div>
                    <CardTitle className="text-2xl">Подтвердите email</CardTitle>
                    <CardDescription className="text-base">
                        Мы отправили письмо с подтверждением на ваш email.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 text-center">
                    <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm">
                        <p className="text-muted-foreground">Адрес для подтверждения</p>
                        <p className="mt-1 break-all font-medium text-foreground">{safeEmail}</p>
                    </div>

                    <p className="text-sm text-muted-foreground">
                        Перейдите по ссылке из письма. Проверьте папку “Спам”, если письмо не пришло.
                    </p>
                </CardContent>

                <CardFooter className="flex flex-col gap-3">
                    <Button
                        type="button"
                        className="w-full"
                        onClick={handleResend}
                        disabled={isResending || cooldown > 0 || isChecking}
                    >
                        {isResending ? (
                            <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                            <RefreshCcw className="size-4" />
                        )}
                        {cooldown > 0 ? `Отправить повторно через ${cooldown} сек.` : "Отправить письмо повторно"}
                    </Button>

                    <Button type="button" variant="outline" className="w-full" onClick={handleLogout}>
                        <LogOut className="size-4" />
                        Выйти
                    </Button>

                    <Button asChild variant="link" className="text-muted-foreground">
                        <Link href="/auth?mode=login">Вернуться ко входу</Link>
                    </Button>
                </CardFooter>
            </Card>
        </motion.div>
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
