import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';
import createLaravelApi from '@/lib/http/laravel';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/constants';
import { buildAccessTokenCookieOptions } from '@/lib/auth/cookies';
import { registerSchema } from '@/features/auth/schemas';
import z from 'zod';

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
            privacy_policy_accepted: body.privacy_policy_accepted,
        });

        const token = registerResponse.data?.access_token ?? registerResponse.data?.token;
        const expiresIn = registerResponse.data?.expires_in;

        const result = NextResponse.json({
            ok: true,
            message: registerResponse.data?.message ?? 'Мы отправили письмо для подтверждения email',
            requires_email_verification: registerResponse.data?.requires_email_verification === true,
            email: registerResponse.data?.email ?? body.email,
        }, { status: registerResponse.status });

        if (token) {
            result.cookies.set(
                ACCESS_TOKEN_COOKIE,
                token,
                buildAccessTokenCookieOptions(expiresIn),
            );
        }

        return result;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status ?? 500;

            if (status === 422) {
                return NextResponse.json(
                    {
                        message: error.response?.data?.message ?? 'Ошибка валидации',
                        errors: error.response?.data?.errors ?? null,
                    },
                    { status: 422 },
                );
            }

            return NextResponse.json(
                {
                    message: status >= 500
                        ? 'Не удалось завершить регистрацию'
                        : error.response?.data?.message ?? 'Не удалось завершить регистрацию',
                    errors: null,
                },
                { status },
            );
        }

        return NextResponse.json(
            { message: 'Не удалось завершить регистрацию' },
            { status: 500 },
        );
    }
}
