"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "@tanstack/react-form"
import * as z from "zod"
import { Eye, EyeOff, LoaderCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Field,
    FieldError,
    FieldGroup,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { browserApi } from "@/lib/http/browser"
import { safeRequest } from "@/lib/http/api-errors"
import { passwordResetSchema, PasswordResetSchema } from "@/features/auth/schemas"

type PasswordResetFormProps = {
    email: string
    token: string
}


async function resetPassword(payload: PasswordResetSchema) {
    const response = await browserApi.post("/auth/reset-password", payload)
    return response.data
}

export function PasswordResetForm({
    email,
    token,
}: PasswordResetFormProps) {
    const router = useRouter()

    const [error, setError] = React.useState("")
    const [success, setSuccess] = React.useState("")
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [showPassword, setShowPassword] = React.useState(false)
    const [showPasswordConfirmation, setShowPasswordConfirmation] =
        React.useState(false)

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
                    setError(
                        result.error?.message ??
                        "Не удалось изменить пароль"
                    )
                    return
                }

                setSuccess("Пароль успешно изменён. Теперь можно войти в аккаунт.")

                setTimeout(() => {
                    router.push("/auth?mode=login")
                }, 1500)
            } catch (errorResponse) {
                console.log("[PASSWORD_RESET_ERROR]", errorResponse)
                setError("Произошла неизвестная ошибка")
            } finally {
                setIsSubmitting(false)
            }
        },
    })

    return (
        <Card className="w-full sm:max-w-md">
            <CardHeader>
                <CardTitle>
                    <h1>Новый пароль</h1>
                </CardTitle>

                <CardDescription>
                    Придумайте новый пароль для аккаунта{" "}
                    <span className="font-medium text-foreground">
                        {email}
                    </span>
                    .
                </CardDescription>
            </CardHeader>

            <CardContent>
                <form
                    id="PasswordResetForm"
                    onSubmit={async (event) => {
                        event.preventDefault()
                        await form.handleSubmit()
                    }}
                >
                    <input
                        type="hidden"
                        name="email"
                        value={form.state.values.email}
                        readOnly
                    />

                    <input
                        type="hidden"
                        name="token"
                        value={form.state.values.token}
                        readOnly
                    />

                    <FieldGroup>
                        <form.Field name="password">
                            {(field) => {
                                const isInvalid =
                                    field.state.meta.isTouched &&
                                    !field.state.meta.isValid

                                return (
                                    <Field data-invalid={isInvalid}>
                                        <div className="relative">
                                            <Input
                                                id={field.name}
                                                name={field.name}
                                                type={
                                                    showPassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={(event) =>
                                                    field.handleChange(
                                                        event.target.value
                                                    )
                                                }
                                                aria-invalid={isInvalid}
                                                placeholder="Новый пароль"
                                                autoComplete="new-password"
                                                className="pr-10"
                                            />

                                            <button
                                                type="button"
                                                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                                                onClick={() =>
                                                    setShowPassword(
                                                        (value) => !value
                                                    )
                                                }
                                                aria-label={
                                                    showPassword
                                                        ? "Скрыть пароль"
                                                        : "Показать пароль"
                                                }
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>

                                        {isInvalid && (
                                            <FieldError
                                                errors={
                                                    field.state.meta.errors
                                                }
                                            />
                                        )}
                                    </Field>
                                )
                            }}
                        </form.Field>

                        <form.Field name="password_confirmation">
                            {(field) => {
                                const isInvalid =
                                    field.state.meta.isTouched &&
                                    !field.state.meta.isValid

                                return (
                                    <Field data-invalid={isInvalid}>
                                        <div className="relative">
                                            <Input
                                                id={field.name}
                                                name={field.name}
                                                type={
                                                    showPasswordConfirmation
                                                        ? "text"
                                                        : "password"
                                                }
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={(event) =>
                                                    field.handleChange(
                                                        event.target.value
                                                    )
                                                }
                                                aria-invalid={isInvalid}
                                                placeholder="Повторите пароль"
                                                autoComplete="new-password"
                                                className="pr-10"
                                            />

                                            <button
                                                type="button"
                                                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                                                onClick={() =>
                                                    setShowPasswordConfirmation(
                                                        (value) => !value
                                                    )
                                                }
                                                aria-label={
                                                    showPasswordConfirmation
                                                        ? "Скрыть пароль"
                                                        : "Показать пароль"
                                                }
                                            >
                                                {showPasswordConfirmation ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>

                                        {isInvalid && (
                                            <FieldError
                                                errors={
                                                    field.state.meta.errors
                                                }
                                            />
                                        )}
                                    </Field>
                                )
                            }}
                        </form.Field>
                    </FieldGroup>
                </form>
            </CardContent>

            <CardFooter>
                <Field orientation="vertical" className="w-full">
                    <Button
                        type="submit"
                        form="PasswordResetForm"
                        disabled={isSubmitting || Boolean(success)}
                        className="w-full"
                    >
                        {isSubmitting ? "Сохраняем пароль" : "Сменить пароль"}

                        {isSubmitting && (
                            <LoaderCircle className="animate-spin" />
                        )}
                    </Button>

                    {error && (
                        <div className="rounded-md bg-destructive/10 p-3 text-center text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="rounded-md bg-emerald-500/10 p-3 text-center text-sm text-emerald-600 dark:text-emerald-400">
                            {success}
                        </div>
                    )}

                    <p className="text-center text-sm text-muted-foreground">
                        Вспомнили пароль?{" "}
                        <Link href="/auth?mode=login" className="text-primary">
                            Войти
                        </Link>
                    </p>
                </Field>
            </CardFooter>
        </Card>
    )
}