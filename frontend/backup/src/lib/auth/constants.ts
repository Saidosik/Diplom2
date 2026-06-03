export const ACCESS_TOKEN_COOKIE = 'access_token';

export function getOAuthStateCookieName(provider: string) {
  return `oauth_state_${provider}`;
}