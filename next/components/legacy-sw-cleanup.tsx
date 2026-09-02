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

        // **不能無條件 unregister。**
        //
        // 切換上線後實測到的真實狀態是「一個 registration，兩個 worker」：
        //
        //     active:  flutter_service_worker.js   ← Flutter 的舊實例
        //     waiting: sw.js?v=<build>             ← 我們的 SW，已安裝在排隊
        //
        // 我們的 SW 註冊時就把 registration 的 script URL 換成了 `/sw.js`，
        // 但它依 sw.js 檔頭第 4 點不自行 skipWaiting，於是排隊等 active 讓位；
        // 而 active 是 Flutter 的實例，只有在所有受控分頁關閉後才會讓位。
        // 結果是永久卡住：離線功能不生效，且沒有任何錯誤訊息。
        //
        // 此時呼叫 `unregister()` 會連 waiting 裡的自家 SW 一起殺掉——正是本檔
        // 開頭警告過的誤殺，只是換了一個更隱蔽的形態。所以要分兩種情況：
        for (const r of legacy) {
          const waiting = r.waiting;
          if (waiting && !isLegacyRegistration(waiting.scriptURL)) {
            // 自家 SW 已在排隊：讓它接管就好，registration 本身要留著。
            // 這裡不必顧慮 sw.js 第 4 點「跑團中途自動重載」的風險——
            // 那條顧慮的前提是 active 為我們自己的舊版本，而這裡的 active
            // 是一個已經沒有快取、只會空轉的死 SW。
            waiting.postMessage({ type: 'skip-waiting' });
          } else {
            // 純粹的舊 registration，沒有自家 SW 在排隊：直接註銷。
            // 註銷要等所有受控分頁關閉才真正生效，`public/flutter_service_worker.js`
            // 的墓碑是這條路徑的補強（從 SW 內部註銷不受該限制）。
            await r.unregister();
          }
        }

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
