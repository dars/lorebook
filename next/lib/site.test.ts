import { describe, expect, it } from 'vitest';
import { canonicalPageUrl } from './site';

describe('正式網域轉址', () => {
  it('保留分享路徑與查詢參數', () => {
    expect(canonicalPageUrl(new URL('https://lorebook.code4soul.dev/v/abc?tab=story'), 'GET')?.href)
      .toBe('https://lorebook.party/v/abc?tab=story');
    expect(canonicalPageUrl(new URL('https://www.lorebook.party/login'), 'HEAD')?.href)
      .toBe('https://lorebook.party/login');
    expect(canonicalPageUrl(new URL('http://lorebook.party/login'), 'GET')?.href)
      .toBe('https://lorebook.party/login');
  });
  it('不干擾存檔、OAuth PKCE、service worker 與 API', () => {
    for (const path of ['/auth/callback?code=test', '/api/version', '/sw.js', '/_next/static/test.js']) {
      expect(canonicalPageUrl(new URL(`https://lorebook.code4soul.dev${path}`), 'GET')).toBeNull();
    }
    expect(canonicalPageUrl(new URL('https://lorebook.code4soul.dev/characters/a'), 'POST')).toBeNull();
  });
  it('不影響開發、備援與正式站', () => {
    for (const origin of ['http://localhost:8087', 'https://lorebook.devlin-865.workers.dev', 'https://lorebook.party']) {
      expect(canonicalPageUrl(new URL(origin), 'GET')).toBeNull();
    }
  });
});
