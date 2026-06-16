"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "@tanstack/react-form"
import { LoaderCircle, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { AuthCard } from "@/components/auth/AuthCard"
import AuthSocialButtons from "@/components/auth/AuthSocialButtons"
import { PasswordField } from "@/components/auth/PasswordField"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { register } from "@/features/auth/api"
import { registerSchema } from "@/features/auth/schemas"
import { safeRequest } from "@/lib/http/api-errors"

export function RegisterForm() {
    const router = useRouter()
    const [error, setError] = React.useState("")
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const form = useForm({
        defaultValues: {
            name: "",
            email: "",
            password: "",
            password_confirmation: "",
            privacy_policy_accepted: false,
        },
        validators: {
            onSubmit: registerSchema,
        },
        onSubmit: async ({ value }) => {
            setError("")

            try {
                setIsSubmitting(true)
                const result = await safeRequest(register(value))

                if (!result.success) {
                    const message = result.error?.message ?? "Ошибка регистрации"
                    setError(message)
                    toast.error(message)
                    return
                }

                toast.success(result.data.message ?? "Мы отправили письмо для подтверждения email")
                router.push(`/verify-email?email=${encodeURIComponent(result.data.email ?? value.email)}`)
                router.refresh()
            } catch (errorResponse) {
                console.log("[REGISTER_ERROR]", errorResponse)
                const message = "Произошла неизвестная ошибка"
                setError(message)
                toast.error(message)
            } finally {
                setIsSubmitting(false)
            }
        },
    })

    React.useEffect(() => {
        const fields = ["name", "email", "password", "password_confirmation"] as const

        fields.forEach((name) => {
            const input = document.querySelector(`input[name="${name}"]`) as HTMLInputElement | null
            if (input?.value && form.state.values[name] === "") {
                form.setFieldValue(name, input.value)
            }
        })
    }, [form])

    return (
        <>
            <AuthCard
                eyebrow="Регистрация"
                title="Создайте аккаунт"
                icon={<Sparkles className="size-5" />}
                description="Присоединяйтесь к Вектору: публикуйте материалы, задавайте вопросы, запускайте код и используйте AI-помощника."
                footer={
                    <>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            form="RegisterForm"
                            className="h-11 w-full !rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/90"
                        >
                            {isSubmitting ? "Создаём аккаунт" : "Зарегистрироваться"}
                            {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}
                        </Button>

                        {error && (
                            <div className="border border-destructive/20 bg-destructive/10 p-3 text-center text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        <AuthSocialButtons providers={["google", "yandex", "github"]} label="Или через" />
                    </>
                }
            >
                <form
                    id="RegisterForm"
                    className="space-y-5"
                    onSubmit={async (event) => {
                        event.preventDefault()
                        await form.handleSubmit()
                    }}
                >
                    <FieldGroup className="gap-4">
                        <form.Field name="name">
                            {(field) => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>Имя</FieldLabel>
                                        <Input
                                            id={field.name}
                                            name={field.name}
                                            value={field.state.value}
                                            onBlur={(event) => {
                                                field.handleBlur()
                                                field.handleChange(event.target.value)
                                            }}
                                            onChange={(event) => field.handleChange(event.target.value)}
                                            aria-invalid={isInvalid}
                                            placeholder="Как к вам обращаться"
                                            autoComplete="name"
                                        />
                                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                    </Field>
                                )
                            }}
                        </form.Field>

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
                                            onBlur={(event) => {
                                                field.handleBlur()
                                                field.handleChange(event.target.value)
                                            }}
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

                        <div className="grid gap-4 sm:grid-cols-2">
                            <form.Field name="password">
                                {(field) => {
                                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                                    return (
                                        <Field data-invalid={isInvalid}>
                                            <FieldLabel htmlFor={field.name}>Пароль</FieldLabel>
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
                                                placeholder="8+ символов"
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
                                            <FieldLabel htmlFor={field.name}>Повторите</FieldLabel>
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
                                                placeholder="Ещё раз"
                                                autoComplete="new-password"
                                            />
                                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                        </Field>
                                    )
                                }}
                            </form.Field>
                        </div>

                        <form.Field name="privacy_policy_accepted">
                            {(field) => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                                return (
                                    <Field data-invalid={isInvalid}>
                                        <label
                                            htmlFor={field.name}
                                            className="flex cursor-pointer items-start gap-3 border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-slate-400 transition hover:border-primary/35 hover:bg-primary/5"
                                        >
                                            <Checkbox
                                                id={field.name}
                                                name={field.name}
                                                checked={field.state.value}
                                                onBlur={field.handleBlur}
                                                onCheckedChange={(checked) => field.handleChange(checked === true)}
                                                aria-invalid={isInvalid}
                                                className="mt-1"
                                            />
                                            <span>
                                                Я принимаю{" "}
                                                <Link href="/privacy" className="font-medium text-primary underline-offset-4 hover:underline">
                                                    политику конфиденциальности
                                                </Link>{" "}
                                                и понимаю, что после регистрации нужно подтвердить email.
                                            </span>
                                        </label>
                                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                    </Field>
                                )
                            }}
                        </form.Field>
                    </FieldGroup>

                    <FieldDescription className="text-center text-xs text-slate-500">
                        Пароль должен содержать минимум 8 символов.
                    </FieldDescription>
                </form>
            </AuthCard>

            <p className="mt-5 text-center text-sm text-slate-400">
                Уже есть аккаунт?{" "}
                <Link href="?mode=login" className="font-medium text-primary underline-offset-4 hover:underline">
                    Войти
                </Link>
            </p>
        </>
    )
}
