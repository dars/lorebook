'use client';

import { useEffect } from 'react';

import { isSwMessage, usePwaStore } from '@/lib/state/pwa-store';

/**
 * 註冊 service worker，並把它的狀態接進 store。
 *
 * **kill switch 在這裡也做一次**，而且這一份才是主要的：SW 自己的自我註銷
 * 得等它能正常啟用才跑得到，但真正需要停用的時候，通常就是它已經壞掉的時候。
 * 頁面端的檢查不依賴 SW 是否健康。
 *
 * 註冊 URL 帶 build id：位元組不同瀏覽器才會視為新版本並重新安裝，
 * SW 內部也靠這個參數決定快取鍵。
 */
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev';

/**
 * **開發時預設不註冊。**
 *
 * SW 對 `/_next/static/*` 走 CacheFirst，而 dev 的 chunk 檔名是穩定的——
 * 結果就是改了程式碼、HTML 更新了，瀏覽器卻從快取拿到舊的 CSS/JS，畫面
 * 完全不動且毫無錯誤訊息。這個故障模式極難察覺（會誤判成「改動沒生效」）。
 *
 * 要在本機驗證離線行為時設 `NEXT_PUBLIC_SW_DEV=1`。
 */
const ENABLED_HERE =
  process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_SW_DEV === '1';

export function SwRegister() {
  const setOnline = usePwaStore((s) => s.setOnline);
  const setOffline = usePwaStore((s) => s.setOffline);
  const setUpdateReady = usePwaStore((s) => s.setUpdateReady);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const onMessage = (e: MessageEvent) => {
      if (!isSwMessage(e.data)) return;
      if (e.data.type === 'offline') setOffline(e.data.cachedAt);
      else setOnline();
    };
    navigator.serviceWorker.addEventListener('message', onMessage);

    let cancelled = false;

    void (async () => {
      // 先問能不能用。問不到（離線）就當作可以——否則第一次離線開啟就會
      // 把唯一能讓它離線可用的東西關掉。
      let enabled = ENABLED_HERE;
      if (enabled) {
        try {
          const r = await fetch('/api/sw-status', { cache: 'no-store' });
          if (r.ok) enabled = ((await r.json()) as { enabled: boolean }).enabled;
        } catch {
          // 維持 enabled = true
        }
      }
      if (cancelled) return;

      // 不啟用時**主動移除**既有註冊，不是單純跳過——開發者切回 dev 之後，
      // 上一次裝上的 SW 仍會繼續攔截並餵舊資產。
      if (!enabled) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          regs
            .filter((r) => (r.active?.scriptURL ?? '').includes('/sw.js'))
            .map((r) => r.unregister()),
        );
        const keys = await caches.keys();
        await Promise.all(
          keys.filter((k) => k.startsWith('lorebook-')).map((k) => caches.delete(k)),
        );
        return;
      }

      try {
        const reg = await navigator.serviceWorker.register(`/sw.js?v=${BUILD_ID}`);

        // 已經有一個在等著接手（上次沒點更新就關掉分頁的情況）。
        if (reg.waiting && navigator.serviceWorker.controller) setUpdateReady(true);

        reg.addEventListener('updatefound', () => {
          const next = reg.installing;
          if (!next) return;
          next.addEventListener('statechange', () => {
            // 有 controller 才代表這是「更新」而非首次安裝；
            // 首次安裝不該跳出「有新版本」。
            if (next.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateReady(true);
            }
          });
        });
      } catch {
        // 註冊失敗只是沒有離線能力，不該影響任何現有功能。
      }
    })();

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener('message', onMessage);
    };
  }, [setOnline, setOffline, setUpdateReady]);

  return null;
}

/** 供更新提示呼叫：讓等待中的 SW 接手，然後重載。 */
export async function applyUpdate() {
  const reg = await navigator.serviceWorker?.getRegistration();
  if (reg?.waiting) {
    // controllerchange 之後再重載，否則會載到舊的 controller 手上。
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => window.location.reload(),
      { once: true },
    );
    reg.waiting.postMessage({ type: 'skip-waiting' });
    return;
  }
  window.location.reload();
}
