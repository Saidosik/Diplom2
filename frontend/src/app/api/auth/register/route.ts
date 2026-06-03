import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';
import createLaravelApi from '@/lib/http/laravel';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/constants';
import { buildAccessTokenCookieOptions } from '@/lib/auth/cookies';
import { registerSchema } from '@/features/auth/schemas';
import z from 'zod';
import { redirect } from 'next/navigation';

export async function POST(request: NextRequest) {
    const rawBody = await request.json().catch(() => null);

    const parsed = registerSchema.safeParse(rawBody);

    if (!parsed.success) {
        return NextResponse.json(
            {
                message: 'Ошибка валидации',
                errors: z.flattenError(parsed.error),
            },
            { status: 422 }
        );
    }

    const body = parsed.data;

    try {
        const laravel = createLaravelApi();

        const registerResponse = await laravel.post('/register', {
            name: body.name,
            email: body.email,
            password: body.password,
            password_confirmation: body.password_confirmation,
        });

        let token =
            registerResponse.data?.access_token ?? registerResponse.data?.token;
        let expiresIn = registerResponse.data?.expires_in;

        if (!token) {
            const loginResponse = await laravel.post('/login', {
                email: body.email,
                password: body.password,
            });

            token =
                loginResponse.data?.access_token ?? loginResponse.data?.token;
            expiresIn = loginResponse.data?.expires_in;
        }

        if (!token) {
            return NextResponse.json(
                { message: 'Не удалось получить токен после регистрации' },
                { status: 500 },
            );
        }

        const result = NextResponse.json({ ok: true });

        result.cookies.set(
            ACCESS_TOKEN_COOKIE,
            token,
            buildAccessTokenCookieOptions(expiresIn),
        );


        return result;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            return NextResponse.json(
                {
                    message:
                        error.response?.data?.message ??
                        'Не удалось выполнить регистрацию',
                    errors: error.response?.data?.errors ?? null,
                },
                { status: error.response?.status ?? 500 },
            );
        }

        return NextResponse.json(
            { message: 'Внутренняя ошибка сервера' },
            { status: 500 },
        );
    }
}