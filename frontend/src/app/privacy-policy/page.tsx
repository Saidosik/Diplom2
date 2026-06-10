"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { AlertTriangle, LoaderCircle } from "lucide-react"

import { SiteBrand } from "@/components/layout/site-brand"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getPrivacyPolicy, type LegalPage } from "@/features/legal/api"
import { safeRequest } from "@/lib/http/api-errors"

export default function PrivacyPolicyPage() {
    const [page, setPage] = useState<LegalPage | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        const loadPolicy = async () => {
            setIsLoading(true)
            const result = await safeRequest(getPrivacyPolicy())

            if (result.success) {
                setPage(result.data)
                setError("")
            } else {
                setError("Не удалось загрузить политику конфиденциальности")
            }

            setIsLoading(false)
        }

        loadPolicy()
    }, [])

    return (
        <main className="min-h-svh bg-background px-4 py-8 text-foreground md:py-12">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
                <div className="flex items-center justify-between gap-4">
                    <SiteBrand size="lg" />
                    <Button asChild variant="outline">
                        <Link href="/auth?mode=register">К регистрации</Link>
                    </Button>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                >
                    <Card className="border-primary/10 bg-card/95 shadow-xl shadow-primary/5 backdrop-blur">
                        <CardHeader>
                            <p className="text-sm font-medium text-primary">Документы платформы</p>
                            <CardTitle className="text-3xl md:text-4xl">
                                {page?.title ?? "Политика конфиденциальности данных"}
                            </CardTitle>
                            <CardDescription>
                                {page?.updated_at ? `Обновлено: ${new Date(page.updated_at).toLocaleString("ru-RU")}` : "Публичная страница политики конфиденциальности данных."}
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            {isLoading ? (
                                <div className="flex min-h-48 items-center justify-center gap-2 text-muted-foreground">
                                    <LoaderCircle className="size-5 animate-spin" />
                                    Загружаем политику конфиденциальности...
                                </div>
                            ) : error ? (
                                <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                                    <AlertTriangle className="size-8 text-destructive" />
                                    <p>{error}</p>
                                </div>
                            ) : (
                                <div className="whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground md:text-base">
                                    {page?.content}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </main>
    )
}
