import { NextResponse } from 'next/server';
import createLaravelApi from '@/lib/http/laravel';
import { getAccessTokenCookie } from '@/lib/auth/cookies';
import axios from 'axios';

export async function POST() {
  const token = await getAccessTokenCookie();

  if (!token) {
    return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
  }

  try {
    const laravel = createLaravelApi(token);
    const response = await laravel.post('/email/verification-notification');
    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        {
          message: error.response?.data?.message ?? 'Не удалось отправить письмо повторно',
          code: error.response?.data?.code,
        },
        {
          status: error.response?.status ?? 500,
          headers: error.response?.headers?.['retry-after']
            ? { 'Retry-After': String(error.response.headers['retry-after']) }
            : undefined,
        },
      );
    }

    return NextResponse.json({ message: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
