"use client"

import * as React from "react"
import Link from "next/link"
import { useForm } from "@tanstack/react-form"
import { KeyRound, LoaderCircle, MailCheck } from "lucide-react"

import { AuthCard } from "@/components/auth/AuthCard"
import AuthSocialButtons from "@/components/auth/AuthSocialButtons"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { forgotPasswordSchema } from "@/features/auth/schemas"
import { safeRequest } from "@/lib/http/api-errors"
import { browserApi } from "@/lib/http/browser"

export async function sendForgotPasswordEmail(emailReq: string) {
    const response = await browserApi.post("/auth/forgot-password", {
        email: emailReq,
    })
    return response.data
}

export function ForgotPasswordForm() {
    const [error, setError] = React.useState("")
    const [success, setSuccess] = React.useState("")
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const form = useForm({
        defaultValues: {
            email: "",
        },
        validators: {
            onSubmit: forgotPasswordSchema,
        },
        onSubmit: async ({ value }) => {
            setError("")
            setSuccess("")

            try {
                setIsSubmitting(true)
                const result = await safeRequest(sendForgotPasswordEmail(value.email))

                if (!result.success) {
                    setError(result.error?.message ?? "Не удалось отправить письмо для восстановления пароля")
                    return
                }

                setSuccess(result.data?.message ?? "Ссылка для смены пароля отправлена вам на почту")
            } catch (errorResponse) {
                console.log("[FORGOT_PASSWORD_ERROR]", errorResponse)
                setError("Произошла неизвестная ошибка")
            } finally {
                setIsSubmitting(false)
            }
        },
    })

    React.useEffect(() => {
        const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement | null

        if (emailInput?.value && form.state.values.email === "") {
            form.setFieldValue("email", emailInput.value)
        }
    }, [form])

    return (
        <>
            <AuthCard
                eyebrow="Сброс доступа"
                title="Восстановление пароля"
                icon={success ? <MailCheck className="size-5" /> : <KeyRound className="size-5" />}
                description="Укажите email аккаунта — отправим ссылку для безопасной смены пароля."
                footer={
                    <>
                        <Button
                            type="submit"
                            disabled={isSubmitting || Boolean(success)}
                            form="ForgotPasswordForm"
                            className="h-11 w-full !rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/90"
                        >
                            {isSubmitting ? "Отправляем" : success ? "Письмо отправлено" : "Отправить ссылку"}
                            {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}
                        </Button>

                        {error && (
                            <div className="border border-destructive/20 bg-destructive/10 p-3 text-center text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="border border-emerald-400/20 bg-emerald-500/10 p-3 text-center text-sm text-emerald-300">
                                {success}
                            </div>
                        )}

                        <AuthSocialButtons providers={["google", "yandex", "github"]} label="Войти быстрее" />
                    </>
                }
            >
                <form
                    id="ForgotPasswordForm"
                    className="space-y-5"
                    onSubmit={async (event) => {
                        event.preventDefault()
                        await form.handleSubmit()
                    }}
                >
                    <FieldGroup className="gap-4">
                        <form.Field name="email">
                            {(field) => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                                        <Input
                                            id={field.name}
                                            name={field.name}
                                            type="email"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(event) => field.handleChange(event.target.value)}
                                            aria-invalid={isInvalid}
                                            placeholder="you@example.com"
                                            autoComplete="email"
                                        />
                                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                    </Field>
                                )
                            }}
                        </form.Field>
                    </FieldGroup>
                </form>
            </AuthCard>

            <p className="mt-5 text-center text-sm text-slate-400">
                Вспомнили пароль?{" "}
                <Link href="/auth?mode=login" className="font-medium text-primary underline-offset-4 hover:underline">
                    Войти
                </Link>
            </p>
        </>
    )
}
