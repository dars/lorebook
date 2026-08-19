## 1. 解除封鎖：收窄 LegacySwCleanup（無新行為，但其他階段全靠它）

- [x] 1.1 `components/legacy-sw-cleanup.tsx` 改為只註銷 script URL 屬於
      Flutter 版（`flutter_service_worker.js`）的 registration
- [x] 1.2 只刪除 Flutter 建立的 cache key，移除 `caches.keys()` 全清
- [x] 1.3 只在確實註銷了東西時才 `window.location.reload()`
- [x] 1.4 測試：只有本應用 SW 時不註銷、不重載；有 Flutter SW 時仍正確清理

## 2. 認證狀態分流（此階段仍無 SW，但先止血「離線被踢到登入頁」）

- [x] 2.1 `lib/supabase/server.ts` 的 `getSessionUser()` 改為能表達
      已登入／確定未登入／無法確認三種結果
- [x] 2.2 `app/main/layout.tsx` 僅在「確定未登入」時 redirect
- [x] 2.3 其餘受保護頁面（`character-select`、`library`、`character-create`、
      `character-level-up`）同步調整
- [x] 2.4 「無法確認」時的離線說明畫面
- [x] 2.5 測試：模擬 auth 請求失敗時不 redirect；確定無 session 時仍 redirect

## 3. Service worker 骨架（先只碰靜態資產，驗證流程與回退路徑）

- [x] 3.1 `next/public/sw.js`：install / activate / fetch 骨架，cache key 帶
      build id
- [x] 3.2 註冊元件，掛在 root layout
- [x] 3.3 **先做 kill switch**：SW 啟動時檢查停用旗標，開啟時自我註銷並清除快取
- [x] 3.4 靜態資產（`/_next/static/*`、圖片、字型）採 CacheFirst
- [x] 3.5 明確排除：Supabase 請求、`/api/*`、`/v/:token`
- [ ] 3.6 驗證：DevTools 離線後靜態資產仍可取得；開啟停用旗標後 SW 自我移除

## 4. 導覽與 RSC 的離線回退

- [x] 4.1 導覽（document）請求採 NetworkFirst，失敗回退快取
- [x] 4.2 RSC 請求（`?_rsc=` / `RSC: 1` 標頭）同策略
- [x] 4.3 回退時於回應加上離線標頭（如 `X-Lorebook-Offline: 1`）與同步時間
- [x] 4.4 未曾造訪過又離線時，回傳離線說明頁而非瀏覽器錯誤畫面
- [x] 4.5 換版時整批失效（cache key 含 build id）
- [ ] 4.6 驗證：連線時造訪角色頁 → 離線重整 → 內容仍在；離線切分頁仍可用

## 5. 離線狀態的呈現

- [x] 5.1 client 端讀取離線標頭，反映為全域的離線狀態
- [x] 5.2 角色情境各分頁持續顯示離線標示與最後同步時間（compact 與 expanded 皆可見）
- [x] 5.3 離線且 `dirty` 時，把 `SyncBadge` 的「未同步」升級為持續且明顯的警示，
      說明重整會遺失
- [x] 5.4 離線且無回退內容時的空狀態，與「確實沒有角色」的引導區分
- [x] 5.5 測試：離線標示的出現與消失；離線空狀態不顯示建立引導為主要出口

## 6. 登出清除

- [x] 6.1 SW 接受 `postMessage` 的清除指令，只刪導覽與 RSC 快取
- [x] 6.2 `lib/auth/actions.ts` 的 `signOut` 發出該指令
- [x] 6.3 內容庫與靜態資產不清除
- [ ] 6.4 驗證：登出後換帳號登入看不到前一帳號的角色；內容庫仍離線可用

## 7. 與既有更新流程協調

- [x] 7.1 SW 偵測到新版時不自行 `skipWaiting`，改為通知 client
- [x] 7.2 `components/shell/update-prompt.tsx` 接收該通知，沿用現有的提示 UI
- [x] 7.3 使用者確認後才 `skipWaiting` ＋ 重載
- [ ] 7.4 驗證：部署新版後只出現一次提示；未確認前不會自行換版

## 8. 內容庫離線

- [x] 8.1 確認 `/catalog/*` 的整頁快取是否可行（法術頁 HTML 約 1.4 MB，
      見 design Open Questions）；若不可行，改為只快取資料並走輕量渲染路徑
- [ ] 8.2 驗證：離線可查法術與裝備

## 9. 驗證與回退準備

- [x] 9.1 `npx tsc --noEmit`、`npx eslint .`、`npx vitest run` 全綠
- [x] 9.2 `npm run build` 通過
- [ ] 9.3 手動驗證全流程：連線造訪 → DevTools 離線 → 重整 → 角色與內容庫仍在
      → 扣血出現未同步警示 → 恢復連線 → 變更上雲、警示消失
- [ ] 9.4 手動驗證：離線時不被導向登入頁
- [x] 9.5 **回退路徑**：不另做一支「自我註銷版 SW」（兩套機制只會互相打架）。
      改為三層保險，全部已實作：
      (a) 環境變數 `SW_DISABLED=1` ＋ 重新部署 → `/api/sw-status` 回
          `enabled:false`；頁面端與 SW 各自註銷並清快取。`/api/` 永不被
          SW 攔截，所以這條路在 SW 壞掉時仍然通
      (b) `safely()` 包住所有策略——策略拋錯就直接連網路，最壞情況是失去
          離線能力而不是失去網站
      (c) SW 不自行 `skipWaiting`，壞版本不會自動接管既有分頁
- [ ] 9.6 **上線前**實際演練一次 (a)：設 `SW_DISABLED=1` 部署，確認開著的分頁
      會自行移除 SW
