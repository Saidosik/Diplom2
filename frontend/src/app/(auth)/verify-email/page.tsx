"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { LoaderCircle, LogOut, MailCheck, RefreshCcw } from "lucide-react"
import { toast } from "sonner"

import { AuthCard } from "@/components/auth/AuthCard"
import { Button } from "@/components/ui/button"
import { getMe, logout, resendEmailVerification } from "@/features/auth/api"
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
            className="w-full"
        >
            <AuthCard
                eyebrow="Email verification"
                title="Подтвердите email"
                icon={isChecking ? <LoaderCircle className="size-5 animate-spin" /> : <MailCheck className="size-5" />}
                description="Мы отправили письмо с подтверждением. После перехода по ссылке станут доступны публикации, чаты и AI-разделы."
                footer={
                    <>
                        <Button
                            type="button"
                            className="h-11 w-full !rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/90"
                            onClick={handleResend}
                            disabled={isResending || cooldown > 0 || isChecking}
                        >
                            {isResending ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
                            {cooldown > 0 ? `Отправить повторно через ${cooldown} сек.` : "Отправить письмо повторно"}
                        </Button>

                        <Button type="button" variant="outline" className="h-11 w-full !rounded-2xl border-white/10 bg-white/[0.045]" onClick={handleLogout}>
                            <LogOut className="size-4" />
                            Выйти
                        </Button>

                        <Button asChild variant="link" className="text-slate-400">
                            <Link href="/auth?mode=login">Вернуться ко входу</Link>
                        </Button>
                    </>
                }
            >
                <div className="space-y-4 text-center">
                    <div className="border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
                        <p className="text-slate-500">Адрес для подтверждения</p>
                        <p className="mt-1 break-all font-medium text-white">{safeEmail}</p>
                    </div>

                    <p className="text-sm leading-6 text-slate-400">
                        Проверьте входящие и папку “Спам”. Если письмо не пришло, запросите отправку повторно.
                    </p>
                </div>
            </AuthCard>
        </motion.div>
    )
}

export default function VerifyEmailPage() {
    return (
        <Suspense
            fallback={
                <AuthCard
                    eyebrow="Загрузка"
                    title="Подготавливаем страницу"
                    icon={<LoaderCircle className="size-5 animate-spin" />}
                    description="Проверяем статус подтверждения email."
                >
                    <div className="h-2 overflow-hidden bg-white/10">
                        <div className="h-full w-1/2 animate-pulse bg-primary" />
                    </div>
                </AuthCard>
            }
        >
            <VerifyEmail />
        </Suspense>
    )
}
