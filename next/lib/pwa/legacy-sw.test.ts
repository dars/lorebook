import { describe, expect, it } from 'vitest';

import { CACHE_PREFIX, isLegacyCacheKey, isLegacyRegistration } from './legacy-sw';

describe('辨識遺留的 service worker', () => {
  it('認得 Flutter 的 SW', () => {
    expect(isLegacyRegistration('https://lorebook.pages.dev/flutter_service_worker.js')).toBe(true);
    expect(isLegacyRegistration('/flutter_service_worker.js?v=123')).toBe(true);
  });

  it('不動本應用自己的 SW', () => {
    // 這是整段邏輯存在的理由：兩者 scope 都是 '/'，只有 script URL 分得出來。
    expect(isLegacyRegistration('https://lorebook.pages.dev/sw.js')).toBe(false);
    expect(isLegacyRegistration('/sw.js')).toBe(false);
  });

  it('沒有 script URL 時視為不是遺留的', () => {
    expect(isLegacyRegistration(null)).toBe(false);
    expect(isLegacyRegistration(undefined)).toBe(false);
    expect(isLegacyRegistration('')).toBe(false);
  });
});

describe('辨識遺留的快取鍵', () => {
  it('認得 Flutter 的快取', () => {
    for (const k of ['flutter-app-manifest', 'flutter-temp-cache', 'flutter-app-cache']) {
      expect(isLegacyCacheKey(k), k).toBe(true);
    }
  });

  it('不動本應用的快取', () => {
    for (const k of [`${CACHE_PREFIX}static-v1`, `${CACHE_PREFIX}pages-v1`]) {
      expect(isLegacyCacheKey(k), k).toBe(false);
    }
  });

  it('不認識的鍵一律保留', () => {
    // 誤留別人的垃圾只是佔空間；誤刪自己的快取會讓離線功能整個失效。
    expect(isLegacyCacheKey('workbox-precache-v2')).toBe(false);
    expect(isLegacyCacheKey('')).toBe(false);
  });
});
