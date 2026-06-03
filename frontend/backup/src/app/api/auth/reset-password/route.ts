import { passwordResetSchema } from "@/features/auth/schemas"
import createLaravelApi from "@/lib/http/laravel"
import axios from "axios"
import { NextRequest, NextResponse } from "next/server"
import z from "zod"

export async function POST(request: NextRequest) {
    const rawBody = await request.json().catch(() => null)

    const parsed = passwordResetSchema.safeParse(rawBody)

    if (!parsed.success) {
        return NextResponse.json(
            {
                message: "Ошибка валидации",
                errors: z.flattenError(parsed.error),
            },
            { status: 422 }
        )
    }

    const body = parsed.data

    try {
        const laravel = createLaravelApi()

        const response = await laravel.post("/reset-password", {
            email: body.email,
            token: body.token,
            password: body.password,
            password_confirmation: body.password_confirmation,
        })

        return NextResponse.json(
            {
                message:
                    response.data?.message ??
                    "Пароль успешно изменён",
            },
            { status: response.status }
        )
    } catch (error) {
        if (axios.isAxiosError(error)) {
            return NextResponse.json(
                {
                    message:
                        error.response?.data?.message ??
                        "Не удалось изменить пароль",
                    errors: error.response?.data?.errors ?? null,
                },
                { status: error.response?.status ?? 500 }
            )
        }

        return NextResponse.json(
            { message: "Внутренняя ошибка сервера" },
            { status: 500 }
        )
    }
}