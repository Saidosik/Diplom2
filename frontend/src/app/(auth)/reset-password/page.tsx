import Link from "next/link"
import { TriangleAlert } from "lucide-react"

import { AuthCard } from "@/components/auth/AuthCard"
import { PasswordResetForm } from "@/components/auth/PasswordResetForm"
import { Button } from "@/components/ui/button"

type ResetPasswordPageProps = {
    searchParams: Promise<{
        token?: string
        email?: string
    }>
}

export default async function ResetPasswordPage({
    searchParams,
}: ResetPasswordPageProps) {
    const params = await searchParams
    const token = typeof params.token === "string" ? params.token : ""
    const email = typeof params.email === "string" ? params.email : ""
    const hasValidParams = token.length > 0 && email.length > 0

    if (!hasValidParams) {
        return (
            <AuthCard
                eyebrow="Ошибка ссылки"
                title="Некорректная ссылка"
                icon={<TriangleAlert className="size-5" />}
                description="Ссылка для восстановления пароля повреждена или устарела. Запросите новое письмо для смены пароля."
                footer={
                    <Button asChild className="h-11 w-full !rounded-2xl">
                        <Link href="/forgot-password">Запросить новую ссылку</Link>
                    </Button>
                }
            >
                <div className="border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                    Обычно это происходит, когда токен уже использован, истёк или ссылка открыта не полностью.
                </div>
            </AuthCard>
        )
    }

    return <PasswordResetForm email={email} token={token} />
}
