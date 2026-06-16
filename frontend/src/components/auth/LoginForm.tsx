"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "@tanstack/react-form"
import { LoaderCircle } from "lucide-react"
import { toast } from "sonner"

import { AuthCard } from "@/components/auth/AuthCard"
import AuthSocialButtons from "@/components/auth/AuthSocialButtons"
import { PasswordField } from "@/components/auth/PasswordField"
import { Button } from "@/components/ui/button"
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { login } from "@/features/auth/api"
import { loginSchema } from "@/features/auth/schemas"
import { safeRequest } from "@/lib/http/api-errors"

export function LoginForm() {
    const router = useRouter()
    const [error, setError] = React.useState("")
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const form = useForm({
        defaultValues: {
            email: "",
            password: "",
        },
        validators: {
            onSubmit: loginSchema,
        },
        onSubmit: async ({ value }) => {
            setError("")

            try {
                setIsSubmitting(true)
                const result = await safeRequest(login(value))

                if (!result.success) {
                    const message = result.error?.message ?? "Неверная почта или пароль"

                    setError(message)
                    toast.error(message)

                    if (result.error?.code === "EMAIL_NOT_VERIFIED") {
                        router.push(`/verify-email?email=${encodeURIComponent(value.email)}`)
                        router.refresh()
                    }

                    return
                }

                if (result.data.requires_email_verification) {
                    toast.info(result.data.message ?? "Подтвердите email, чтобы продолжить")
                    router.push(`/verify-email?email=${encodeURIComponent(result.data.email ?? value.email)}`)
                    router.refresh()
                    return
                }

                toast.success("Успешный вход")
                router.push("/profile")
                router.refresh()
            } catch (errorResponse) {
                console.log("[LOGIN_ERROR]", errorResponse)
                const message = "Произошла неизвестная ошибка"
                setError(message)
                toast.error(message)
            } finally {
                setIsSubmitting(false)
            }
        },
    })

    React.useEffect(() => {
        const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement | null
        const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement | null

        if (emailInput?.value && form.state.values.email === "") {
            form.setFieldValue("email", emailInput.value)
        }
        if (passwordInput?.value && form.state.values.password === "") {
            form.setFieldValue("password", passwordInput.value)
        }
    }, [form])

    return (
        <>
            <AuthCard
                eyebrow="Авторизация"
                title="С возвращением"
                description="Войдите, чтобы продолжить работу с публикациями, чатами, AI-помощником и playground."
                footer={
                    <>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            form="LoginForm"
                            className="h-10 w-full !rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/90"
                        >
                            {isSubmitting ? "Выполняется вход" : "Войти в аккаунт"}
                            {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}
                        </Button>

                        {error && (
                            <div className="border border-destructive/20 bg-destructive/10 p-3 text-center text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        <AuthSocialButtons providers={["google", "yandex", "github"]} />
                    </>
                }
            >
                <form
                    id="LoginForm"
                    className="space-y-4"
                    onSubmit={async (event) => {
                        event.preventDefault()
                        await form.handleSubmit()
                    }}
                >
                    <FieldGroup className="gap-3">
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

                        <form.Field name="password">
                            {(field) => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                                return (
                                    <Field data-invalid={isInvalid}>
                                        <div className="flex items-center justify-between gap-3">
                                            <FieldLabel htmlFor={field.name}>Пароль</FieldLabel>
                                            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                                                Забыли пароль?
                                            </Link>
                                        </div>
                                        <PasswordField
                                            id={field.name}
                                            name={field.name}
                                            value={field.state.value}
                                            onBlur={(event) => {
                                                field.handleBlur()
                                                field.handleChange(event.target.value)
                                            }}
                                            onChange={(event) => field.handleChange(event.target.value)}
                                            aria-invalid={isInvalid}
                                            placeholder="Введите пароль"
                                            autoComplete="current-password"
                                        />
                                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                    </Field>
                                )
                            }}
                        </form.Field>
                    </FieldGroup>

                </form>
            </AuthCard>

            <p className="mt-4 text-center text-sm text-slate-400">
                Нет аккаунта?{" "}
                <Link href="?mode=register" className="font-medium text-primary underline-offset-4 hover:underline">
                    Зарегистрироваться
                </Link>
            </p>
        </>
    )
}
