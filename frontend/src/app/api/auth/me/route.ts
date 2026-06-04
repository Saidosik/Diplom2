import { NextResponse } from 'next/server';
import createLaravelApi from '@/lib/http/laravel';
import { getAccessTokenCookie } from '@/lib/auth/cookies';

export async function GET() {
  const token = await getAccessTokenCookie();

  if (!token) {
    return NextResponse.json(
      { message: 'Не авторизован' },
      { status: 401 },
    );
  }

  try {
    const laravel = createLaravelApi(token);
    const response = await laravel.get('/me');
    return NextResponse.json({
      user: response.data?.data ?? response.data?.user ?? response.data,
    });
  } catch {
    const result = NextResponse.json(
      { message: 'Не авторизован' },
      { status: 401 },
    );

    return result;
  }
}
