'use client';

import { useEffect } from 'react';

import { isLegacyCacheKey, isLegacyRegistration } from '@/lib/pwa/legacy-sw';

/**
 * 註銷 Flutter 版留下的 service worker。**切換期暫時性程式碼。**
 *
 * Flutter 的 SW 註冊於 scope `/`，會攔截同網域的所有請求並以快取的舊資產
 * 回應——切換部署後，既有使用者看到的會是「網站完全沒變」，而且不會有任何
 * 錯誤訊息可循。這是最容易誤判為「部署失敗」的故障模式。
 *
 * **只清 Flutter 的那一個。** 原本是 `getRegistrations()` 全部註銷 ＋
 * `caches.keys()` 全部刪除，那在「本站沒有自己的 SW」的前提下是合理的保守做法；
 * 加入 `public/sw.js` 之後前提不成立了——全清會在每次載入時把自己的 SW 也殺掉，
 * 離線功能永遠不會生效，而且同樣沒有任何錯誤訊息。判斷邏輯與測試在
 * `lib/pwa/legacy-sw.ts`。
 *
 * 退場條件見 tasks 8.1——觀察期無舊畫面回報後移除本元件。
 */
export function LegacySwCleanup() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .getRegistrations()
      .then(async (regs) => {
        const legacy = regs.filter((r) =>
          isLegacyRegistration(r.active?.scriptURL ?? r.installing?.scriptURL),
        );
        if (legacy.length === 0) return;

        await Promise.all(legacy.map((r) => r.unregister()));

        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(
            keys.filter(isLegacyCacheKey).map((k) => caches.delete(k)),
          );
        }

        // 註銷不影響已載入的頁面（本頁的資產早已取得），但下一次瀏覽才會
        // 拿到新版。重載一次讓使用者立刻看到新站，而不是下次才發現。
        // 只在確實註銷了東西時才重載——否則每次載入都重整一輪。
        // sessionStorage 旗標防止重載迴圈：若註銷因故未生效，重載後又會
        // 進到這裡，沒有旗標就會無限重整。
        if (!sessionStorage.getItem('legacy-sw-cleared')) {
          sessionStorage.setItem('legacy-sw-cleared', '1');
          window.location.reload();
        }
      })
      .catch(() => {
        // 清理失敗不該影響任何功能——最壞情況是使用者多重整幾次。
      });
  }, []);

  return null;
}
