import axios from "axios"
import { NextRequest, NextResponse } from "next/server"
import z from "zod"

import { forgotPasswordSchema } from "@/features/auth/schemas"
import createLaravelApi from "@/lib/http/laravel"

export async function POST(request: NextRequest) {
    const rawBody = await request.json().catch(() => null)

    const parsed = forgotPasswordSchema.safeParse(rawBody)

    if (!parsed.success) {
        return NextResponse.json(
            {
                message: "Ошибка валидации",
                errors: z.flattenError(parsed.error),
            },
            { status: 422 }
        )
    }

    try {
        const laravel = createLaravelApi()

        const response = await laravel.post("/forgot-password", {
            email: parsed.data.email,
        })

        return NextResponse.json(
            {
                message:
                    response.data?.message ??
                    "Ссылка для смены пароля отправлена вам на почту, проверьте ваш почтовый ящик",
            },
            { status: response.status }
        )
    } catch (error) {
        if (axios.isAxiosError(error)) {
            return NextResponse.json(
                {
                    message:
                        error.response?.data?.message ??
                        "Не удалось отправить письмо для восстановления пароля",
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