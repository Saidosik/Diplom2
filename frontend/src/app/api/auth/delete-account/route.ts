import axios from 'axios';
import { NextResponse } from 'next/server';

import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/constants';
import { getAccessTokenCookie } from '@/lib/auth/cookies';
import createLaravelApi from '@/lib/http/laravel';

export async function DELETE() {
  const token = await getAccessTokenCookie();

  if (!token) {
    return NextResponse.json(
      { message: 'Не авторизован' },
      { status: 401 },
    );
  }

  try {
    const laravel = createLaravelApi(token);
    await laravel.delete('/me');

    const response = NextResponse.json({ message: 'Аккаунт удалён' });
    response.cookies.delete(ACCESS_TOKEN_COOKIE);

    return response;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        error.response?.data ?? { message: 'Не удалось удалить аккаунт' },
        { status: error.response?.status ?? 500 },
      );
    }

    return NextResponse.json(
      { message: 'Внутренняя ошибка сервера' },
      { status: 500 },
    );
  }
}
