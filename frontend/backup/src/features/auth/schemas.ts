import z from "zod"

export const loginSchema = z.object({
    email: z.email({ error: "Введите корректную почту" }),
    password: z.string().min(8, "Минимум 8 символов"),
})

export const registerSchema = z
    .object({
        name: z.string().min(2, "Минимум 2 символа"),
        email: z.email({ error: "Введите корректную почту" }),
        password: z.string().min(8, "Минимум 8 символов"),
        password_confirmation: z.string().min(8, "Минимум 8 символов"),
    })
    .refine((data) => data.password === data.password_confirmation, {
        path: ["password_confirmation"],
        message: "Пароли не совпадают",
    })

export const forgotPasswordSchema = z.object({
    email: z.email({ error: "Введите корректную почту" }),
})

export const passwordResetSchema = z
    .object({
        email: z.email({ error: "Некорректная почта в ссылке восстановления" }),

        token: z
            .string()
            .min(1, "Токен восстановления отсутствует"),

        password: z
            .string()
            .min(8, "Пароль должен содержать минимум 8 символов")
            .max(255, "Пароль слишком длинный"),

        password_confirmation: z
            .string()
            .min(8, "Повторите пароль, минимум 8 символов")
            .max(255, "Пароль слишком длинный"),
    })
    .refine((data) => data.password === data.password_confirmation, {
        path: ["password_confirmation"],
        message: "Пароли не совпадают",
    })

export type LoginSchema = z.infer<typeof loginSchema>
export type RegisterSchema = z.infer<typeof registerSchema>
export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>
export type PasswordResetSchema = z.infer<typeof passwordResetSchema>