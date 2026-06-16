import { NextResponse } from 'next/server';
import createLaravelApi from '@/lib/http/laravel';
import { getAccessTokenCookie } from '@/lib/auth/cookies';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store',
  Vary: 'Cookie, Authorization',
};

export async function GET() {
  const token = await getAccessTokenCookie();

  if (!token) {
    return NextResponse.json(
      { message: 'Не авторизован' },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const laravel = createLaravelApi(token);
    const response = await laravel.get('/me');
    return NextResponse.json({
      user: response.data?.data ?? response.data?.user ?? response.data,
    }, { headers: NO_STORE_HEADERS });
  } catch {
    const result = NextResponse.json(
      { message: 'Не авторизован' },
      { status: 401, headers: NO_STORE_HEADERS },
    );

    return result;
  }
}
