import axios from 'axios';
import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import createLaravelApi from '@/lib/http/laravel';
import { getOAuthStateCookieName } from '@/lib/auth/constants';
import { buildSiteUrl } from '@/lib/site-url';

const allowedProviders = ['google', 'yandex', 'github'];

type Params = {
  params: Promise<{
    provider: string;
  }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  const { provider } = await params;

  if (!allowedProviders.includes(provider)) {
    return NextResponse.json(
      { message: 'Провайдер не поддерживается' },
      { status: 404 },
    );
  }

  try {
    const state = randomBytes(32).toString('hex');

    const laravel = createLaravelApi();

    const response = await laravel.get(`/oauth/${provider}/redirect-url`, {
      params: {
        state,
      },
    });

    const oauthUrl = response.data?.url;

    if (!oauthUrl) {
      return NextResponse.json(
        { message: 'Laravel не вернул OAuth URL' },
        { status: 500 },
      );
    }

    const result = NextResponse.redirect(oauthUrl);

    result.cookies.set(getOAuthStateCookieName(provider), state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 5,
    });

    return result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log('[oauth callback] status:', error.response?.status);
      console.log('[oauth callback] data:', error.response?.data);
    } else {
      console.log('[oauth callback] unknown error:', error);
    }

    return NextResponse.redirect(
      buildSiteUrl('/auth?error=oauth_redirect_failed'),
    );
  }
}