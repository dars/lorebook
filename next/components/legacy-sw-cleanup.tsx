'use client';

import { useEffect } from 'react';

/**
 * 註銷 Flutter 版留下的 service worker。**切換期暫時性程式碼。**
 *
 * Flutter 的 SW 註冊於 scope `/`，會攔截同網域的所有請求並以快取的舊資產
 * 回應——切換部署後，既有使用者看到的會是「網站完全沒變」，而且不會有任何
 * 錯誤訊息可循。這是最容易誤判為「部署失敗」的故障模式。
 *
 * 一併清掉 Cache Storage：SW 註銷後快取不會自動消失，留著只是佔空間。
 *
 * 退場條件見 tasks 8.1——觀察期無舊畫面回報後移除本元件。
 */
export function LegacySwCleanup() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .getRegistrations()
      .then(async (regs) => {
        if (regs.length === 0) return;
        await Promise.all(regs.map((r) => r.unregister()));

        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }

        // 註銷不影響已載入的頁面（本頁的資產早已取得），但下一次瀏覽才會
        // 拿到新版。重載一次讓使用者立刻看到新站，而不是下次才發現。
        // sessionStorage 旗標防止重載迴圈——若註銷因故未生效，重載後又會
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
