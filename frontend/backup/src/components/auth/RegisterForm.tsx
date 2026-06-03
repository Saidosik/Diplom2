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
import { registerSchema } from "@/features/auth/schemas"
import { register } from "@/features/auth/api"
import { Eye, EyeOff, LoaderCircle } from "lucide-react"
import { safeRequest } from "@/lib/http/api-errors"
import Link from "next/link"
import AuthSocialButtons from "./AuthSocialButtons"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function RegisterForm() {

    const [error, setError] = React.useState("")
    const router = useRouter()
    const [showPassword, setShowPassword] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    
    const form = useForm({
        defaultValues: {
            name: "",
            email: "",
            password: "",
            password_confirmation: "",
        },
        validators: {
            onSubmit: registerSchema,
        },
        onSubmit: async ({ value }) => {
            setError("")
            try {
                setIsSubmitting(true)
                const result = await safeRequest(register(value));
                if (!result.success) {
                    setError(result?.error?.message ?? "Ошибка регистрации")
                    return
                }
                toast.success('Успешная регистрация')
                router.push("/profile")
            } catch (errorResponse) {
                console.log("[ERROR]" + errorResponse)

            } finally {
                setIsSubmitting(false)
            }


        },
    })

    React.useEffect(() => {
        // Получаем элементы формы
        const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement;
        const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;

        const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement;
        const password_confirmationInput = document.querySelector('input[name="password_confirmation"]') as HTMLInputElement;
        // Если в DOM есть значения, которых нет в стейте формы, обновляем их
        if (emailInput?.value && form.state.values.email === "") {
            form.setFieldValue('email', emailInput.value);
        }
        if (passwordInput?.value && form.state.values.password === "") {
            form.setFieldValue('password', passwordInput.value);
        }
        if (nameInput?.value && form.state.values.name === "") {
            form.setFieldValue('name', nameInput.value);
        }
        if (password_confirmationInput?.value && form.state.values.password_confirmation === "") {
            form.setFieldValue('password_confirmation', password_confirmationInput.value);
        }
    }, [form]);

    return (


        <Card className="w-full sm:max-w-md">
            <CardHeader>
                <CardTitle><h1>Регистрация</h1></CardTitle>

            </CardHeader>
            <CardContent>
                <form
                    id="RegisterForm"
                    onSubmit={async (e) => {
                        e.preventDefault()
                        await form.handleSubmit()
                    }}
                >
                    <FieldGroup>
                        <form.Field
                            name="name">
                            {(field) => {
                                const isInvalid =
                                    field.state.meta.isTouched && !field.state.meta.isValid
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <Input
                                            id={field.name}
                                            name={field.name}
                                            value={field.state.value}
                                            onBlur={(e) => {
                                                field.handleBlur(); // Сообщаем, что с инпута ушли
                                                field.handleChange(e.target.value); // Принудительно обновляем состояние
                                            }}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            aria-invalid={isInvalid}
                                            placeholder="Имя"
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
                                            onBlur={(e) => {
                                                field.handleBlur(); // Сообщаем, что с инпута ушли
                                                field.handleChange(e.target.value); // Принудительно обновляем состояние
                                            }}
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
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                    </Field>
                                )
                            }}
                        </form.Field>
                        <form.Field
                            name="password_confirmation">
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
                                                placeholder="Повторите пароль"
                                                className="pr-10" // Отступ справа, чтобы текст не наезжал на иконку
                                            />

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
                    <Button type="submit" disabled={isSubmitting} form="RegisterForm" className="mx-auto">
                        Регистрация
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
                        Уже есть аккаунт? <Link href="?mode=login" className="text-primary">Войти</Link>
                    </p>

                    <AuthSocialButtons providers={['google', 'yandex']} />
                </Field>

            </CardFooter>

        </Card>


    )
}
