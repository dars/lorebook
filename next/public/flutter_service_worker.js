/*
 * Flutter 版遺留 service worker 的**墓碑**。切換期暫時性檔案。
 *
 * ── 為什麼需要這個檔案 ──────────────────────────────────
 *
 * 切換到 Workers 之後，既有使用者瀏覽器裡仍註冊著 Flutter 的 SW（scope `/`）。
 * `components/legacy-sw-cleanup.tsx` 會呼叫 `unregister()`，但依規範那只是把
 * registration 標記為待移除，**要等所有受它控制的分頁關閉才真正生效**；
 * `location.reload()` 不算關閉。實測結果是 registration 頑固存在、
 * Next 自己的 SW 因同 scope 被佔而註冊不上，離線功能永遠不會生效。
 *
 * 從頁面端無法解決這個問題——只能從 SW 內部。瀏覽器在 navigation 時會檢查
 * 受控 SW 的腳本更新，抓的就是這個路徑；讓它抓到一支會自我註銷的腳本，
 * 舊 SW 就會在 activate 時把自己拆掉。`legacy-sw-cleanup.tsx` 另外主動呼叫
 * `registration.update()` 觸發這次檢查，不必等瀏覽器的 24 小時週期。
 *
 * **這個檔案不會被任何新程式碼註冊**——只有舊 registration 的更新檢查會抓它。
 * 對新使用者是一個沒人執行的靜態檔案。
 *
 * 退場條件同 legacy-sw-cleanup.tsx：觀察期無舊畫面回報後連同該元件一起移除。
 */

// 立刻取代舊的 Flutter SW，不等現有分頁關閉。
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 從 SW 內部註銷自己——這條路徑不受「等待受控 client 關閉」的限制。
      await self.registration.unregister();

      // 順手清掉 Flutter 的快取。只認 `flutter-` 前綴，與
      // lib/pwa/legacy-sw.ts 的 isLegacyCacheKey same rule——不認識的一律保留，
      // 免得把 `lorebook-` 開頭的自家快取也清了。
      if ('caches' in self) {
        const keys = await caches.keys();
        await Promise.all(
          keys.filter((k) => k.startsWith('flutter-')).map((k) => caches.delete(k)),
        );
      }

      // 註銷後現有分頁仍由這支（已死的）SW 控制到下次導覽為止，
      // 主動導一次讓使用者立刻拿到乾淨的頁面並讓 Next 的 SW 得以註冊。
      const windows = await self.clients.matchAll({ type: 'window' });
      for (const c of windows) {
        try {
          await c.navigate(c.url);
        } catch {
          // 跨來源或已關閉的 client 會拋——不影響註銷本身。
        }
      }
    })(),
  );
});

// **刻意不註冊 fetch handler**：沒有 handler 的 SW 完全不介入網路請求，
// install 與 activate 之間的請求會直接走網路，不會拿到任何快取內容。
