import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "./constants";

export async function getAccessTokenCookie() {
    const store = await cookies();
    return store.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

export function buildAccessTokenCookieOptions(maxAge?: number){
    return{
        httpOnly: true,
        sameSite: 'lax' as const,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge,
    }
} 