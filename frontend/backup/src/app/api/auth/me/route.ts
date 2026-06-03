import axios from 'axios';
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
    console.log("response")
    return NextResponse.json({
      user: response.data?.data ?? response.data?.user ?? response.data,
    });
  } catch (error) {
    const result = NextResponse.json(
      { message: 'Не авторизован' },
      { status: 401 },
    );

    // result.cookies.delete(ACCESS_TOKEN_COOKIE);

    if (axios.isAxiosError(error)) {
      console.log('[api/auth/me] status:', error.response?.status);
      console.log('[api/auth/me] data:', error.response?.data);
    }

    return result;
  }
}