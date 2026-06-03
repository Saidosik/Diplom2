import Link from "next/link"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PasswordResetForm } from "@/components/auth/PasswordResetForm"

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
            <Card className="w-full sm:max-w-md">
                <CardHeader>
                    <CardTitle>Некорректная ссылка</CardTitle>
                    <CardDescription>
                        Ссылка для восстановления пароля повреждена или устарела.
                        Запросите новое письмо для смены пароля.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <Button asChild className="w-full">
                        <Link href="/forgot-password">
                            Запросить новую ссылку
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return <PasswordResetForm email={email} token={token} />
}
