> **🔓 已解凍（2026-08-11）**：Next.js 重寫已是現行實作，凍結條件解除。
> 本文與 design 已依 web-only／Next.js App Router 重寫；Flutter 時期的
> 版本見 git 歷史。
>
> **範圍同時收窄為「離線唯讀」**——原提案含離線可寫與重連補推，那需要待推送
> 佇列、雲端版本比對與衝突告知，是另一個量級。唯讀先解決主要痛點（在收訊差的
> 場地查角色卡），可寫列為後續切片，見 Non-Goals。

## Why

Next.js 重寫之後，離線體驗比 Flutter 時期**更差**：Flutter 版至少有 service
worker 快取 app shell，離線還開得起來（雖然是空殼）；現在
`LegacySwCleanup` 為了清掉 Flutter 遺留的 SW，會註銷**所有** registration 並
清空 Cache Storage，等於全站沒有任何離線能力。離線時連頁面都打不開。

更糟的是 App Router 的動態渲染放大了這件事。`/main/*` 全是
`force-dynamic`，每次導覽都是一次伺服器請求；離線時 `app/main/layout.tsx` 的
`getSessionUser()` 會失敗，而失敗會走到 `redirect('/login')`——使用者不只看不到
角色卡，還會被踢到登入頁，像是被登出了。

而 D&D 的實際使用場景——桌遊店、地下室、朋友家的死角——恰恰是收訊最差的地方，
也正是最需要角色卡的時候。已經照著 A2HS 引導把它裝到主畫面的使用者，會得到一個
點開就報錯的圖示。

## What Changes

- 新增自有的 service worker，快取 app shell、靜態資產，以及**已造訪過的角色頁與
  內容庫頁的回應**；離線時以最後一次成功的回應供應（stale-if-offline）
- `LegacySwCleanup` 由「註銷所有 SW」收窄為「只註銷 Flutter 遺留的那一個」——
  否則它會在每次載入時把我們自己的 SW 也殺掉（**這是實作順序上的硬性前置**）
- 離線時的 auth 失敗不再等同未登入：`getSessionUser()` 因網路不可達而失敗時，
  不得導向 `/login`
- 內容庫（法術、物品、職業特性、專長）完整快取。原始資料合計 < 1 MB，
  不做取捨也不需要使用者同意
- 離線時明確標示「目前離線，顯示的是最後同步的內容」，並標示最後同步時間
- 登出時清除個人資料的快取（角色頁回應），內容庫快取保留

## Capabilities

### New Capabilities
- `offline-cache`: service worker 的快取策略與生命週期、離線狀態的判定與呈現、
  登出時的快取清除範圍

### Modified Capabilities
- `data-layer`: 角色與內容庫的讀取由「每次請求都必須到達 Supabase」改為
  「網路優先、離線時回退至最後一次成功的回應」
- `auth`: 認證檢查失敗需區分「確定未登入」與「無法確認」，後者不得導向登入頁
- `app-shell`: 新增離線狀態的呈現；`LegacySwCleanup` 的職責收窄

## Impact

**資料層歸屬**：本變更只碰**角色卡資料**與**靜態內容庫**兩類。Campaign 共用
資料尚未實作，不在範圍內。

**程式碼**
- 新增 `next/public/sw.js`（手寫，不引入 `next-pwa` / Serwist——見 design D2）
- 新增註冊 SW 的元件，與 `components/shell/update-prompt.tsx` 的更新流程協調
- `components/legacy-sw-cleanup.tsx`：改為只註銷 Flutter 的 SW
- `lib/supabase/server.ts` 的 `getSessionUser()`：區分「無 session」與「請求失敗」
- `app/main/layout.tsx`：據上述區分決定是否 redirect
- `lib/auth/actions.ts` 的 `signOut`：加上清除個人快取

**版型**：桌機與行動版皆受影響（離線標示需在兩種版型都可見）。無新的資料表，
無 RLS 變更。

**不影響**
- 分享檢視頁（`/v/:token`）維持即時活資料，不快取——那是 `character-share` 的
  刻意設計
- 試玩模式（`/demo/*`）已是靜態預渲染，本來就離線可用

**相依**：不新增任何 npm 套件。

## Non-Goals（本次不做，留待後續切片）

- **離線可寫**：離線編輯的持久化、待推送佇列、重連補推、衝突告知。
  目前離線編輯仍活在記憶體的 zustand store，重整即失去——本變更**不改變**這點，
  但會在離線時明確警告使用者「此時的變更尚未同步」
- 雲端版本比對。衝突維持現行的最後寫入者覆蓋（LWW）
- 離線建立新角色、離線編輯 homebrew
- 即時協作
