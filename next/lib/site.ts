export const SITE_ORIGIN = 'https://lorebook.party';

/** 舊站已開啟的頁面仍可存檔；只轉址導覽，不轉送 API、OAuth code 或資產。 */
export function canonicalPageUrl(url: URL, method: string): URL | null {
  const alias = ['lorebook.code4soul.dev', 'www.lorebook.party'].includes(url.hostname);
  const insecurePrimary = url.hostname === 'lorebook.party' && url.protocol === 'http:';
  if (!alias && !insecurePrimary) return null;
  if (method !== 'GET' && method !== 'HEAD') return null;
  if (/^\/(?:api|auth|_next)(?:\/|$)/.test(url.pathname)) return null;
  if (/\.[^/]+$/.test(url.pathname)) return null;
  const target = new URL(SITE_ORIGIN);
  target.pathname = url.pathname;
  target.search = url.search;
  return target;
}
