export const getSiteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? 'http://localhost:3000';

export const buildSiteUrl = (path: string) => new URL(path, getSiteUrl());
