"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "@tanstack/react-form"
import { KeyRound, LoaderCircle } from "lucide-react"

import { AuthCard } from "@/components/auth/AuthCard"
import { PasswordField } from "@/components/auth/PasswordField"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { passwordResetSchema, type PasswordResetSchema } from "@/features/auth/schemas"
import { safeRequest } from "@/lib/http/api-errors"
import { browserApi } from "@/lib/http/browser"

type PasswordResetFormProps = {
    email: string
    token: string
}

async function resetPassword(payload: PasswordResetSchema) {
    const response = await browserApi.post("/auth/reset-password", payload)
    return response.data
}

export function PasswordResetForm({ email, token }: PasswordResetFormProps) {
    const router = useRouter()
    const [error, setError] = React.useState("")
    const [success, setSuccess] = React.useState("")
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const form = useForm({
        defaultValues: {
            email,
            token,
            password: "",
            password_confirmation: "",
        },
        validators: {
            onSubmit: passwordResetSchema,
        },
        onSubmit: async ({ value }) => {
            setError("")
            setSuccess("")

            try {
                setIsSubmitting(true)
                const result = await safeRequest(resetPassword(value))

                if (!result.success) {
                    setError(result.error?.message ?? "Не удалось изменить пароль")
                    return
                }

                setSuccess("Пароль успешно изменён. Сейчас перенаправим вас ко входу.")
                setTimeout(() => router.push("/auth?mode=login"), 1500)
            } catch (errorResponse) {
                console.log("[PASSWORD_RESET_ERROR]", errorResponse)
                setError("Произошла неизвестная ошибка")
            } finally {
                setIsSubmitting(false)
            }
        },
    })

    return (
        <>
            <AuthCard
                eyebrow="Новый пароль"
                title="Смена пароля"
                icon={<KeyRound className="size-5" />}
                description={
                    <>
                        Придумайте новый пароль для аккаунта{" "}
                        <span className="font-medium text-slate-200">{email}</span>.
                    </>
                }
                footer={
                    <>
                        <Button
                            type="submit"
                            form="PasswordResetForm"
                            disabled={isSubmitting || Boolean(success)}
                            className="h-11 w-full !rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/90"
                        >
                            {isSubmitting ? "Сохраняем пароль" : "Сменить пароль"}
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
                    </>
                }
            >
                <form
                    id="PasswordResetForm"
                    className="space-y-5"
                    onSubmit={async (event) => {
                        event.preventDefault()
                        await form.handleSubmit()
                    }}
                >
                    <input type="hidden" name="email" value={form.state.values.email} readOnly />
                    <input type="hidden" name="token" value={form.state.values.token} readOnly />

                    <FieldGroup className="gap-4">
                        <Field>
                            <FieldLabel>Email</FieldLabel>
                            <Input value={email} readOnly aria-readonly className="text-slate-400" />
                        </Field>

                        <form.Field name="password">
                            {(field) => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>Новый пароль</FieldLabel>
                                        <PasswordField
                                            id={field.name}
                                            name={field.name}
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(event) => field.handleChange(event.target.value)}
                                            aria-invalid={isInvalid}
                                            placeholder="Минимум 8 символов"
                                            autoComplete="new-password"
                                        />
                                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                    </Field>
                                )
                            }}
                        </form.Field>

                        <form.Field name="password_confirmation">
                            {(field) => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>Повторите пароль</FieldLabel>
                                        <PasswordField
                                            id={field.name}
                                            name={field.name}
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(event) => field.handleChange(event.target.value)}
                                            aria-invalid={isInvalid}
                                            placeholder="Ещё раз"
                                            autoComplete="new-password"
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
