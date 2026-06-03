"use client"
import * as React from "react"
import { useForm } from "@tanstack/react-form"

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
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { forgotPasswordSchema } from "@/features/auth/schemas"
import AuthSocialButtons from "./AuthSocialButtons"
import { LoaderCircle } from "lucide-react"
import { safeRequest } from "@/lib/http/api-errors"
import { browserApi } from "@/lib/http/browser"

export async function sendForgotPasswordEmail(emailReq: string) {
    const response = await browserApi.post('/auth/forgot-password', {
        email: emailReq
    })
    return response.data
}

export function ForgotPasswordForm() {
    const [error, setError] = React.useState("")
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [success, setSuccess] = React.useState("")
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
                    setError(
                        result.error?.message ??
                        "Не удалось отправить письмо для восстановления пароля"
                    )
                    return
                }

                setSuccess(
                    result.data?.message ??
                    "Ссылка для смены пароля отправлена вам на почту"
                )
            } catch (errorResponse) {
                console.log("[FORGOT_PASSWORD_ERROR]", errorResponse)
                setError("Произошла неизвестная ошибка")
            } finally {
                setIsSubmitting(false)
            }
        },
    })

    React.useEffect(() => {
        // Получаем элементы формы
        const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement;

        // Если в DOM есть значения, которых нет в стейте формы, обновляем их
        if (emailInput?.value && form.state.values.email === "") {
            form.setFieldValue('email', emailInput.value);
        }
    }, [form]);

    return (


        <Card className="w-full sm:max-w-md ">
            <CardHeader>
                <CardTitle><h1>Сброс Пароля</h1></CardTitle>
                <CardDescription className="w-100">Мы вышлем вам на почту письмо, перейдя по ссылке вы сможете сбросить пароль или войдите используя сторонние сервисы</CardDescription>
            </CardHeader>
            <CardContent>
                <form
                    id="ForgotPasswordForm"
                    onSubmit={async (e) => {
                        e.preventDefault()
                        await form.handleSubmit()
                    }}
                >


                    <form.Field
                        name="email">
                        {(field) => {
                            const isInvalid =
                                field.state.meta.isTouched && !field.state.meta.isValid
                            return (
                                <Field data-invalid={isInvalid}>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                        aria-invalid={isInvalid}
                                        placeholder="почта@yandex.ru"
                                        autoComplete="on"
                                    />
                                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                </Field>
                            )
                        }}

                    </form.Field>
                </form>
            </CardContent>
            <CardFooter>

                <Field orientation="vertical">
                    <Button type="submit" disabled={isSubmitting} form="ForgotPasswordForm" className="mx-auto">
                        {
                            isSubmitting ? "Отправка" : "отправить"
                        }
                        {
                            isSubmitting ? <LoaderCircle className="animate-spin" /> : ''
                        }
                    </Button>
                    {error && (
                        <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm text-center">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-4 rounded-md bg-emerald-500/10 p-3 text-center text-sm text-emerald-600 dark:text-emerald-400 ">
                            {success}
                        </div>
                    )}

                    <AuthSocialButtons providers={['google', 'yandex']} />
                </Field>

            </CardFooter>

        </Card>



    )
}
