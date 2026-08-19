## Context

動機見 proposal。實作上有六項既有事實約束設計，其中前三項是 Next.js 重寫之後
才出現、Flutter 時期的設計未曾面對的：

- **目前全站沒有任何 service worker。** `components/legacy-sw-cleanup.tsx` 會
  `getRegistrations()` 後**全部**註銷並清空整個 Cache Storage，接著重載一次。
  任何新加的 SW 都會在下一次載入時被它殺掉
- **`/main/*` 全是 `force-dynamic`。** 每次分頁切換都是一次 RSC 請求；沒有網路
  就沒有畫面。這與 Flutter 版「app shell 已安裝、只差資料」的前提完全不同
- **Server Component 讀不到 IndexedDB。** 角色資料在伺服器端組進 RSC 輸出，
  瀏覽器端的儲存對它不可見。「把資料存進 IndexedDB」本身無法讓現有的頁面離線可用
- `app/main/layout.tsx` 以 `getSessionUser()` 判斷登入，失敗即
  `redirect('/login')`——離線時等同被登出
- `Character` **沒有 `updatedAt`**（只有 `JournalEntry` 有）；雲端的
  `updated_at` 由資料庫 trigger 維護，客戶端讀不到
- 既有的 `useCharacterSync` 已有 debounce 3 秒推送、`dirty` / `syncError` 狀態，
  以及 `visibilitychange` 時的 flush。離線狀態的呈現應接在這套之上，不另造一套

## Goals / Non-Goals

**Goals:**
- 離線時 `/main/*` 打得開，顯示最後一次同步的角色卡與內容庫
- 離線時不被誤判為登出
- 使用者清楚知道「這是離線的舊資料」以及它有多舊
- 離線時的編輯不會被誤以為已同步
- 共用裝置上登出即不留個人資料

**Non-Goals:**
- 離線寫入的持久化與補推（見 proposal 的 Non-Goals）
- 分享檢視頁的離線支援——即時活資料是該功能的刻意設計
- 完整的 PWA 離線優先架構（背景同步、periodic sync）

## Decisions

### D1：先收窄 `LegacySwCleanup`，這是所有其他工作的前置

改為只註銷 **scope 或 script URL 屬於 Flutter 版**的 registration
（`flutter_service_worker.js`），並且只清除 Flutter 建立的 cache key，不再
`caches.keys()` 全清。

沒有這一步，後面做什麼都沒用：新 SW 註冊完，下一次載入就被清掉，還會觸發那段
`window.location.reload()`。這不是「順手整理」，是硬性相依。

原本的全清是切換期的合理選擇（當時沒有自己的 SW，寧可錯殺），現在前提變了。

### D2：手寫 `public/sw.js`，不引入 `next-pwa` / Serwist

範圍很窄——一組快取策略、一個版本號、一個清除入口。手寫大約百來行，且完全掌握
它的行為。

**否決 `next-pwa`**：長期未跟上 App Router，且會接管 build 流程。
**否決 Serwist**：功能完整但引入 workbox 全家桶與 build 整合，為了目前這點範圍
不成比例，也與專案「不新增相依」的既有偏好衝突（見
`open-next.config.ts` 對 R2 增量快取的同類判斷）。

若日後要做背景同步與離線寫入，再評估換上 Serwist——那時複雜度才配得上它。

### D3：離線可讀靠「快取 RSC／document 回應」，而非把資料搬進 IndexedDB

這是本設計最關鍵的取捨。

兩條路：

**(A) SW 快取導覽與 RSC 回應，離線時供應最後一次成功的回應。**
資料已經烘焙在回應裡，不需要任何 client 端的重新組裝。既有的 Server Component
一行都不用改。

**(B) 把角色與內容庫存進 IndexedDB，並把頁面改成 client 渲染、離線時自 IndexedDB
取資料。**
資料層乾淨，但要把 `/main/*` 從 Server Component 改成 client 渲染，等於推翻
重寫時「伺服器取資料、client 編輯」的架構決定（design D12），而且會把剛修好的
首屏延遲重新變成 client 端的請求瀑布。

**選 (A)。** 唯讀情境下，「最後一次成功的整頁回應」正好就是我們要的語意——
它是一致的快照，不會出現「角色是新的、內容庫是舊的」這種混搭。(B) 的資料層優勢
只有在**離線可寫**時才真正兌現（那時需要以資料為單位合併），而可寫已列為
Non-Goals。等到要做可寫時再引入 IndexedDB，屆時 (A) 仍然是 shell 的基礎。

策略明細：

| 請求類型 | 策略 | 理由 |
|---|---|---|
| 靜態資產（`/_next/static/*`、圖片、字型） | CacheFirst | 內容雜湊命名，不會變 |
| 導覽（HTML document） | NetworkFirst，失敗回退快取 | 要新的，但沒有就給舊的 |
| RSC（`?_rsc=` 或 `RSC: 1`） | NetworkFirst，失敗回退快取 | 同上，分頁切換走這條 |
| Supabase / `/api/*` | 不快取 | 認證與即時性，快取只會製造假象 |
| `/v/:token`（分享檢視） | 不快取 | 即時活資料是刻意設計 |

### D4：離線的判定沿用「最近一次請求的成敗」，不用 `navigator.onLine`

`navigator.onLine` 只知道有沒有連上網路介面，不知道 Supabase 或我們的 origin
是否可達；在「連上了咖啡廳 wifi 但還沒過認證頁」這種常見情境會給出錯誤的樂觀
判斷。

由 SW 在回退快取時，於回應加上一個標頭（如 `X-Lorebook-Offline: 1`），client
據此顯示離線標示。這比在 client 端另外偵測更準——是同一個請求的實際結果。

### D5：離線時 auth 失敗不得導向登入頁

`getSessionUser()` 目前只回 `user | null`，呼叫端無從分辨「確定沒登入」與
「問不到」。改為能表達第三種狀態（例如回傳 `{ user, reachable }`）。

`app/main/layout.tsx` 的判斷改為：確定未登入才 redirect；無法確認時，交由 SW
回退的快取頁面呈現——那份快取本來就只在登入後才產生得出來。

這條與 D3 是互補的：D3 讓離線時有頁面可看，D5 確保不會在看到它之前就被踢走。

### D6：離線時的編輯必須被明確標示為「未同步」

本變更不做離線寫入，但**離線可讀會誘發離線編輯**——使用者看得到角色卡，自然會
去扣血。目前那些變更活在 zustand store，重整就沒了。

離線時 `SyncBadge` 的「未同步」不夠——它平時也會短暫出現。離線且 `dirty` 時
應升級為持續、明顯的警示，說明變更尚未存下且重整會遺失。

這是誠實揭露而非解決方案；真正的解法是後續的離線可寫切片。

### D7：登出清除個人快取，內容庫保留

登出時清除導覽與 RSC 的快取項目（那裡面有角色資料），內容庫與靜態資產保留——
SRD 是公開內容，不構成洩漏，留著能加速下次登入。

掛在 `lib/auth/actions.ts` 的 `signOut` 上，透過 `postMessage` 通知 SW 清除。

### D8：SW 版本與既有的 `UpdatePrompt` 協調，不各更新各的

`components/shell/update-prompt.tsx` 目前輪詢 `/api/version` 判斷有無新版。加入
SW 之後會有兩套更新機制：SW 的 `updatefound` 與這個輪詢。

以既有的 `UpdatePrompt` 為唯一的使用者介面：SW 偵測到新版時不自行接管，而是
通知 client，由 `UpdatePrompt` 顯示現有的「有新版本／立即更新」，按下才
`skipWaiting` 並重載。兩套並存只會出現「提示了但沒更新」或「沒提示就換了」。

## Risks / Trade-offs

- **快取的 HTML 含個人資料** → Cache Storage 是 per-origin per-profile，與
  cookie 同級；D7 在登出時清除。但使用者不登出就離開，快取仍在——這是瀏覽器
  profile 層級的固有問題，非本 change 能解，應在說明中誠實交代
- **離線看到的是舊資料** → 必須標示最後同步時間（D4）。沒有時間戳的「離線」
  提示會讓人不知道該不該相信眼前的數字
- **SW 是全站攔截器，寫錯會讓整站壞掉且難以救回** → 這正是 Flutter SW 造成的
  故障模式（`LegacySwCleanup` 的註解記了）。必須內建 kill switch：SW 每次啟動
  先檢查一個遠端旗標或版本，能自我註銷
- **快取 RSC 回應與 Next 的版本雜湊耦合** → 部署新版後舊的 RSC 快取可能與新的
  client bundle 不相容。以 build id 當 cache key 的一部分，換版即整批失效
- **`force-dynamic` 的回應帶 `no-store`** → SW 的 Cache API 可以無視回應標頭
  自行存放，但要確認不與 Next 的 router cache 打架
- **離線編輯遺失** → D6 揭露，但揭露不等於解決；若實測發現使用者仍大量在離線時
  編輯，應提高後續可寫切片的優先序

## Migration Plan

無資料庫 migration。分四階段，每階段可獨立驗證與回退：

1. **D1**：收窄 `LegacySwCleanup`（無新行為，但解除封鎖）
2. **D5**：auth 失敗與未登入分流（此時仍無 SW，離線仍打不開頁面，但不再誤跳登入）
3. **D2/D3**：SW 與快取策略。先只快取靜態資產驗證流程，再加導覽與 RSC
4. **D4/D6/D7/D8**：離線標示、未同步警示、登出清除、更新流程協調

回退：移除 SW 註冊並發布一版會自我註銷的 SW。**不能只是刪掉檔案**——已安裝在
使用者瀏覽器裡的 SW 不會因為伺服器上沒有這個檔案就消失。這條必須在上線前就
準備好。

## Open Questions

- SW 的 kill switch 用什麼載體？沿用 `/api/version` 多回一個欄位最省事，但那個
  端點本身也可能被快取
- 快取的導覽回應要不要設上限（例如只留最近 N 個角色頁）？目前角色數量不多，
  但沒有上限的快取長期會膨脹
- 離線標示放哪裡？`CharacterHeader` 最顯眼，但那裡已有 LEVEL 徽章與同步狀態，
  再加一項可能過載
- ~~內容庫頁（`/catalog/*`）的 HTML 高達 1.4 MB（法術），快取整頁 HTML 是否
  划算？~~ **已決議：整頁快取，不另做輕量路徑。** 實測法術頁 1,427,446 bytes
  ＋裝備頁 510,258 bytes ＝ 約 1.9 MB。Cache Storage 的配額是可用磁碟的數十
  百分比，1.9 MB 佔不到千分之一——為此另建一條渲染路徑（且要與 D3 的
  「不搬 IndexedDB」打架）完全不成比例。兩頁走與其他導覽相同的 NetworkFirst，
  只是歸在公開快取區、登出不清。
