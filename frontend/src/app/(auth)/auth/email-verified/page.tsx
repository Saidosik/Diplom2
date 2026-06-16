"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react"

import { AuthCard } from "@/components/auth/AuthCard"
import { Button } from "@/components/ui/button"
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
            className="w-full"
        >
            <AuthCard
                eyebrow="Статус аккаунта"
                title={verified ? "Email подтверждён" : "Email не подтверждён"}
                icon={
                    isLoading ? (
                        <LoaderCircle className="size-5 animate-spin" />
                    ) : verified ? (
                        <CheckCircle2 className="size-5 text-emerald-400" />
                    ) : (
                        <XCircle className="size-5 text-destructive" />
                    )
                }
                description={
                    verified
                        ? "Теперь вам доступны все разделы Вектора: публикации, вопросы, чаты, AI и playground."
                        : "Ссылка подтверждения устарела или повреждена. Запросите новое письмо и попробуйте ещё раз."
                }
                footer={
                    <>
                        <Button asChild className="h-11 w-full !rounded-2xl bg-primary text-primary-foreground">
                            <Link href={verified && isAuthenticated ? "/profile" : "/auth?mode=login"}>
                                {verified && isAuthenticated ? "Перейти в приложение" : "Войти"}
                            </Link>
                        </Button>

                        {!verified && (
                            <Button asChild variant="outline" className="h-11 w-full !rounded-2xl border-white/10 bg-white/[0.045]">
                                <Link href="/verify-email">Запросить письмо повторно</Link>
                            </Button>
                        )}
                    </>
                }
            >
                <div className="border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-slate-400">
                    {isLoading
                        ? "Обновляем данные пользователя и проверяем статус подтверждения."
                        : verified
                            ? "Можно возвращаться в профиль и продолжать работу с проектом."
                            : "Если вы уверены, что уже подтвердили email, попробуйте войти повторно."}
                </div>
            </AuthCard>
        </motion.div>
    )
}

export default function EmailVerifiedPage() {
    return (
        <Suspense
            fallback={
                <AuthCard
                    eyebrow="Загрузка"
                    title="Обновляем статус"
                    icon={<LoaderCircle className="size-5 animate-spin" />}
                    description="Проверяем подтверждение аккаунта."
                >
                    <div className="h-2 overflow-hidden bg-white/10">
                        <div className="h-full w-1/2 animate-pulse bg-primary" />
                    </div>
                </AuthCard>
            }
        >
            <EmailVerifiedContent />
        </Suspense>
    )
}
