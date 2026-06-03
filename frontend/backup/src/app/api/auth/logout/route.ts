import axios from 'axios';
import { NextResponse } from 'next/server';

import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/constants';
import { getAccessTokenCookie } from '@/lib/auth/cookies';
import  createLaravelApi  from '@/lib/http/laravel';

export async function POST() {
  const token = await getAccessTokenCookie();

  try {
    if (token) {
      const laravel = createLaravelApi(token);
      await laravel.post('/logout');
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ACCESS_TOKEN_COOKIE);

  return response;
}