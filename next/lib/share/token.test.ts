import { describe, expect, it } from 'vitest';

import { generateShareToken, shareLinkFor } from './token';

describe('分享 token', () => {
  it('長度為 22 字元（128-bit base64url 去 padding）', () => {
    expect(generateShareToken()).toHaveLength(22);
  });

  it('只含 url-safe 字元，不需再編碼即可放進網址', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateShareToken()).toMatch(/^[A-Za-z0-9_-]{22}$/);
    }
  });

  it('不重複——可枚舉或可猜的 token 等於沒有保護', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) seen.add(generateShareToken());
    expect(seen.size).toBe(2000);
  });

  it('連結由前綴與 token 組成', () => {
    expect(shareLinkFor('https://lorebook.code4soul.dev', 'abc')).toBe(
      'https://lorebook.code4soul.dev/v/abc',
    );
  });
});
