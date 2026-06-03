"use client"
import * as React from "react"
import { useForm } from "@tanstack/react-form"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
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
import { loginSchema } from "@/features/auth/schemas"
import { login } from "@/features/auth/api"
import { Eye, EyeOff, LoaderCircle } from "lucide-react"
import { safeRequest } from "@/lib/http/api-errors"
import Link from "next/link"
import { useRouter } from "next/navigation"
import AuthSocialButtons from "./AuthSocialButtons"
import { toast } from "sonner"

export function LoginForm() {
    const router = useRouter()
    const [error, setError] = React.useState("")
    const [showPassword, setShowPassword] = React.useState(false);
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
                    const message =
                        result.error?.message ?? "Неверная почта или пароль"

                    setError(message)
                    toast.error(message)

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
        // Получаем элементы формы
        const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement;
        const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement;

        // Если в DOM есть значения, которых нет в стейте формы, обновляем их
        if (emailInput?.value && form.state.values.email === "") {
            form.setFieldValue('email', emailInput.value);
        }
        if (passwordInput?.value && form.state.values.password === "") {
            form.setFieldValue('password', passwordInput.value);
        }
    }, [form]);

    return (


        <Card className="w-full sm:max-w-md">
            <CardHeader>
                <CardTitle><h1>Вход</h1></CardTitle>

            </CardHeader>
            <CardContent>
                <form
                    id="LoginForm"
                    onSubmit={async (e) => {
                        e.preventDefault()
                        await form.handleSubmit()
                    }}
                >
                    <FieldGroup>
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
                                        {isInvalid && (
                                            <FieldError errors={field.state.meta.errors} />
                                        )}
                                    </Field>
                                )
                            }}

                        </form.Field>

                        <form.Field
                            name="password">
                            {(field) => {
                                const isInvalid =
                                    field.state.meta.isTouched && !field.state.meta.isValid
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <div className="relative"> {/* Обертка для позиционирования */}
                                            <Input
                                                id={field.name}
                                                name={field.name}
                                                // Динамический тип: если showPassword true, то "text", иначе "password"
                                                type={showPassword ? "text" : "password"}
                                                value={field.state.value}
                                                onBlur={(e) => {
                                                    field.handleBlur();
                                                    field.handleChange(e.target.value);
                                                }}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                                placeholder="Пароль"
                                                className="pr-10" // Отступ справа, чтобы текст не наезжал на иконку
                                            />
                                            <button
                                                type="button"
                                                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4" /> // Иконки из lucide-react
                                                ) : (
                                                    <Eye className="h-4 w-4 " />
                                                )}
                                            </button>
                                        </div>
                                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                    </Field>
                                )
                            }}
                        </form.Field>
                    </FieldGroup>
                </form>
            </CardContent>
            <CardFooter>

                <Field orientation="vertical">
                    <Button type="submit" disabled={isSubmitting} form="LoginForm" className="mx-auto">
                        {
                            isSubmitting ? "Выполняется вход" : "Авторизоваться"
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
                    
                    <p>
                        Нет аккаунта? <Link href="?mode=register" className="text-primary">Зарегистрироваться</Link>
                    </p>
                    <Link href={'/forgot-password'} className="text-primary">Забыли пароль?</Link>
                    <AuthSocialButtons providers={['google', 'yandex']} />
                </Field>

            </CardFooter>

        </Card>



    )
}
