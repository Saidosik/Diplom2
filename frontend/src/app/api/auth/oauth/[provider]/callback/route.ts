import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';

import { ACCESS_TOKEN_COOKIE, getOAuthStateCookieName } from '@/lib/auth/constants';
import { buildAccessTokenCookieOptions } from '@/lib/auth/cookies';
import createLaravelApi from '@/lib/http/laravel';

const allowedProviders = ['google', 'yandex'];

type Params = {
  params: Promise<{
    provider: string;
  }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  const { provider } = await params;

  if (!allowedProviders.includes(provider)) {
    return NextResponse.redirect(
      new URL('/auth?error=provider_not_supported', request.url),
    );
  }

  const stateFromQuery = request.nextUrl.searchParams.get('state');
  const stateCookieName = getOAuthStateCookieName(provider);
  const stateFromCookie = request.cookies.get(stateCookieName)?.value;

  if (!stateFromQuery || !stateFromCookie || stateFromQuery !== stateFromCookie) {
    const result = NextResponse.redirect(
      new URL('/auth?error=oauth_state_invalid', request.url),
    );

    result.cookies.delete(stateCookieName);

    return result;
  }

  const search = request.nextUrl.searchParams.toString();

  try {
    const laravel = createLaravelApi();

    const response = await laravel.get(`/oauth/${provider}/callback?${search}`);

    const token = response.data?.token ?? response.data?.access_token;
    const expiresIn = response.data?.expires_in;

    if (!token) {
      const result = NextResponse.redirect(
        new URL('/auth?error=token_missing', request.url),
      );

      result.cookies.delete(stateCookieName);

      return result;
    }
    const result = NextResponse.redirect(
      new URL(`/profile?oauth=success&provider=${provider}`, request.url)
    )

    result.cookies.set(
      ACCESS_TOKEN_COOKIE,
      token,
      buildAccessTokenCookieOptions(expiresIn),
    );

    result.cookies.delete(stateCookieName);

    return result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log('[oauth callback] status:', error.response?.status);
      console.log('[oauth callback] data:', error.response?.data);
    }

    const result = NextResponse.redirect(
      new URL(
        `/auth?mode=login&oauth=error&provider=${provider}&message=Не удалось войти через сервис`,
        request.url
      )
    );

    result.cookies.delete(stateCookieName);

    return result;
  }
}