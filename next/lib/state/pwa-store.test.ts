import { describe, expect, it } from 'vitest';

import { isSwMessage } from './pwa-store';

describe('辨識 service worker 訊息', () => {
  it('認得自己的訊息', () => {
    expect(isSwMessage({ source: 'lorebook-sw', type: 'online' })).toBe(true);
    expect(isSwMessage({ source: 'lorebook-sw', type: 'offline', cachedAt: null })).toBe(true);
  });

  it('忽略別人的訊息', () => {
    // 頁面上可能有其他來源的 postMessage（擴充套件、嵌入的 iframe），
    // 沒有這道過濾就會被無關的訊息切成離線狀態。
    expect(isSwMessage({ type: 'online' })).toBe(false);
    expect(isSwMessage({ source: 'other-sw', type: 'offline' })).toBe(false);
    expect(isSwMessage('offline')).toBe(false);
    expect(isSwMessage(null)).toBe(false);
    expect(isSwMessage(undefined)).toBe(false);
  });
});
